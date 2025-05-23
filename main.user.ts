import { DataModelName, KeyboardShortcut, SegmentPermission, WmeSDK } from "wme-sdk-typings";

// the sdk initScript function will be called after the SDK is initialized
unsafeWindow.SDK_INITIALIZED.then(initScript);

interface PreferenceObject {
  [key: string]: any
}
interface MeterObject {
  [key: string]: number
}
function initScript() {
  // initialize the sdk, these should remain here at the top of the script
  if (!unsafeWindow.getWmeSdk) {
    // This block is required for type checking, but it is guaranteed that the function exists.
    throw new Error("SDK not available");
  }
  const wmeSDK: WmeSDK = unsafeWindow.getWmeSdk(
    {
      scriptId: "svl-sdk",
      scriptName: "Street Vector Layer"
    }
  )

  console.debug(`SDK v. ${wmeSDK.getSDKVersion()} on ${wmeSDK.getWMEVersion()} initialized`)

  /** @type {string} */
  const SVL_VERSION: string = GM_info.script.version;
  /** @type {boolean} */
  const DEBUG: boolean = unsafeWindow.localStorage.getItem('svlDebugOn') === 'true';
  /** @type {Function} */
  const consoleDebug: Function = DEBUG
    ? (...args) => {
      for (let i = 0; i < args.length; i += 1) {
        if (typeof args[i] === 'string') {
          console.log(`[SVL] ${SVL_VERSION}: ${args[i]}`);
        } else {
          console.dir(args[i]);
        }
      }
    }
    : () => { };

  /** @type {Function} */
  const consoleGroup: Function = DEBUG ? console.group : () => { };
  /** @type {Function} */
  const consoleGroupEnd: Function = DEBUG ? console.groupEnd : () => { };

  const assertFeatureDoesNotExist: Function = DEBUG
    ? (id: number, layer: OpenLayers.Layer.Vector) => {
      if (layer.getFeaturesByAttribute("sID", id).length > 0) {
        console.error(`[SVL] Performance. Feature with id ${id} already exists in layer ${layer.name}`);
        console.dir(wmeSDK.Events);
        console.trace();
        throw new Error(`Feature with id ${id} already exists in layer ${layer.name}`);
        //alert(`ERROR! Feature with id ${id} already exists in layer ${layer.name}`);
      }
    }
    : () => { };

  /** @type{number} */
  const MAX_SEGMENTS: number = 3000;
  /** @type{number} */
  const MAX_NODES: number = 4000;

  /** @type{boolean} */
  let onlineTranslations: boolean = false;

  let autoLoadInterval: (number | null) = null;

  let clutterConstant: number;

  const segmentEventsRemoveCallbacks: Array<Function> = [];
  const nodeEventsRemoveCallbacks: Array<Function> = [];
  let manageWMEStreetLayerCallback: Function | null = null;

  /** @type{number|null} */
  let countryID: number | null = null;

  let streetStyles: Array<{ strokeColor: string; strokeWidth: number; strokeDashstyle: string; outlineColor: string }> = [];
  /** @type {OpenLayers.Layer.Vector} */
  let streetVectorLayer: OpenLayers.Layer.Vector;
  /** @type {OpenLayers.Layer.Vector} */
  let nodesVector: OpenLayers.Layer.Vector;
  /** @type {OpenLayers.Layer.Vector} */
  let labelsVector: OpenLayers.Layer.Vector;
  /** @type {boolean} */
  let drawingAborted: boolean = false;

  let preferences: PreferenceObject;
  /** @type {OpenLayers.Layer.Vector} */
  let WMERoadLayer: (OpenLayers.Layer.Vector | null);
  /** @type {boolean} */
  let SVLAutomDisabled: boolean;
  /** @type {OpenLayers.Map} */
  let OLMap: OpenLayers.Map;

  /** @type{OpenLayers.Projection} */
  let gmapsProjection: OpenLayers.Projection;

  /** @type{number} */
  const ROAD_LAYER: number = 0;
  /** @type{number} */
  const SVL_LAYER: number = 1;
  /** @type{Object} */
  const layerCheckboxes: { [key: string]: (HTMLInputElement | null) } = {
    'ROAD_LAYER': null,
    'SVL_LAYER': null,
  };

  /** @type{number} */
  const clutterMax: number = 20;
  /** @type{number} */
  const fontSizeMax: number = 32;
  /** @type{Array<string>} */
  const superScript: Array<string> = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  const svlIgnoredStreets = {
    '8': true,
    '10': true,
    '16': true,
    '17': true,
    '19': true,
    '20': true,
    '22': true,
  };

  // Styles that are not changeable in the 'preferences':
  const validatedStyle = {
    strokeColor: '#F53BFF',
    strokeWidth: 3,
    strokeDashstyle: 'solid',
  };

  const roundaboutStyle = {
    strokeColor: '#111111',
    strokeWidth: 1,
    strokeDashstyle: 'dash',
    strokeOpacity: 0.6,
  };

  const nodeStyle = {
    'stroke': false,
    'fillColor': '#0015FF',
    'fillOpacity': 0.9,
    'pointRadius': 3,
    'pointerEvents': 'none',
  };

  // note: nodes inside JB cannot be styled consistently (WME's function does not always work)
  const nodeStyleDeadEnd = {
    'stroke': false,
    'fillColor': '#C31CFF',
    'fillOpacity': 0.9,
    'pointRadius': 3,
    'pointerEvents': 'none',
  };

  const unknownDirStyle = {
    'graphicName': 'x',
    'strokeColor': '#f00',
    'strokeWidth': 1.5,
    'fillColor': '#FFFF40',
    'fillOpacity': 0.7,
    'pointRadius': 7,
    'pointerEvents': 'none',
  };

  const geometryNodeStyle = {
    'stroke': false,
    'fillColor': '#000',
    'fillOpacity': 0.5,
    'pointRadius': 3.5,
    'graphicZIndex': 179,
    'pointerEvents': 'none',
  };

  const nonEditableStyle = {
    'strokeColor': '#000',
    // 'strokeWidth': 2, 20%
    'strokeDashstyle': 'solid',
  };
  const tunnelFlagStyle2 = {
    strokeColor: '#C90',
    strokeDashstyle: 'longdash',
  };
  const tunnelFlagStyle1 = {
    strokeColor: '#fff',
    strokeOpacity: 0.8,
    strokeDashstyle: 'longdash',
  };

  // End of global variable declaration

  const safeAlert = (level, message) => {
    try {
      WazeWrap.Alerts[level](GM_info.script.name, message);
    } catch (e) {
      console.error(e);
      alert(message);
    }
  };

  function isFarZoom(zoom = wmeSDK.Map.getZoomLevel()) {
    //console.log("isFarZoom " + zoom);
    return zoom < preferences['switchZoom'];
  }

  function mergeEndCallback() {
    const tc = wmeSDK.DataModel.Countries.getTopCountry();
    if (tc && tc.id !== countryID) {
      countryID = tc.id;
      consoleDebug('Init new country ' + countryID);
      initCountry();
    }
  }

  function svlGlobals() {
    OLMap = W.map.getWazeMap().getOLMap();
    gmapsProjection = new OpenLayers.Projection('EPSG:4326');
    preferences = null;
    OpenLayers.Renderer.symbol['myTriangle'] = [-2, 0, 2, 0, 0, -6, -2, 0];
  }

  function refreshWME() {
    if (wmeSDK.Editing.getUnsavedChangesCount() === 0 &&
      wmeSDK.Editing.getSelection() === null && !wmeSDK.Editing.isDrawingInProgress() &&
      document.querySelector('#panel-container')?.hasChildNodes() === false
    ) {
      wmeSDK.DataModel.refreshData();
    }
  }

  function setLayerVisibility(layer: number, visibility: boolean, trial: number = 0) {
    //TODO: consider using wmeSDK.Map.setLayerVisibility({ layerName: "roads", visibility: false })
    // Toggle layers
    if (layer === SVL_LAYER) {
      consoleDebug(`Changing SVL Layer visibility to ${visibility}`);
      //streetVectorLayer.setVisibility(visibility);
    } else if (WMERoadLayer) {
      consoleDebug(`Changing Road Layer visibility to ${visibility}`);
      //WMERoadLayer.setVisibility(visibility);
    } else {
      console.warn("SVL: cannot toggle the WME's road layer");
    }
    // Toggle checkboxes
    if (!layerCheckboxes[layer]) {
      consoleDebug(`Initialising checkbox for layer ${layer}`);
      layerCheckboxes[layer] = <HTMLInputElement>document.getElementById(
        layer === SVL_LAYER
          ? 'layer-switcher-item_street_vector_layer'
          : 'layer-switcher-item_road'
      );
      if (!layerCheckboxes[layer]) {
        console.warn(`SVL: cannot find checkbox for layer "${layer}", attempt ${trial + 1}/10`);
        if (trial < 10) {
          setTimeout(() => {
            setLayerVisibility(layer, visibility, trial + 1);
          }, 400 * (trial + 1));
        }
        return;
      }
    }
    consoleDebug(`Switching the layer ${layer} checkbox to ${visibility}`);
    if ((layerCheckboxes[layer].checked && !visibility) || (!layerCheckboxes[layer].checked && visibility)) {
      layerCheckboxes[layer].click();
    }
    //layerCheckboxes[layer].checked = visibility;
  }

  // TODO
  function hasToBeSkipped(roadid) {
    return (
      preferences['hideMinorRoads'] &&
      wmeSDK.Map.getZoomLevel() === 3 &&
      svlIgnoredStreets[roadid] === true
    );
  }

  function savePreferences(pref: PreferenceObject, silent = true) {
    consoleDebug('savePreferences');
    pref.version = SVL_VERSION;
    try {
      unsafeWindow.localStorage.setItem('svl', JSON.stringify(pref));
      if (!silent) {
        safeAlert('success', _('preferences_saved'));
      }
    } catch (e) {
      console.error(e);
      safeAlert('error', _('preferences_saving_error'));
    }
  }

  function saveDefaultPreferences() {
    consoleDebug('saveDefaultPreferences');
    loadPreferences(true);
  }

  //TODO: remove when width goes to production
  const defaultSegmentWidthMeters: MeterObject = {
    '1': 6.2, // "Street",
    '2': 7, // "Primary Street",
    '3': 9, // "Freeway",
    '4': 7, // "Ramp",
    '5': 2, // "Walking Trail",
    '6': 8.4, // "Major Highway",
    '7': 8, // "Minor Highway",
    '8': 8, // "Dirt Road",
    '10': 2, // "Pedestrian Boardwalk",
    '15': 8, // "Ferry",
    '16': 2, // "Stairway",
    '17': 7, // "Private Road",
    '18': 6, // "Railroad",
    '19': 5, // "Runway",
    '20': 6, // "Parking Lot Road",
    '22': 5, // "Alley"
  };
  const defaultLaneWidthMeters: MeterObject = {
    '1': 3.1, // "Street",
    '2': 3.5, // "Primary Street",
    '3': 4.5, // "Freeway",
    '4': 3.5, // "Ramp",
    '5': 1, // "Walking Trail",
    '6': 4.2, // "Major Highway",
    '7': 4, // "Minor Highway",
    '8': 4, // "Dirt Road",
    '10': 1, // "Pedestrian Boardwalk",
    '15': 4, // "Ferry",
    '16': 1, // "Stairway",
    '17': 3.5, // "Private Road",
    '18': 3, // "Railroad",
    '19': 2.5, // "Runway",
    '20': 3, // "Parking Lot Road",
    '22': 2.5, // "Alley"
  };
  const presets = {
    'svl_standard': {
      streets: [
        null,
        {
          'strokeColor': '#FFFFFF',
          'strokeWidth': 10,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#CBA12E',
          'strokeWidth': 12,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#387FB8',
          'strokeWidth': 18,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#3FC91C',
          'strokeWidth': 11,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#00FF00',
          'strokeWidth': 5,
          'strokeDashstyle': 'dash',
        },
        {
          'strokeColor': '#C13040',
          'strokeWidth': 16,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#ECE589',
          'strokeWidth': 14,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#82614A',
          'strokeWidth': 7,
          'strokeDashstyle': 'solid',
        },
        null,
        {
          'strokeColor': '#0000FF',
          'strokeWidth': 5,
          'strokeDashstyle': 'dash',
        },
        null,
        null,
        null,
        null,
        {
          'strokeColor': '#FF8000',
          'strokeWidth': 5,
          'strokeDashstyle': 'dashdot',
        },
        {
          'strokeColor': '#B700FF',
          'strokeWidth': 5,
          'strokeDashstyle': 'dash',
        },
        {
          'strokeColor': '#00FFB3',
          'strokeWidth': 7,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#FFFFFF',
          'strokeWidth': 8,
          'strokeDashstyle': 'dash',
        },
        {
          'strokeColor': '#00FF00',
          'strokeWidth': 5,
          'strokeDashstyle': 'dashdot',
        },
        {
          'strokeColor': '#2282AB',
          'strokeWidth': 9,
          'strokeDashstyle': 'solid',
        },
        null,
        {
          'strokeColor': '#C6C7FF',
          'strokeWidth': 6,
          'strokeDashstyle': 'solid',
        },
      ],
    },
    'wme_colors': {
      streets: [
        null,
        {
          'strokeColor': '#FFFFDD',
          'strokeWidth': 10,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#FDFAA7',
          'strokeWidth': 12,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#6870C3',
          'strokeWidth': 18,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#B3BFB3',
          'strokeWidth': 11,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#00FF00',
          'strokeWidth': 5,
          'strokeDashstyle': 'dash',
        },
        {
          'strokeColor': '#469FBB',
          'strokeWidth': 16,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#69BF88',
          'strokeWidth': 14,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#867342',
          'strokeWidth': 7,
          'strokeDashstyle': 'solid',
        },
        null,
        {
          'strokeColor': '#9A9A9A',
          'strokeWidth': 5,
          'strokeDashstyle': 'dash',
        },
        null,
        null,
        null,
        null,
        {
          'strokeColor': '#6FB6BE',
          'strokeWidth': 5,
          'strokeDashstyle': 'dashdot',
        },
        {
          'strokeColor': '#9A9A9A',
          'strokeWidth': 5,
          'strokeDashstyle': 'dash',
        },
        {
          'strokeColor': '#BEBA6C',
          'strokeWidth': 7,
          'strokeDashstyle': 'solid',
        },
        {
          'strokeColor': '#D8D8F9',
          'strokeWidth': 8,
          'strokeDashstyle': 'dash',
        },
        {
          'strokeColor': '#222222',
          'strokeWidth': 5,
          'strokeDashstyle': 'dashdot',
        },
        {
          'strokeColor': '#ABABAB',
          'strokeWidth': 9,
          'strokeDashstyle': 'solid',
        },
        null,
        {
          'strokeColor': '#64799A',
          'strokeWidth': 6,
          'strokeDashstyle': 'solid',
        },
      ],
    },
  };

  /**
   *
   * @param {number} roadType
   * @param {boolean} twoWay
   * @returns {number}
   */
  function getWidth(roadType: number, twoWay: boolean): number {
    // If in close zoom and user enabled the realsize mode
    if (preferences['realsize']) {
      return twoWay
        ? defaultSegmentWidthMeters[roadType]
        : defaultLaneWidthMeters[roadType];
    }
    // Use the value stored in the preferences
    return streetStyles[roadType].strokeWidth;
  }

  function loadPreferences(overwrite = false) {
    let oldUser = true;
    let loadedPreferences = null;

    if (overwrite === true) {
      unsafeWindow.localStorage.removeItem('svl');
    } else {
      const pref = unsafeWindow.localStorage.getItem('svl');
      if (pref) {
        loadedPreferences = JSON.parse(pref);
      }
    }

    // consoleDebug("Loading preferences");
    if (loadedPreferences === null) {
      if (overwrite) {
        consoleDebug('Overwriting existing preferences');
      } else {
        oldUser = false;
        consoleDebug('Creating new preferences for the first time');
      }
    }
    // else: preference read from localstorage


    preferences = {};
    preferences['autoReload'] = {};
    // jshint ignore: start
    preferences['autoReload']['interval'] =
      loadedPreferences?.['autoReload']?.['interval'] ?? 60000;
    preferences['autoReload']['enabled'] =
      loadedPreferences?.['autoReload']?.['enabled'] ?? false;

    preferences['showSLSinglecolor'] =
      loadedPreferences?.['showSLSinglecolor'] ?? false;
    preferences['SLColor'] = loadedPreferences?.['SLColor'] ?? '#ffdf00';

    preferences['fakelock'] =
      loadedPreferences?.['fakelock'] ?? wmeSDK.State.getUserInfo()?.rank ?? 6; // jshint ignore:line
    preferences['hideMinorRoads'] =
      loadedPreferences?.['hideMinorRoads'] ?? true;
    preferences['showDashedUnverifiedSL'] =
      loadedPreferences?.['showDashedUnverifiedSL'] ?? true;
    preferences['showSLcolor'] = loadedPreferences?.['showSLcolor'] ?? true;
    preferences['showSLtext'] = loadedPreferences?.['showSLtext'] ?? true;
    // preferences['version'] = SVL_VERSION; Automatically added by savePreferences
    preferences['disableRoadLayers'] =
      loadedPreferences?.['disableRoadLayers'] ?? true;
    preferences['startDisabled'] =
      loadedPreferences?.['startDisabled'] ?? false;
    preferences['clutterConstant'] =
      loadedPreferences?.['clutterConstant'] ?? 7;
    preferences['labelOutlineWidth'] =
      loadedPreferences?.['labelOutlineWidth'] ?? 3;
    preferences['closeZoomLabelSize'] =
      loadedPreferences?.['closeZoomLabelSize'] ?? 14;
    preferences['farZoomLabelSize'] =
      loadedPreferences?.['farZoomLabelSize'] ?? 12;
    preferences['useWMERoadLayerAtZoom'] =
      loadedPreferences?.['useWMERoadLayerAtZoom'] ?? 15;
    preferences['switchZoom'] = loadedPreferences?.['switchZoom'] ?? 17;

    preferences['arrowDeclutter'] =
      loadedPreferences?.['arrowDeclutter'] ?? 140;

    preferences['segmentsThreshold'] =
      loadedPreferences?.['segmentsThreshold'] ?? 3000;

    preferences['nodesThreshold'] =
      loadedPreferences?.['nodesThreshold'] ?? 4000;

    preferences['showUnderGPSPoints'] =
      loadedPreferences?.['showUnderGPSPoints'] ?? false;

    preferences['routingModeEnabled'] =
      loadedPreferences?.['routingModeEnabled'] ?? false;

    preferences['hideRoutingModeBlock'] =
      loadedPreferences?.['hideRoutingModeBlock'] ?? false;

    preferences['realsize'] = loadedPreferences?.['realsize'] ?? true;
    preferences['showANs'] = loadedPreferences?.['showANs'] ?? false;
    preferences['renderGeomNodes'] =
      loadedPreferences?.['renderGeomNodes'] ?? false;

    preferences['layerOpacity'] = loadedPreferences?.['layerOpacity'] ?? 0.8;

    preferences['streets'] = [];
    // Street: 1
    preferences['streets'][1] = {
      'strokeColor':
        loadedPreferences?.['streets'][1]?.['strokeColor'] ?? '#FFFFFF',
      'strokeWidth': loadedPreferences?.['streets'][1]?.['strokeWidth'] ?? 10,
      'strokeDashstyle':
        loadedPreferences?.['streets'][1]?.['strokeDashstyle'] ?? 'solid',
    };
    // Parking: 20
    preferences['streets'][20] = {
      'strokeColor':
        loadedPreferences?.['streets'][20]?.['strokeColor'] ?? '#2282AB',
      'strokeWidth': loadedPreferences?.['streets'][20]?.['strokeWidth'] ?? 9,
      'strokeDashstyle':
        loadedPreferences?.['streets'][20]?.['strokeDashstyle'] ?? 'solid',
    };
    // Ramp: 4
    preferences['streets'][4] = {
      'strokeColor':
        loadedPreferences?.['streets'][4]?.['strokeColor'] ?? '#3FC91C',
      'strokeWidth': loadedPreferences?.['streets'][4]?.['strokeWidth'] ?? 11,
      'strokeDashstyle':
        loadedPreferences?.['streets'][4]?.['strokeDashstyle'] ?? 'solid',
    };
    // Freeway: 3
    preferences['streets'][3] = {
      'strokeColor':
        loadedPreferences?.['streets'][3]?.['strokeColor'] ?? '#387FB8',
      'strokeWidth': loadedPreferences?.['streets'][3]?.['strokeWidth'] ?? 18,
      'strokeDashstyle':
        loadedPreferences?.['streets'][3]?.['strokeDashstyle'] ?? 'solid',
    };
    // Minor: 7
    preferences['streets'][7] = {
      'strokeColor':
        loadedPreferences?.['streets'][7]?.['strokeColor'] ?? '#ECE589',
      'strokeWidth': loadedPreferences?.['streets'][7]?.['strokeWidth'] ?? 14,
      'strokeDashstyle':
        loadedPreferences?.['streets'][7]?.['strokeDashstyle'] ?? 'solid',
    };
    // Major: 6
    preferences['streets'][6] = {
      'strokeColor':
        loadedPreferences?.['streets'][6]?.['strokeColor'] ?? '#C13040',
      'strokeWidth': loadedPreferences?.['streets'][6]?.['strokeWidth'] ?? 16,
      'strokeDashstyle':
        loadedPreferences?.['streets'][6]?.['strokeDashstyle'] ?? 'solid',
    };
    // Stairway: 16
    preferences['streets'][16] = {
      'strokeColor':
        loadedPreferences?.['streets'][16]?.['strokeColor'] ?? '#B700FF',
      'strokeWidth': loadedPreferences?.['streets'][16]?.['strokeWidth'] ?? 5,
      'strokeDashstyle':
        loadedPreferences?.['streets'][16]?.['strokeDashstyle'] ?? 'dash',
    };
    // Walking: 5
    preferences['streets'][5] = {
      'strokeColor':
        loadedPreferences?.['streets'][5]?.['strokeColor'] ?? '#00FF00',
      'strokeWidth': loadedPreferences?.['streets'][5]?.['strokeWidth'] ?? 5,
      'strokeDashstyle':
        loadedPreferences?.['streets'][5]?.['strokeDashstyle'] ?? 'dash',
    };
    // Dirty: 8
    preferences['streets'][8] = {
      'strokeColor':
        loadedPreferences?.['streets'][8]?.['strokeColor'] ?? '#82614A',
      'strokeWidth': loadedPreferences?.['streets'][8]?.['strokeWidth'] ?? 7,
      'strokeDashstyle':
        loadedPreferences?.['streets'][8]?.['strokeDashstyle'] ?? 'solid',
    };
    // Ferry: 15
    preferences['streets'][15] = {
      'strokeColor':
        loadedPreferences?.['streets'][15]?.['strokeColor'] ?? '#FF8000',
      'strokeWidth': loadedPreferences?.['streets'][15]?.['strokeWidth'] ?? 5,
      'strokeDashstyle':
        loadedPreferences?.['streets'][15]?.['strokeDashstyle'] ?? 'dashdot',
    };
    // Railroad: 18
    preferences['streets'][18] = {
      'strokeColor':
        loadedPreferences?.['streets'][18]?.['strokeColor'] ?? '#FFFFFF',
      'strokeWidth': loadedPreferences?.['streets'][18]?.['strokeWidth'] ?? 8,
      'strokeDashstyle':
        loadedPreferences?.['streets'][18]?.['strokeDashstyle'] ?? 'dash',
    };
    // Private: 17
    preferences['streets'][17] = {
      'strokeColor':
        loadedPreferences?.['streets'][17]?.['strokeColor'] ?? '#00FFB3',
      'strokeWidth': loadedPreferences?.['streets'][17]?.['strokeWidth'] ?? 7,
      'strokeDashstyle':
        loadedPreferences?.['streets'][17]?.['strokeDashstyle'] ?? 'solid',
    };
    // Alley: 22
    preferences['streets'][22] = {
      'strokeColor':
        loadedPreferences?.['streets'][22]?.['strokeColor'] ?? '#C6C7FF',
      'strokeWidth': loadedPreferences?.['streets'][22]?.['strokeWidth'] ?? 6,
      'strokeDashstyle':
        loadedPreferences?.['streets'][22]?.['strokeDashstyle'] ?? 'solid',
    };
    // Runway: 19
    preferences['streets'][19] = {
      'strokeColor':
        loadedPreferences?.['streets'][19]?.['strokeColor'] ?? '#00FF00',
      'strokeWidth': loadedPreferences?.['streets'][19]?.['strokeWidth'] ?? 5,
      'strokeDashstyle':
        loadedPreferences?.['streets'][19]?.['strokeDashstyle'] ?? 'dashdot',
    };
    // Primary: 2
    preferences['streets'][2] = {
      'strokeColor':
        loadedPreferences?.['streets'][2]?.['strokeColor'] ?? '#CBA12E',
      'strokeWidth': loadedPreferences?.['streets'][2]?.['strokeWidth'] ?? 12,
      'strokeDashstyle':
        loadedPreferences?.['streets'][2]?.['strokeDashstyle'] ?? 'solid',
    };
    // Pedestrian: 10
    preferences['streets'][10] = {
      'strokeColor':
        loadedPreferences?.['streets'][10]?.['strokeColor'] ?? '#0000FF',
      'strokeWidth': loadedPreferences?.['streets'][10]?.['strokeWidth'] ?? 5,
      'strokeDashstyle':
        loadedPreferences?.['streets'][10]?.['strokeDashstyle'] ?? 'dash',
    };
    // Red segments (without names)
    preferences['red'] = {
      'strokeColor': loadedPreferences?.['red']?.['strokeColor'] ?? '#FF0000',
      'strokeDashstyle':
        loadedPreferences?.['red']?.['strokeDashstyle'] ?? 'solid',
    };

    preferences['roundabout'] = {
      'strokeColor':
        loadedPreferences?.['roundabout']?.['strokeColor'] ?? '#111',
      'strokeWidth': loadedPreferences?.['roundabout']?.['strokeWidth'] ?? 1,
      'strokeDashstyle':
        loadedPreferences?.['roundabout']?.['strokeDashstyle'] ?? 'dash',
    };
    preferences['lanes'] = {
      'strokeColor': loadedPreferences?.['lanes']?.['strokeColor'] ?? '#454443',
      'strokeDashstyle':
        loadedPreferences?.['lanes']?.['strokeDashstyle'] ?? 'dash',
      'strokeOpacity': loadedPreferences?.['lanes']?.['strokeOpacity'] ?? 0.9,
    };
    preferences['toll'] = {
      'strokeColor': loadedPreferences?.['toll']?.['strokeColor'] ?? '#00E1FF',
      'strokeDashstyle':
        loadedPreferences?.['toll']?.['strokeDashstyle'] ?? 'solid',
      'strokeOpacity': loadedPreferences?.['toll']?.['strokeOpacity'] ?? 1.0,
    };
    preferences['closure'] = {
      'strokeColor':
        loadedPreferences?.['closure']?.['strokeColor'] ?? '#FF00FF',
      'strokeOpacity': loadedPreferences?.['closure']?.['strokeOpacity'] ?? 1.0,
      'strokeDashstyle':
        loadedPreferences?.['closure']?.['strokeDashstyle'] ?? 'dash',
    };
    preferences['headlights'] = {
      'strokeColor':
        loadedPreferences?.['headlights']?.['strokeColor'] ?? '#bfff00',
      'strokeOpacity':
        loadedPreferences?.['headlights']?.['strokeOpacity'] ?? 0.9,
      'strokeDashstyle':
        loadedPreferences?.['headlights']?.['strokeDashstyle'] ?? 'dot',
    };
    preferences['nearbyHOV'] = {
      'strokeColor':
        loadedPreferences?.['nearbyHOV']?.['strokeColor'] ?? '#ff66ff',
      'strokeOpacity':
        loadedPreferences?.['nearbyHOV']?.['strokeOpacity'] ?? 1.0,
      'strokeDashstyle':
        loadedPreferences?.['nearbyHOV']?.['strokeDashstyle'] ?? 'dash',
    };
    preferences['restriction'] = {
      'strokeColor':
        loadedPreferences?.['restriction']?.['strokeColor'] ?? '#F2FF00',
      'strokeOpacity':
        loadedPreferences?.['restriction']?.['strokeOpacity'] ?? 1.0,
      'strokeDashstyle':
        loadedPreferences?.['restriction']?.['strokeDashstyle'] ?? 'dash',
    };
    preferences['dirty'] = {
      'strokeColor': loadedPreferences?.['dirty']?.['strokeColor'] ?? '#82614A',
      'strokeOpacity': loadedPreferences?.['dirty']?.['strokeOpacity'] ?? 0.6,
      'strokeDashstyle':
        loadedPreferences?.['dirty']?.['strokeDashstyle'] ?? 'longdash',
    };

    preferences['speeds'] = {};
    preferences['speeds']['default'] =
      loadedPreferences?.['speed']?.['default'] ?? '#cc0000';

    if (loadedPreferences?.['speeds']?.['metric']) {
      preferences['speeds']['metric'] = loadedPreferences['speeds']['metric'];
    } else {
      preferences['speeds']['metric'] = {};
      preferences['speeds']['metric'][5] =
        loadedPreferences?.['speeds']?.['metric'][5] ?? '#542344';
      preferences['speeds']['metric'][7] =
        loadedPreferences?.['speeds']?.['metric'][7] ?? '#ff5714';
      preferences['speeds']['metric'][10] =
        loadedPreferences?.['speeds']?.['metric'][10] ?? '#ffbf00';
      preferences['speeds']['metric'][20] =
        loadedPreferences?.['speeds']?.['metric'][20] ?? '#ee0000';
      preferences['speeds']['metric'][30] =
        loadedPreferences?.['speeds']?.['metric'][30] ?? '#e4ff1a';
      preferences['speeds']['metric'][40] =
        loadedPreferences?.['speeds']?.['metric'][40] ?? '#993300';
      preferences['speeds']['metric'][50] =
        loadedPreferences?.['speeds']?.['metric'][50] ?? '#33ff33';
      preferences['speeds']['metric'][60] =
        loadedPreferences?.['speeds']?.['metric'][60] ?? '#639fab';
      preferences['speeds']['metric'][70] =
        loadedPreferences?.['speeds']?.['metric'][70] ?? '#00ffff';
      preferences['speeds']['metric'][80] =
        loadedPreferences?.['speeds']?.['metric'][80] ?? '#00bfff';
      preferences['speeds']['metric'][90] =
        loadedPreferences?.['speeds']?.['metric'][90] ?? '#0066ff';
      preferences['speeds']['metric'][100] =
        loadedPreferences?.['speeds']?.['metric'][100] ?? '#ff00ff';
      preferences['speeds']['metric'][110] =
        loadedPreferences?.['speeds']?.['metric'][110] ?? '#ff0080';
      preferences['speeds']['metric'][120] =
        loadedPreferences?.['speeds']?.['metric'][120] ?? '#ff0000';
      preferences['speeds']['metric'][130] =
        loadedPreferences?.['speeds']?.['metric'][130] ?? '#ff9000';
      preferences['speeds']['metric'][140] =
        loadedPreferences?.['speeds']?.['metric'][140] ?? '#ff4000';
      preferences['speeds']['metric'][150] =
        loadedPreferences?.['speeds']?.['metric'][150] ?? '#0040ff';
    }

    if (loadedPreferences?.['speeds']?.['imperial']) {
      preferences['speeds']['imperial'] =
        loadedPreferences['speeds']['imperial'];
    } else {
      preferences['speeds']['imperial'] = {};
      preferences['speeds']['imperial'][5] =
        loadedPreferences?.['speeds']?.['imperial'][5] ?? '#ff0000';
      preferences['speeds']['imperial'][10] =
        loadedPreferences?.['speeds']?.['imperial'][10] ?? '#ff8000';
      preferences['speeds']['imperial'][15] =
        loadedPreferences?.['speeds']?.['imperial'][15] ?? '#ffb000';
      preferences['speeds']['imperial'][20] =
        loadedPreferences?.['speeds']?.['imperial'][20] ?? '#bfff00';
      preferences['speeds']['imperial'][25] =
        loadedPreferences?.['speeds']?.['imperial'][25] ?? '#993300';
      preferences['speeds']['imperial'][30] =
        loadedPreferences?.['speeds']?.['imperial'][30] ?? '#33ff33';
      preferences['speeds']['imperial'][35] =
        loadedPreferences?.['speeds']?.['imperial'][35] ?? '#00ff90';
      preferences['speeds']['imperial'][40] =
        loadedPreferences?.['speeds']?.['imperial'][40] ?? '#00ffff';
      preferences['speeds']['imperial'][45] =
        loadedPreferences?.['speeds']?.['imperial'][45] ?? '#00bfff';
      preferences['speeds']['imperial'][50] =
        loadedPreferences?.['speeds']?.['imperial'][50] ?? '#0066ff';
      preferences['speeds']['imperial'][55] =
        loadedPreferences?.['speeds']?.['imperial'][55] ?? '#ff00ff';
      preferences['speeds']['imperial'][60] =
        loadedPreferences?.['speeds']?.['imperial'][60] ?? '#ff0050';
      preferences['speeds']['imperial'][65] =
        loadedPreferences?.['speeds']?.['imperial'][65] ?? '#ff9010';
      preferences['speeds']['imperial'][70] =
        loadedPreferences?.['speeds']?.['imperial'][70] ?? '#0040ff';
      preferences['speeds']['imperial'][75] =
        loadedPreferences?.['speeds']?.['imperial'][75] ?? '#10ff10';
      preferences['speeds']['imperial'][80] =
        loadedPreferences?.['speeds']?.['imperial'][80] ?? '#ff4000';
      preferences['speeds']['imperial'][85] =
        loadedPreferences?.['speeds']?.['imperial'][85] ?? '#ff0000';
    }
    // jshint ignore: end
    savePreferences(preferences);
    // Compute properties that need to be computed

    return oldUser;
  }

  function bestBackground(color: string) {
    const oppositeColor =
      parseInt(color.substring(1, 3), 16) * 0.299 +
      parseInt(color.substring(3, 5), 16) * 0.587 +
      parseInt(color.substring(5, 7), 16) * 0.114;
    if (oppositeColor < 127) {
      return '#FFF';
    }
    return '#000';
  }

  function getColorStringFromSpeed(metricspeed: number) {
    if (preferences['showSLSinglecolor']) {
      return preferences['SLColor'];
    }
    const type = W.prefs.attributes['isImperial'] ? 'imperial' : 'metric';
    const speed = W.prefs.attributes['isImperial']
      ? Math.round(metricspeed / 1.609344)
      : metricspeed;
    return (
      preferences['speeds'][type][speed] ?? preferences['speeds']['default']
    );
  }

  function getAngle(isForward: boolean, p0: OpenLayers.Geometry.Point, p1: OpenLayers.Geometry.Point) {
    let dx = 0;
    let dy = 0;

    if (isForward) {
      dx = p1.x - p0.x;
      dy = p1.y - p0.y;
    } else {
      dx = p0.x - p1.x;
      dy = p0.y - p1.y;
    }
    const angle = Math.atan2(dx, dy);
    return (angle * 180) / Math.PI; // 360-(...) -90 removed from here
  }

  function getSuperScript(number: number): string {
    let res = '';
    if (number) {
      let numberString: string = number.toString();
      if (W.prefs.attributes['isImperial'] === true) {
        // Convert the speed limit to mph
        numberString = Math.round(number / 1.609344).toString();
      }
      numberString = numberString.toString();
      for (let i = 0; i < numberString.length; i += 1) {
        res += superScript[numberString.charAt(i)];
      }
    }
    return res;
  }

  /**
   * 
   * @param {Waze.Feature.Vector.Segment} segment
   * @returns 
   */
  function hasNonEmptyStreet(segment: Waze.Feature.Vector.Segment) {
    const e = segment.getAddress(W.model);
    return null != e.getStreet() && !e.isEmptyStreet()
  }

  /**
   *
   * @param {Waze.Feature.Vector.Segment} segmentModel
   * @param {Array<OpenLayers.Geometry.Point>} simplified
   */
  function drawLabels(segmentModel: Waze.Feature.Vector.Segment, simplified: Array<OpenLayers.Geometry.Point>) {
    // consoleDebug('drawLabels');
    let labelFeature;
    let labelText: string;

    // let centroid;
    /** @type {string} */
    let directionArrow: string;
    // let streetNameThresholdDistance;
    let p0: OpenLayers.Geometry.Point;
    let p1: OpenLayers.Geometry.Point;
    // let doubleLabelDistance;
    const labels = [];
    labelFeature = null;
    const attributes = segmentModel.getAttributes();
    const address = segmentModel.getAddress(W.model);
    const hasStreetName = hasNonEmptyStreet(segmentModel);
    let streetPart = '';
    if (hasStreetName) {
      streetPart = address.getStreetName();
    } else if (attributes.roadType < 10 && !segmentModel.isInRoundabout()) {
      streetPart = '⚑';
    }
    // consoleDebug(`Streetpart: ${streetPart}`);

    // add alt street names
    let altStreetPart = '';
    if (preferences['showANs']) {
      let ANsShown = 0;
      for (let i = 0; i < attributes.streetIDs.length; i += 1) {
        const streetID = attributes.streetIDs[i];
        if (ANsShown === 2) {
          // Show maximum 2 alternative names
          altStreetPart += ' …';
          break;
        }
        const altStreet = W.model.streets.getObjectById(streetID);
        const altStreetName = altStreet?.name ?? altStreet?.getName()
        if (altStreetName && altStreetName !== streetPart) {
          ANsShown += 1;
          altStreetPart += `(${altStreetName})`;
        }
      }

      altStreetPart = altStreetPart.replace(')(', ', ');
      if (altStreetPart !== '') {
        altStreetPart = `\n${altStreetPart}`;
      }
    }

    if (!streetStyles[attributes.roadType]) {
      streetPart += '\n!! UNSUPPORTED ROAD TYPE !!';
    }

    let speedPart = '';
    const speed = attributes.fwdMaxSpeed ?? attributes.revMaxSpeed;
    if (speed && preferences['showSLtext']) {
      if (attributes.fwdMaxSpeed === attributes.revMaxSpeed) {
        speedPart = getSuperScript(attributes.fwdMaxSpeed);
      } else if (attributes.fwdMaxSpeed) {
        speedPart = getSuperScript(attributes.fwdMaxSpeed);
        if (attributes.revMaxSpeed) {
          speedPart += `'${getSuperScript(attributes.revMaxSpeed)}`;
        }
      } else {
        speedPart = getSuperScript(attributes.revMaxSpeed);
        if (attributes.fwdMaxSpeed) {
          speedPart += `'${getSuperScript(attributes.fwdMaxSpeed)}`;
        }
      }
      /* jslint bitwise: true */
      if (
        attributes.fwdMaxSpeedUnverified ||
        attributes.revMaxSpeedUnverified
      ) {
        /* jslint bitwise: false */
        speedPart += '?';
      }
    }
    labelText = `${streetPart} ${speedPart}`;
    if (labelText === ' ') {
      return [];
    }
    /* streetNameThresholdDistance =
      labelText.length * 2.3 * (8 - OLMap.zoom) + Math.random() * 30;
    doubleLabelDistance = 4 * streetNameThresholdDistance; */

    const roadTypeID = attributes.roadType;
    const sampleLabel = new OpenLayers.Feature.Vector(simplified[0], {
      'sID': attributes.id,
      'color': streetStyles[roadTypeID]
        ? streetStyles[roadTypeID]['strokeColor']
        : '#f00',
      'outlinecolor': streetStyles[roadTypeID]
        ? streetStyles[roadTypeID]['outlineColor']
        : '#fff',
      'outlinewidth': preferences['labelOutlineWidth'],
    });

    const distances: { index: number, distance: number }[] = [];
    // TODO: compute all distances, sort them from larger to smaller and start placing labels there.
    for (let p = 0; p < simplified.length - 1; p += 1) {
      const distance = <number>simplified[p].distanceTo(simplified[p + 1]);
      distances.push({ index: p, distance });
    }
    // sort them by distance, descending
    distances.sort((a, b) =>
      a.distance > b.distance ? -1 : a.distance < b.distance ? 1 : 0
    );
    let labelsToInsert = streetPart === '' ? 1 : distances.length;
    const requiredSpace = clutterConstant * labelText.length;
    // console.log(`${segmentModel.getID()} - ${labelText}: ${requiredSpace}`);

    // console.debug(segmentModel.getID(), distances);
    for (let i = 0; i < distances.length && labelsToInsert > 0; i += 1) {
      // console.log(`LabelsToInsert: ${labelsToInsert}`);
      if (
        distances[i].distance < (i > 0 ? requiredSpace : requiredSpace - 30)
      ) {
        // console.log(`Breaking at index ${i}`);
        break;
      }
      const p = distances[i].index;
      // consoleDebug('Label can be inserted:');
      // console.dir(address);
      let dx = 0;
      let dy = 0;
      // if (distance > streetNameThresholdDistance) {
      // consoleDebug('Label inserted');
      // p = maxDistanceIndex;
      // if (distance < doubleLabelDistance) {
      // || farzoom
      // p0 = simplified[p];
      // p1 = simplified[p + 1];
      // } else {
      p0 = simplified[p];
      p1 = new OpenLayers.Geometry.LineString([
        p0,
        simplified[p + 1],
      ]).getCentroid(
        true
      ); /* Important: pass true parameter otherwise it will return start point as centroid */ // Clone the label
        // }
        /* centroid = new OpenLayers.Geometry.LineString([p0, p1]).getCentroid(
          true
        ); */ labelFeature = sampleLabel.clone();
      labelFeature.geometry = p1;
      if (attributes.fwdDirection) {
        dx = p1.x - p0.x;
        dy = p1.y - p0.y;
      } else {
        dx = p0.x - p1.x;
        dy = p0.y - p1.y;
      }
      const angle = Math.atan2(dx, dy);
      let degrees = 90 + (angle * 180) / Math.PI;
      if (streetPart !== '') {
        directionArrow = ' ▶ ';
        if (degrees > 90 && degrees < 270) {
          degrees -= 180;
          // directionArrow = " ▶ ";
        } else {
          directionArrow = ' ◀ ';
        }
      } else {
        directionArrow = '';
      }
      if (!segmentModel.isOneWay()) {
        directionArrow = ''; // The degree has to be computed anyway
      }
      labelFeature.attributes.label =
        directionArrow + labelText + directionArrow + altStreetPart; // +
      // labelsToInsert; //TODO remove

      labelFeature.attributes['angle'] = degrees;
      labelFeature.attributes.closeZoomOnly = p % 2 === 1;
      labelFeature.attributes.showAtzoom = labelsToInsert;
      labelsToInsert -= 1;
      labels.push(labelFeature);
    }
    // console.dir(distances);
    /* for (let p = 0; p < simplified.length - 1 && labelsToInsert > 1; p += 1) {
 
    } */

    return labels;
  }

  function createAverageSpeedCamera({ id, rev, isForward, p0, p1 }: {
    id: number, rev: boolean, isForward: boolean, p0: OpenLayers.Geometry.Point, p1: OpenLayers.Geometry.Point
  }) {
    const degrees = getAngle(isForward, rev ? p1 : p0, rev ? p0 : p1);
    return new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(
        p0.x + Math.sin(degrees) * 10,
        p0.y + Math.cos(degrees) * 10
      ),
      {
        'sID': id,
      },
      {
        'rotation': degrees,
        'externalGraphic':
          'https://raw.githubusercontent.com/bedo2991/svl/master/average.png',
        'graphicWidth': 36,
        'graphicHeight': 36,
        'graphicZIndex': 300,
        'fillOpacity': 1,
        'pointerEvents': 'none',
      }
    );
  }

  /**
   * @param {Waze.Feature.Vector.Segment} model
   */
  function drawSegment(model: Waze.Feature.Vector.Segment) {
    // consoleDebug("DrawSegment");
    if (!model || model.getState() === 'DELETE')
      return {};
    const attributes = model.getAttributes();
    assertFeatureDoesNotExist(attributes.id, streetVectorLayer);
    consoleDebug(`Drawing segment: ${attributes.id}`);
    // TODO const hasToBeSk = hasToBeSkipped(attributes.roadType)
    const geoPoints = model.getGeometry().coordinates; // array of coordinates
    const olPointArray = geoPoints.map(geoPoint => new OpenLayers.Geometry.Point(geoPoint[0], geoPoint[1]).transform(gmapsProjection, OLMap.projection));
    const simplified = new OpenLayers.Geometry.LineString(olPointArray).simplify(
      1.5
    ).components;
    const segmentFeatures: OpenLayers.Feature.Vector[] = [];
    const baselevel = attributes.level * 100;
    const isTwoWay = attributes.fwdDirection && attributes.revDirection;
    const isInRoundabout = model.isInRoundabout();
    let isBridge = false;
    let hasSpeedLimitDrawn = false;
    // eslint-disable-next-line prefer-destructuring
    let roadType = attributes.roadType;

    //Compute the segment width
    let segmentWidth: number = 0;
    if (preferences['realsize']) {
      let segmentWidthFrom = 0;
      let segmentWidthTo = 0;
      if (attributes.fromLanesInfo) {
        if (attributes.fromLanesInfo.laneWidth) {
          segmentWidthFrom =
            (attributes.fromLanesInfo.numberOfLanes *
              attributes.fromLanesInfo.laneWidth) /
            100.0;
        } else {
          segmentWidthFrom =
            attributes.fromLanesInfo.numberOfLanes *
            defaultLaneWidthMeters[attributes.roadType];
        }
      } else {
        segmentWidthFrom = defaultLaneWidthMeters[attributes.roadType];
      }

      if (attributes.toLanesInfo) {
        if (attributes.toLanesInfo.laneWidth) {
          segmentWidthTo =
            (attributes.toLanesInfo.numberOfLanes *
              attributes.toLanesInfo.laneWidth) /
            100.0;
        } else {
          segmentWidthTo =
            attributes.toLanesInfo.numberOfLanes *
            defaultLaneWidthMeters[attributes.roadType];
        }
      } else {
        segmentWidthTo = defaultLaneWidthMeters[attributes.roadType];
      }

      if (!isTwoWay) {
        segmentWidth = attributes.fwdDirection
          ? segmentWidthFrom
          : segmentWidthTo;
      } else if (segmentWidthTo != segmentWidthFrom) {
        segmentWidth = segmentWidthFrom + segmentWidthTo;
      } else if (segmentWidthFrom) {
        //Segment has the same non-null width in both directions, just return one, twice
        segmentWidth = segmentWidthFrom * 2.0;
      }
    } else {
      //Use the static value from the preferences
      segmentWidth = streetStyles[roadType].strokeWidth;
    }

    const totalSegmentWidth = segmentWidth; // ?? getWidth(roadType, isTwoWay);
    let roadWidth = totalSegmentWidth;
    let lineFeature: (OpenLayers.Feature.Vector | null) = null;
    if (attributes.primaryStreetID === null) {
      // consoleDebug("RED segment", model);
      lineFeature = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.LineString(olPointArray),
        {
          'sID': attributes.id,
          'color': preferences['red']['strokeColor'],
          'width': totalSegmentWidth,
          'dash': preferences['red']['strokeDashstyle'],
        }
      );
      segmentFeatures.push(lineFeature);
      return { segmentFeatures };
    }

    // consoleDebug(width);
    if (
      preferences['routingModeEnabled'] &&
      attributes.routingRoadType !== null
    ) {
      roadType = attributes.routingRoadType;
    }

    if (streetStyles[roadType] !== undefined) {
      const speed = attributes.fwdMaxSpeed ?? attributes.revMaxSpeed; // If it remains null it does not have a speed limit
      // consoleDebug("Road Type: ", roadType);
      if (attributes.level > 0) {
        // it is a bridge
        // consoleDebug("Bridge");
        isBridge = true;
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': '#000000',
            'zIndex': baselevel + 100,
            'width': totalSegmentWidth,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      hasSpeedLimitDrawn = speed && preferences['showSLcolor'];
      // roadWidth: the width of the "inner" segment, without decorations around it
      if (hasSpeedLimitDrawn && isBridge) {
        // A bridge with speed limit
        roadWidth = totalSegmentWidth * 0.56;
      } else if (isBridge || hasSpeedLimitDrawn) {
        // A bridge without speed limit or a non-bridge with SL
        roadWidth = totalSegmentWidth * 0.68;
      }

      if (hasSpeedLimitDrawn) {
        // it has a speed limit
        // consoleDebug("SpeedLimit");

        const speedStrokeStyle =
          preferences['showDashedUnverifiedSL'] &&
            (attributes.fwdMaxSpeedUnverified || attributes.revMaxSpeedUnverified)
            ? 'dash'
            : 'solid';

        if (
          !preferences['showSLSinglecolor'] &&
          (attributes.fwdMaxSpeed || attributes.revMaxSpeed) &&
          attributes.fwdMaxSpeed !== attributes.revMaxSpeed &&
          !model.isOneWay()
        ) {
          // consoleDebug("The segment has 2 different speed limits");
          // It has 2 different speeds:
          const offset = isBridge
            ? totalSegmentWidth * 0.14
            : totalSegmentWidth * 0.22;
          //let { leftGeometry, rightGeometry } = shiftLR(pointList, offset);
          const left: OpenLayers.Geometry.Point[] = [];
          const right: OpenLayers.Geometry.Point[] = [];
          //For each pair of points...
          for (let k = 0; k < olPointArray.length - 1; k += 1) {
            const pk = olPointArray[k];
            const pk1 = olPointArray[k + 1];
            const dx = pk.x - pk1.x;
            const dy = pk.y - pk1.y;
            left[0] = pk.clone();
            right[0] = pk.clone();
            left[1] = pk1.clone();
            right[1] = pk1.clone();

            //console.log(offset);
            // offset = (totalSegmentWidth / 5.0) * (30.0 / (OLMap.zoom * OLMap.zoom)); //((Wmap.zoom+1)/11)+0.6*(1/(11-Wmap.zoom));// (10-Wmap.zoom/3)/(10-Wmap.zoom);
            // of2 = 11 * Math.pow(2.0, 5 - W.map.zoom);
            // console.error(of2);
            // console.log(offset);
            if (Math.abs(dx) < 0.5) {
              // segment is vertical
              if (dy > 0) {
                // console.error("A");
                left[0].move(-offset, 0);
                left[1].move(-offset, 0);
                right[0].move(offset, 0);
                right[1].move(offset, 0);
              } else {
                // console.error("B");
                left[0].move(offset, 0);
                left[1].move(offset, 0);
                right[0].move(-offset, 0);
                right[1].move(-offset, 0);
              }
            } else {
              const m = dy / dx;
              const mb = -1 / m;
              // consoleDebug("m: ", m);
              if (Math.abs(m) < 0.05) {
                // Segment is horizontal
                if (dx > 0) {
                  // console.error("C");
                  left[0].move(0, offset);
                  left[1].move(0, offset);
                  right[0].move(0, -offset);
                  right[1].move(0, -offset);
                } else {
                  // console.error("D");
                  left[0].move(0, -offset);
                  left[1].move(0, -offset);
                  right[0].move(0, offset);
                  right[1].move(0, offset);
                }
              } else {
                let appliedOffset = offset;
                if ((dy > 0 && dx > 0) || (dx < 0 && dy > 0)) {
                  // 1st and 4th q.
                  appliedOffset = -offset;
                }
                // console.log(offset);
                const temp = Math.sqrt(1 + mb * mb);
                // console.error("E");
                // console.dir(left[0]);
                left[0].move(appliedOffset / temp, appliedOffset * (mb / temp));
                // console.dir(left[0]);
                left[1].move(appliedOffset / temp, appliedOffset * (mb / temp));
                right[0].move(
                  -appliedOffset / temp,
                  -appliedOffset * (mb / temp)
                );
                right[1].move(
                  -appliedOffset / temp,
                  -appliedOffset * (mb / temp)
                );
              }
            }
            // consoleDebug("Adding 2 speeds");
            // consoleDebug(left);
            // consoleDebug(right);
            // N.B.: even if it looks inefficient, it is correct
            // that this is done for each section of the segment.
            lineFeature = new OpenLayers.Feature.Vector(
              new OpenLayers.Geometry.LineString(left),
              {
                'sID': attributes.id,
                'color': getColorStringFromSpeed(attributes.fwdMaxSpeed),
                'width': roadWidth,
                'dash': speedStrokeStyle,
                closeZoomOnly: true,
                'zIndex': baselevel + 105,
              }
            );
            segmentFeatures.push(lineFeature);
            lineFeature = new OpenLayers.Feature.Vector(
              new OpenLayers.Geometry.LineString(right),
              {
                'sID': attributes.id,
                'color': getColorStringFromSpeed(attributes.revMaxSpeed),
                'width': roadWidth,
                'dash': speedStrokeStyle,
                closeZoomOnly: true,
                'zIndex': baselevel + 110,
              }
            );
            segmentFeatures.push(lineFeature);
          }
        } else {
          // The segment is two way street with the same speed limit on both sides or one way street
          let speedValue = attributes.fwdMaxSpeed; // If the segment is two way, take any speed, they are equal.

          // If it is one way and the direction is the reverse one, take the other speed
          if (model.isOneWay() && attributes.revDirection) {
            speedValue = attributes.revMaxSpeed;
          }
          if (speedValue) {
            lineFeature = new OpenLayers.Feature.Vector(
              new OpenLayers.Geometry.LineString(olPointArray),
              {
                'sID': attributes.id,
                'color': getColorStringFromSpeed(speedValue),
                'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                'dash': speedStrokeStyle,
                closeZoomOnly: true,
                'zIndex': baselevel + 115,
              }
            );
            segmentFeatures.push(lineFeature);
          }
        }
      }

      // Draw the road
      lineFeature = new OpenLayers.Feature.Vector(
        new OpenLayers.Geometry.LineString(olPointArray),
        {
          'sID': attributes.id,
          'color': streetStyles[roadType]['strokeColor'],
          'width': roadWidth,
          'dash': streetStyles[roadType]['strokeDashstyle'],
          'zIndex': baselevel + 120,
        }
      );
      segmentFeatures.push(lineFeature);

      if (attributes.level < 0) {
        // Tunnel
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': '#000000',
            'width': roadWidth,
            'opacity': 0.3,
            'zIndex': baselevel + 125,
            // dash:"solid"
          }
        );
        segmentFeatures.push(lineFeature);
      }

      const currentLock = model.getLockRank() + 1;
      if (
        currentLock > preferences['fakelock'] ||
        currentLock > WazeWrap?.User?.Rank()
      ) {
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': nonEditableStyle.strokeColor,
            'width': roadWidth * 0.1,
            'dash': nonEditableStyle.strokeDashstyle,
            'zIndex': baselevel + 147,
          }
        );

        segmentFeatures.push(lineFeature);
      }

      const flags = model.getFlagAttributes();

      if (flags.unpaved) {
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': preferences['dirty']['strokeColor'],
            'width': roadWidth * 0.7,
            'opacity': preferences['dirty']['strokeOpacity'],
            'dash': preferences['dirty']['strokeDashstyle'],
            'zIndex': baselevel + 135,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      // Check segment properties

      // CLOSE Zoom properties
      if (attributes.hasClosures) {
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': preferences['closure']['strokeColor'],
            'width': roadWidth * 0.6,
            'dash': preferences['closure']['strokeDashstyle'],
            'opacity': preferences['closure']['strokeOpacity'],
            closeZoomOnly: true,
            'zIndex': baselevel + 140,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      if (
        attributes.fwdToll ||
        attributes.revToll ||
        attributes.restrictions.some((r) => r.getDefaultType() === 'TOLL')
      ) {
        // It is a toll road
        // consoleDebug("Segment is toll");
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': preferences['toll']['strokeColor'],
            'width': roadWidth * 0.3, // TODO preferences['toll']['strokeWidth'],
            'dash': preferences['toll']['strokeDashstyle'],
            'opacity': preferences['toll']['strokeOpacity'],
            'zIndex': baselevel + 145,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      if (isInRoundabout) {
        // It is a roundabout
        // consoleDebug("Segment is a roundabout");
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': roundaboutStyle.strokeColor,
            'width': roadWidth * 0.15,
            'dash': roundaboutStyle.strokeDashstyle,
            'opacity': roundaboutStyle.strokeOpacity,
            closeZoomOnly: true,
            'zIndex': baselevel + 150,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      if (attributes.restrictions.length > 0) {
        // It has restrictions
        // consoleDebug("Segment has restrictions");
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': preferences['restriction']['strokeColor'],
            'width': roadWidth * 0.4, // preferences['restriction']['strokeWidth'],
            'dash': preferences['restriction']['strokeDashstyle'],
            'opacity': preferences['restriction']['strokeOpacity'],
            closeZoomOnly: true,
            'zIndex': baselevel + 155,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      if (attributes.validated === false) {
        // Segments that needs validation
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': validatedStyle.strokeColor,
            'width': roadWidth * 0.5, // validatedStyle.strokeWidth,
            'dash': validatedStyle.strokeDashstyle,
            closeZoomOnly: true,
            'zIndex': baselevel + 160,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      if (flags.headlights) {
        segmentFeatures.push(
          new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString(olPointArray),
            {
              'sID': attributes.id,
              'color': preferences['headlights']['strokeColor'],
              'width': roadWidth * 0.2, // preferences['headlights']['strokeWidth'],
              'dash': preferences['headlights']['strokeDashstyle'],
              'opacity': preferences['headlights']['strokeOpacity'],
              closeZoomOnly: true,
              'zIndex': baselevel + 165,
            }
          )
        );
      }
      if (flags.nearbyHOV) {
        segmentFeatures.push(
          new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.LineString(olPointArray),
            {
              'sID': attributes.id,
              'color': preferences['nearbyHOV']['strokeColor'],
              'width': roadWidth * 0.25,
              'dash': preferences['nearbyHOV']['strokeDashstyle'],
              'opacity': preferences['nearbyHOV']['strokeOpacity'],
              closeZoomOnly: true,
              'zIndex': baselevel + 166,
            }
          )
        );
      }

      if (attributes.fwdLaneCount > 0) {
        // console.log("LANE fwd");
        const res = olPointArray.slice(-2);
        // if(pointList.length === 2){
        res[0] = new OpenLayers.Geometry.LineString([
          res[0],
          res[1],
        ]).getCentroid(true);
        // }
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(res),
          {
            'sID': attributes.id,
            'color': preferences['lanes']['strokeColor'],
            'width': roadWidth * 0.3,
            'dash': preferences['lanes']['strokeDashstyle'],
            'opacity': preferences['lanes']['strokeOpacity'],
            closeZoomOnly: true,
            'zIndex': baselevel + 170,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      if (attributes.revLaneCount > 0) {
        // console.log("LANE rev");
        const res = olPointArray.slice(0, 2);
        // if(pointList.length === 2){
        res[1] = new OpenLayers.Geometry.LineString([
          res[0],
          res[1],
        ]).getCentroid(true);
        // }
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(res),
          {
            'sID': attributes.id,
            'color': preferences['lanes']['strokeColor'],
            'width': roadWidth * 0.3,
            'dash': preferences['lanes']['strokeDashstyle'],
            'opacity': preferences['lanes']['strokeOpacity'],
            closeZoomOnly: true,
            'zIndex': baselevel + 175,
          }
        );
        segmentFeatures.push(lineFeature);
      }

      if (
        attributes.fwdDirection === false ||
        attributes.revDirection === false
      ) {
        // consoleDebug("The segment is oneway or has unknown direction");
        let simplifiedPoints = olPointArray;
        // N.B. attributes.length is the length in meters, not the items in the array (it's an object)
        if (
          !isInRoundabout &&
          attributes.length / olPointArray.length < preferences['arrowDeclutter']
        ) {
          simplifiedPoints = simplified;
        }

        if ((attributes.fwdDirection || attributes.revDirection) === false) {
          // Unknown direction
          for (let p = 0; p < simplifiedPoints.length - 1; p += 1) {
            // let shape = OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.LineString([simplifiedPoints[p],simplifiedPoints[p+1]]).getCentroid(true), 2, 6, 0); // origin, size, edges, rotation
            // Unknown direction
            segmentFeatures.push(
              new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.LineString([
                  simplifiedPoints[p],
                  simplifiedPoints[p + 1],
                ]).getCentroid(true),
                {
                  'sID': attributes.id,
                  closeZoomOnly: true,
                  isArrow: true,
                  'zIndex': baselevel + 180,
                },
                unknownDirStyle
              )
            );
          }
        } else {
          // It is one way, draw normal arrows

          const step = isInRoundabout ? 3 : 1;
          for (let p = step - 1; p < simplifiedPoints.length - 1; p += step) {
            const degrees = getAngle(
              attributes.fwdDirection,
              simplifiedPoints[p],
              simplifiedPoints[p + 1]
            );
            const segmentLineString = new OpenLayers.Geometry.LineString([
              simplifiedPoints[p],
              simplifiedPoints[p + 1],
            ]);
            segmentFeatures.push(
              new OpenLayers.Feature.Vector(
                segmentLineString.getCentroid(true),
                {
                  'sID': attributes.id,
                  closeZoomOnly: true,
                  isArrow: true,
                },
                {
                  'graphicName': 'myTriangle',
                  'rotation': degrees,
                  'stroke': true,
                  'strokeColor': '#000',
                  'graphicZIndex': baselevel + 180,
                  'strokeWidth': 1.5,
                  'fill': true,
                  'fillColor': '#fff',
                  'fillOpacity': 0.7,
                  'pointRadius': 5,
                }
              )
            );
          }
        }
      }

      if (flags.fwdSpeedCamera) {
        segmentFeatures.push(
          createAverageSpeedCamera({
            id: attributes.id,
            rev: false,
            isForward: attributes.fwdDirection,
            p0: olPointArray[0],
            p1: olPointArray[1],
          })
        );
      }

      if (flags.revSpeedCamera) {
        segmentFeatures.push(
          createAverageSpeedCamera({
            id: attributes.id,
            rev: true,
            isForward: attributes.fwdDirection,
            p0: olPointArray[olPointArray.length - 1],
            p1: olPointArray[olPointArray.length - 2],
          })
        );
      }

      // Show geometry points
      if (preferences['renderGeomNodes'] === true && !isInRoundabout) {
        // If it's not a roundabout
        for (let p = 1; p < olPointArray.length - 2; p += 1) {
          // let shape = OpenLayers.Geometry.Polygon.createRegularPolygon(points[p], 2, 6, 0); // origin, size, edges, rotation
          segmentFeatures.push(
            new OpenLayers.Feature.Vector(
              olPointArray[p],
              {
                'sID': attributes.id,
                'zIndex': baselevel + 200,
                closeZoomOnly: true,
                isArrow: true,
              },
              geometryNodeStyle
            )
          );
        }
      }
      // 'END': show geometry points
      // 'End': Close Zoom

      // In any 'Zoom':
      if (flags.tunnel) {
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': tunnelFlagStyle1.strokeColor,
            'opacity': tunnelFlagStyle1.strokeOpacity,
            'width': roadWidth * 0.3,
            'dash': tunnelFlagStyle1.strokeDashstyle,
            'zIndex': baselevel + 177,
          }
        );
        segmentFeatures.push(lineFeature);
        lineFeature = new OpenLayers.Feature.Vector(
          new OpenLayers.Geometry.LineString(olPointArray),
          {
            'sID': attributes.id,
            'color': tunnelFlagStyle2.strokeColor,
            'width': roadWidth * 0.1,
            'dash': tunnelFlagStyle2.strokeDashstyle,
            'zIndex': baselevel + 177,
          }
        );
        segmentFeatures.push(lineFeature);
      } // 'else': road type is not supported, just add the label
    }

    // Add Label
    const labels = drawLabels(model, simplified);
    return { segmentFeatures, labels };
  }

  /**
   *
   * @param {Waze.Feature.Vector.Node} model
   */
  function drawNode(model: Waze.Feature.Vector.Node): OpenLayers.Feature.Vector | null {
    if (model.getState() === 'DELETE') return null;
    const attributes = model.getAttributes();
    assertFeatureDoesNotExist(attributes.id, nodesVector);
    const geoPoints = model.getGeometry();
    const point = new OpenLayers.Geometry.Point(geoPoints.coordinates[0], geoPoints.coordinates[1]).transform(gmapsProjection, OLMap.projection);
    const pointFeature = new OpenLayers.Feature.Vector(
      point,
      {
        'sID': attributes.id,
      },
      getNodeStyle(attributes)
    );
    return pointFeature;
  }

  function rollbackPreferences() {
    loadPreferences();
    updateStylesFromPreferences(preferences);
    updatePreferenceValues();
    safeAlert('info', _('preferences_rollback'));
  }

  function exportPreferences() {
    GM_setClipboard(JSON.stringify(preferences));
    safeAlert('info', _('export_preferences_message'));
  }

  function importPreferences(e, pastedText) {
    if (pastedText !== null && pastedText !== '') {
      try {
        preferences = JSON.parse(pastedText);
      } catch (ex) {
        safeAlert('error', _('preferences_parsing_error'));
        return;
      }
      if (preferences !== null && preferences['streets']) {
        updateStylesFromPreferences(preferences);
        savePreferences(preferences);
        updatePreferenceValues();
        safeAlert('success', _('preferences_imported'));
      } else {
        safeAlert('error', 'preferences_importing_error');
      }
    }
  }

  const importPreferencesCallback = () => {
    WazeWrap.Alerts.prompt(
      GM_info.script.name,
      `${_('preferences_import_prompt')}\n\n${_(
        'preferences_import_prompt_2'
      )}`,
      '',
      importPreferences,
      null
    );
  };

  function updateLayerPosition(trial = 0) {
    const gpsLayer = W.map.getLayerByName('gps_points');
    if (gpsLayer) {
      const gpsLayerIndex = parseInt(gpsLayer.getZIndex(), 10);
      consoleDebug(`GPS Layer index: ${gpsLayerIndex}`);
      if (preferences['showUnderGPSPoints']) {
        streetVectorLayer.setZIndex(gpsLayerIndex - 20);
        nodesVector.setZIndex(gpsLayerIndex - 15);
      } else {
        streetVectorLayer.setZIndex(gpsLayerIndex + 15);
        nodesVector.setZIndex(gpsLayerIndex + 20);
      }
    } else {
      // The GPS layer is not available
      if (trial < 10) {
        consoleDebug('The GPS Layer was not available, trial ' + trial);
        setTimeout(() => {
          updateLayerPosition(++trial);
        }, 1000 * trial);
      }
    }
  }

  /**
   *
   * @param {{id:string,type:string,className:(string|undefined),title:(string|undefined)}} param0
   */
  function createInput({ id, type, className, title, min, max, step }: { id: string; type: string; className: (string | undefined); title: (string | undefined); min?: number; max?: number; step?: number; }) {
    const input = <HTMLInputElement>document.createElement('input');
    input.id = 'svl_' + id;
    if (className) {
      input.className = className;
    }
    if (title) {
      input.title = title;
    }
    input.type = type;
    if (type === 'range' || type === 'number') {
      input.min = min?.toString() || "";
      input.max = max?.toString() || "";
      input.step = step?.toString() || "";
    }
    return input;
  }

  function updateRoutingModePanel() {
    const ID = 'svl_routingModeDiv';
    const div = document.getElementById(ID);
    if (
      preferences['routingModeEnabled'] &&
      preferences['hideRoutingModeBlock'] !== true
    ) {
      if (div !== null) {
        //The panel already exists
        return;
      }
      // Show the routing panel
      let routingModeDiv = <HTMLDivElement>document.createElement('div');
      routingModeDiv.id = ID;
      routingModeDiv.className = 'routingDiv';
      routingModeDiv.innerHTML = `${_(
        'routing_mode_panel_title'
      )}<br><small>${_('routing_mode_panel_body')}<small>`;
      routingModeDiv.addEventListener('mouseenter', () => {
        // Temporary disable routing mode
        preferences['routingModeEnabled'] = false;
        redrawAllSegments();
        // doDraw();
      });
      routingModeDiv.addEventListener('mouseleave', () => {
        // Enable routing mode again
        preferences['routingModeEnabled'] = true;
        redrawAllSegments();
        //                doDraw();
      });
      document.getElementById('map').appendChild(routingModeDiv);
    } else {
      // Remove the routing panel
      div?.remove();
    }
  }

  function updateRefreshStatus() {
    clearInterval(autoLoadInterval);
    autoLoadInterval = null;
    if (preferences['autoReload'] && preferences['autoReload']['enabled']) {
      autoLoadInterval = setInterval(
        refreshWME,
        preferences['autoReload']['interval']
      );
    }
  }

  function handleWMESettingsUpdated(shouldRefresh = true) {
    let refreshRequested = false;
    const settings = wmeSDK.Settings.getUserSettings();
    if (settings.isImperial !== preferences['isImperial']) {
      preferences['isImperial'] = settings.isImperial;
      refreshRequested = true;
    }
    // Maybe in the future there will be more settings to check
    if (refreshRequested && shouldRefresh) {
      redrawAllSegments();
    }
  }

  function updateValuesFromPreferences() {
    (<HTMLButtonElement>document.getElementById('svl_saveNewPref')).classList.remove('disabled');
    (<HTMLButtonElement>document.getElementById('svl_saveNewPref')).disabled = false;
    (<HTMLButtonElement>document.getElementById('svl_saveNewPref')).classList.add('btn-primary');
    (<HTMLButtonElement>document.getElementById('svl_rollbackButton')).classList.remove('disabled');
    (<HTMLButtonElement>document.getElementById('svl_rollbackButton')).disabled = false;
    (<HTMLButtonElement>document.getElementById('svl_buttons')).classList.add('svl_unsaved');
    // $("#svl_saveNewPref").removeClass("btn-primary").addClass("btn-warning");

    const presetSelect = <HTMLSelectElement>document.getElementById('svl_presets');
    const presetValue = presetSelect.value;
    let presetApplied = false;
    if (presetValue === 'wme_colors') {
      presetApplied = true;
      preferences['streets'] = presets[presetValue]['streets'];
    }
    if (presetValue === 'svl_standard') {
      presetApplied = true;
      preferences['streets'] = presets[presetValue]['streets'];
    }
    if (presetApplied) {
      updateStreetsPreferenceValues();
      presetSelect.value = '';
      safeAlert('info', _('preset_applied'));
    } else {
      for (let i = 0; i < preferences['streets'].length; i += 1) {
        if (preferences['streets'][i]) {
          preferences['streets'][i] = {};
          preferences['streets'][i]['strokeColor'] = (<HTMLInputElement>document.getElementById(
            `svl_streetColor_${i}`
          )).value;
          preferences['streets'][i]['strokeWidth'] = (<HTMLInputElement>document.getElementById(
            `svl_streetWidth_${i}`
          )).value;
          preferences['streets'][i]['strokeDashstyle'] = (<HTMLInputElement>document.querySelector(
            `#svl_strokeDashstyle_${i} option:checked`
          )).value;
        }
      }
    }

    preferences['fakelock'] = (<HTMLInputElement>document.getElementById('svl_fakelock')).value;

    const type = wmeSDK.Settings.getUserSettings().isImperial === true ? 'imperial' : 'metric';
    const speeds = Object.keys(preferences['speeds'][type]);
    preferences['speeds'][type] = {};
    for (let i = 1; i < speeds.length + 1; i += 1) {
      const { value } = <HTMLInputElement>document.getElementById(`svl_slValue_${type}_${i}`);
      preferences['speeds'][type][value] = <HTMLInputElement>(document.getElementById(
        `svl_slColor_${type}_${i}`
      )).value;
    }

    preferences['speeds']['default'] = <HTMLInputElement>(document.getElementById(
      `svl_slColor_${type}_Default`
    )).value;

    // Red
    preferences['red'] = {};
    preferences['red']['strokeColor'] = document.getElementById(
      'svl_streetColor_red'
    ).value;
    preferences['red']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_red option:checked'
    ).value;

    // Dirty
    preferences['dirty'] = {};
    preferences['dirty']['strokeColor'] = document.getElementById(
      'svl_streetColor_dirty'
    ).value;
    preferences['dirty']['strokeOpacity'] =
      document.getElementById('svl_streetOpacity_dirty').value / 100.0;
    preferences['dirty']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_dirty option:checked'
    ).value;

    // Lanes
    preferences['lanes'] = {};
    preferences['lanes']['strokeColor'] = document.getElementById(
      'svl_streetColor_lanes'
    ).value;
    preferences['lanes']['strokeOpacity'] =
      document.getElementById('svl_streetOpacity_lanes').value / 100.0;
    preferences['lanes']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_lanes option:checked'
    ).value;

    // Toll
    preferences['toll'] = {};
    preferences['toll']['strokeColor'] = document.getElementById(
      'svl_streetColor_toll'
    ).value;
    preferences['toll']['strokeOpacity'] =
      document.getElementById('svl_streetOpacity_toll').value / 100.0;
    preferences['toll']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_toll option:checked'
    ).value;

    // Restrictions
    preferences['restriction'] = {};
    preferences['restriction']['strokeColor'] = document.getElementById(
      'svl_streetColor_restriction'
    ).value;
    preferences['restriction']['strokeOpacity'] =
      document.getElementById('svl_streetOpacity_restriction').value / 100.0;
    preferences['restriction']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_restriction option:checked'
    ).value;

    // Closures
    preferences['closure'] = {};
    preferences['closure']['strokeColor'] = document.getElementById(
      'svl_streetColor_closure'
    ).value;
    preferences['closure']['strokeOpacity'] =
      document.getElementById('svl_streetOpacity_closure').value / 100.0;
    preferences['closure']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_closure option:checked'
    ).value;

    // HeadlightsRequired
    preferences['headlights'] = {};
    preferences['headlights']['strokeColor'] = document.getElementById(
      'svl_streetColor_headlights'
    ).value;
    preferences['headlights']['strokeOpacity'] =
      document.getElementById('svl_streetOpacity_headlights').value / 100.0;
    preferences['headlights']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_headlights option:checked'
    ).value;

    // HeadlightsRequired
    preferences['nearbyHOV'] = {};
    preferences['nearbyHOV']['strokeColor'] = document.getElementById(
      'svl_streetColor_nearbyHOV'
    ).value;
    preferences['nearbyHOV']['strokeOpacity'] =
      document.getElementById('svl_streetOpacity_nearbyHOV').value / 100.0;
    preferences['nearbyHOV']['strokeDashstyle'] = document.querySelector(
      '#svl_strokeDashstyle_nearbyHOV option:checked'
    ).value;

    // AutoReload
    preferences['autoReload'] = {};
    preferences['autoReload']['interval'] =
      document.getElementById('svl_autoReload_interval').value * 1000;
    preferences['autoReload']['enabled'] = document.getElementById(
      'svl_autoReload_enabled'
    ).checked;

    preferences['clutterConstant'] = document.getElementById(
      'svl_clutterConstant'
    ).value;

    preferences['arrowDeclutter'] =
      document.getElementById('svl_arrowDeclutter').value;
    preferences['labelOutlineWidth'] = document.getElementById(
      'svl_labelOutlineWidth'
    ).value;
    preferences['disableRoadLayers'] = document.getElementById(
      'svl_disableRoadLayers'
    ).checked;
    preferences['startDisabled'] =
      document.getElementById('svl_startDisabled').checked;

    preferences['showSLtext'] =
      document.getElementById('svl_showSLtext').checked;
    preferences['showSLcolor'] =
      document.getElementById('svl_showSLcolor').checked;
    preferences['showSLSinglecolor'] = document.getElementById(
      'svl_showSLSinglecolor'
    ).checked;
    preferences['SLColor'] = document.getElementById('svl_SLColor').value;

    preferences['hideMinorRoads'] =
      document.getElementById('svl_hideMinorRoads').checked;
    preferences['showDashedUnverifiedSL'] = document.getElementById(
      'svl_showDashedUnverifiedSL'
    ).checked;
    preferences['farZoomLabelSize'] = document.getElementById(
      'svl_farZoomLabelSize'
    ).value;
    preferences['closeZoomLabelSize'] = document.getElementById(
      'svl_closeZoomLabelSize'
    ).value;

    preferences['renderGeomNodes'] = document.getElementById(
      'svl_renderGeomNodes'
    ).checked;

    preferences['nodesThreshold'] =
      document.getElementById('svl_nodesThreshold').value;
    preferences['segmentsThreshold'] = document.getElementById(
      'svl_segmentsThreshold'
    ).value;

    preferences['layerOpacity'] =
      document.getElementById('svl_layerOpacity').value / 100.0;

    // Check if showUnderGPSPoints has been toggled
    if (
      preferences['showUnderGPSPoints'] !==
      document.getElementById('svl_showUnderGPSPoints').checked
    ) {
      // This value has been updated, change the layer positions.
      preferences['showUnderGPSPoints'] = document.getElementById(
        'svl_showUnderGPSPoints'
      ).checked;
      updateLayerPosition();
    } else {
      preferences['showUnderGPSPoints'] = document.getElementById(
        'svl_showUnderGPSPoints'
      ).checked;
    }

    // Routing mode
    preferences['routingModeEnabled'] = document.getElementById(
      'svl_routingModeEnabled'
    ).checked;

    preferences['hideRoutingModeBlock'] = document.getElementById(
      'svl_hideRoutingModeBlock'
    ).checked;
    updateRoutingModePanel();
    // End: Routing mode

    preferences['useWMERoadLayerAtZoom'] = document.getElementById(
      'svl_useWMERoadLayerAtZoom'
    ).value;
    preferences['switchZoom'] = document.getElementById('svl_switchZoom').value;
    preferences['showANs'] = document.getElementById('svl_showANs').checked;
    preferences['realsize'] = document.getElementById('svl_realsize').checked;

    if (preferences['realsize']) {
      // Disable all width inputs
      $('input.segmentsWidth').prop('disabled', true);
    } else {
      $('input.segmentsWidth').prop('disabled', false);
    }

    //console.dir(preferences);
    updateStylesFromPreferences(preferences);
    updateRefreshStatus();
  }

  function saveNewPref() {
    updateValuesFromPreferences();
    savePreferences(preferences, false);
    updatePreferenceValues();
  }

  const resetPreferences = () => {
    consoleDebug('resetting preferences');
    saveDefaultPreferences();
    updateStylesFromPreferences(preferences);
    updatePreferenceValues();
    safeAlert('success', _('preferences_reset_message'));
  };

  function resetPreferencesCallback() {
    consoleDebug('rollbackDefault');
    WazeWrap.Alerts.confirm(
      GM_info.script.name,
      `${_('preferences_reset_question')}\n${_(
        'preferences_reset_question_2'
      )}`,
      resetPreferences,
      null,
      _('preferences_reset_yes'),
      _('preferences_reset_cancel')
    );
  }

  function createDropdownOption({ id, title, description, options, isNew }: { id: string, title: string, description: string, options: { text: string; value: string }[], isNew?: string }) {
    const line = <HTMLDivElement>document.createElement('div');
    line.className = 'prefLineSelect';
    if (typeof isNew === 'string') {
      line.classList.add('newOption');
      line.dataset.version = isNew;
    }

    const newSelect = <HTMLSelectElement>document.createElement('select');
    newSelect.className = 'prefElement';

    const label = <HTMLLabelElement>document.createElement('label');
    label.innerText = title;
    newSelect.id = `svl_${id}`;
    if (options && options.length > 0) {
      options.forEach((o) => {
        const option = <HTMLOptionElement>document.createElement('option');
        option.text = o.text;
        option.value = o.value;
        newSelect.add(option);
      });
    }
    const i = document.createElement('i');
    i.innerText = description;
    line.appendChild(label);
    line.appendChild(i);
    line.appendChild(newSelect);
    return line;
  }

  function createDashStyleDropdown(id: string) {
    const newSelect = <HTMLSelectElement>document.createElement('select');
    newSelect.className = 'prefElement';
    newSelect.title = 'Stroke style';
    newSelect.id = `svl_${id}`;
    newSelect.innerHTML = `<option value="solid">${_('line_solid')}</option>
       <option value="dash">${_('line_dash')}</option>
       <option value="dashdot">${_('line_dashdot')}</option>
       <option value="longdash">${_('line_longdash')}</option>
       <option value="longdashdot">${_('line_longdashdot')}</option>
       <option value="dot">${_('line_dot')}</option>`;
    return newSelect;
  }

  function getLocalisedString(i: (string | number)) {
    const locale = I18n.translations[I18n.locale];
    switch (i) {
      case 'red':
        return locale?.['segment']?.['address']?.['none'] ?? i;
      case 'toll':
        return locale?.['edit']?.['segment']?.['fields']?.['toll_road'] ?? i;
      case 'restriction':
        return (
          locale?.['restrictions']?.['modal_headers']?.[
          'restriction_summary'
          ] ?? i
        );
      case 'dirty':
        return locale?.['edit']?.['segment']?.['fields']?.['unpaved'] ?? i;
      case 'closure':
        return locale?.['objects']?.['roadClosure']?.['name'] ?? i;
      case 'headlights':
        return locale?.['edit']?.['segment']?.['fields']?.['headlights'] ?? i;
      case 'lanes':
        return locale?.['objects']?.['lanes']?.['title'] ?? i;
      case 'speed limit':
        return locale?.['edit']?.['segment']?.['fields']?.['speed_limit'] ?? i;
      case 'nearbyHOV':
        return locale?.['edit']?.['segment']?.['fields']?.['nearbyHOV'] ?? i;
      default:
    }
    return locale?.['segment']?.['road_types'][i] ?? i; // jshint ignore:line
  }

  function createStreetOptionLine({
    i,
    showWidth = true,
    showOpacity = false,
  }: { i: (string | number), showWidth?: boolean, showOpacity?: boolean }) {
    const title = document.createElement('h6');
    title.innerText = getLocalisedString(i);

    const color = createInput({
      id: `streetColor_${i}`,
      className: 'prefElement form-control',
      title: _('color'),
      type: 'color',
    });
    color.style['width'] = '55pt';

    const inputs = document.createElement('div');

    if (showWidth) {
      const width = createInput({
        id: `streetWidth_${i}`,
        type: 'number',
        title: `${_('width')} (${_('width_disabled')})`,
        className: Number.isInteger(i)
          ? 'form-control prefElement segmentsWidth'
          : 'form-control prefElement',
        min: 1,
        max: 20,
        step: 1,
      });
      width.style['width'] = '40pt';
      inputs.appendChild(width);
    }

    if (showOpacity) {
      const opacity = createInput({
        id: `streetOpacity_${i}`,
        className: 'form-control prefElement',
        title: _('opacity'),
        type: 'number',
        min: 0,
        max: 100,
        step: 10,
      });
      opacity.style['width'] = '45pt';
      inputs.appendChild(opacity);
    }

    const select = createDashStyleDropdown(`strokeDashstyle_${i}`);
    select.className = 'form-control prefElement';

    inputs.className = 'expand';
    inputs.appendChild(color);
    inputs.appendChild(select);

    const line = document.createElement('div');
    line.className = 'prefLineStreets';
    line.appendChild(title);
    line.appendChild(inputs);

    return line;
  }

  function createSpeedOptionLine(i: (number | string), metric = true) {
    const type = metric ? 'metric' : 'imperial';
    // const title = document.createElement("h6");
    // title.innerText = getLocalisedString("speed limit");
    // title.inner
    const label = document.createElement('label');
    label.innerText = i !== -1 ? String(i) : 'Default';

    const inputs = document.createElement('div');
    inputs.appendChild(label);

    if (typeof i === 'number') {
      const slValue = createInput({
        id: `slValue_${type}_${i}`,
        className: 'form-control prefElement',
        title: _('speed_limit_value'),
        type: 'number',
        min: 0,
        max: 150,
        step: 1,
      });
      slValue.style['width'] = '50pt';
      inputs.appendChild(slValue);

      const span = document.createElement('span');
      span.innerText = metric ? _('kmh') : _('mph');
      inputs.appendChild(span);
    }

    const color = createInput({
      id: `slColor_${type}_${i}`,
      className: 'prefElement form-control',
      type: 'color',
      title: _('color'),
    });
    color.style['width'] = '55pt';

    inputs.className = 'expand';
    inputs.appendChild(color);

    const line = document.createElement('div');
    line.className = `svl_${type} prefLineSL`;
    line.appendChild(inputs);

    return line;
  }

  function getOptions() {
    return {
      'streets': ['red'],
      'decorations': [
        'lanes',
        'toll',
        'restriction',
        'closure',
        'headlights',
        'dirty',
        'nearbyHOV',
      ],
    };
  }

  function updateStreetsPreferenceValues() {
    for (let i = 0; i < preferences['streets'].length; i += 1) {
      if (preferences['streets'][i]) {
        document.getElementById(`svl_streetWidth_${i}`).value =
          preferences['streets'][i]['strokeWidth'];
        document.getElementById(`svl_streetColor_${i}`).value =
          preferences['streets'][i]['strokeColor'];
        document.getElementById(`svl_strokeDashstyle_${i}`).value =
          preferences['streets'][i]['strokeDashstyle'];
      }
    }
  }

  /**
   * This function updates the values shown on the preference panel with the one saved in the preferences object.
   *
   */
  function updatePreferenceValues() {
    const saveNewButton = <HTMLButtonElement>document.getElementById('svl_saveNewPref');
    saveNewButton.classList.add('disabled');
    saveNewButton.disabled = true;
    saveNewButton.classList.remove('btn-primary');

    const rollbackButton = <HTMLButtonElement>document.getElementById('svl_rollbackButton');
    rollbackButton.classList.add('disabled');
    rollbackButton.disabled = true;
    document.getElementById('svl_buttons').classList.remove('svl_unsaved');
    updateStreetsPreferenceValues();

    const options = getOptions();
    options['streets'].forEach((o) => {
      if (o !== 'red') {
        (<HTMLInputElement>document.getElementById(`svl_streetWidth_${o}`)).value =
          preferences[o]['strokeWidth'];
      }
      document.getElementById(`svl_streetColor_${o}`).value =
        preferences[o]['strokeColor'];
      document.getElementById(`svl_strokeDashstyle_${o}`).value =
        preferences[o]['strokeDashstyle'];
    });

    options['decorations'].forEach((o) => {
      if (
        [
          'dirty',
          'lanes',
          'toll',
          'restriction',
          'closure',
          'headlights',
          'nearbyHOV',
        ].includes(o)
      ) {
        document.getElementById(`svl_streetOpacity_${o}`).value =
          preferences[o]['strokeOpacity'] * 100.0;
      } else {
        document.getElementById(`svl_streetWidth_${o}`).value =
          preferences[o]['strokeWidth'];
      }
      document.getElementById(`svl_streetColor_${o}`).value =
        preferences[o]['strokeColor'];
      document.getElementById(`svl_strokeDashstyle_${o}`).value =
        preferences[o]['strokeDashstyle'];
    });

    document.getElementById('svl_fakelock').value = WazeWrap?.User?.Rank() ?? 7;
    document.getElementById('svl_autoReload_enabled').checked =
      preferences['autoReload']['enabled'];
    document.getElementById('svl_renderGeomNodes').checked =
      preferences['renderGeomNodes'];
    document.getElementById('svl_labelOutlineWidth').value =
      preferences['labelOutlineWidth'];
    document.getElementById('svl_hideMinorRoads').checked =
      preferences['hideMinorRoads'];
    document.getElementById('svl_autoReload_interval').value =
      preferences['autoReload']['interval'] / 1000;

    document.getElementById('svl_clutterConstant').value =
      preferences['clutterConstant'];
    document.getElementById('svl_closeZoomLabelSize').value =
      preferences['closeZoomLabelSize'];
    document.getElementById('svl_farZoomLabelSize').value =
      preferences['farZoomLabelSize'];
    document.getElementById('svl_arrowDeclutter').value =
      preferences['arrowDeclutter'];
    document.getElementById('svl_useWMERoadLayerAtZoom').value =
      preferences['useWMERoadLayerAtZoom'];
    document.getElementById('svl_switchZoom').value = preferences['switchZoom'];
    document.getElementById('svl_nodesThreshold').value =
      preferences['nodesThreshold'];
    document.getElementById('svl_segmentsThreshold').value =
      preferences['segmentsThreshold'];

    document.getElementById('svl_disableRoadLayers').checked =
      preferences['disableRoadLayers'];
    document.getElementById('svl_startDisabled').checked =
      preferences['startDisabled'];
    document.getElementById('svl_showUnderGPSPoints').checked =
      preferences['showUnderGPSPoints'];
    document.getElementById('svl_routingModeEnabled').checked =
      preferences['routingModeEnabled'];
    (<HTMLInputElement>document.getElementById('svl_hideRoutingModeBlock')).checked =
      preferences['hideRoutingModeBlock'];
    (<HTMLInputElement>document.getElementById('svl_showANs')).checked = preferences['showANs'];

    (<HTMLInputElement>document.getElementById('svl_layerOpacity')).value =
      String(preferences['layerOpacity'] * 100);

    // Speed limits
    document.getElementById('svl_showSLtext').checked =
      preferences['showSLtext'];
    document.getElementById('svl_showSLcolor').checked =
      preferences['showSLcolor'];
    document.getElementById('svl_showSLSinglecolor').checked =
      preferences['showSLSinglecolor'];
    document.getElementById('svl_showDashedUnverifiedSL').checked =
      preferences['showDashedUnverifiedSL'];
    document.getElementById('svl_SLColor').value = preferences['SLColor'];
    document.getElementById('svl_realsize').checked = preferences['realsize'];

    const segmentWidths = document.querySelectorAll('.segmentsWidth');
    segmentWidths.forEach((el) => {
      el.disabled = preferences['realsize'];
    });

    // Toggle metric/decimal
    const WMEUsesImperial = W.prefs.attributes['isImperial'];
    const type = WMEUsesImperial ? 'imperial' : 'metric';
    const speeds = Object.keys(preferences['speeds'][type]);
    const slLinesToHide = document.querySelectorAll(
      WMEUsesImperial ? '.svl_metric' : '.svl_imperial'
    );
    slLinesToHide.forEach((el) => {
      el.style.display = 'none';
    });
    const slLinesToShow = document.querySelectorAll(`.svl_${type}`);
    slLinesToShow.forEach((el) => {
      el.style.display = 'block';
    });
    for (let i = 1; i < speeds.length + 1; i += 1) {
      document.getElementById(`svl_slValue_${type}_${i}`).value = speeds[i - 1];
      document.getElementById(`svl_slColor_${type}_${i}`).value =
        preferences['speeds'][type][speeds[i - 1]];
    }

    document.getElementById(`svl_slColor_${type}_Default`).value =
      preferences['speeds']['default'];
  }

  /**
   *
   * @param {{id:string,title:string,description:string,isNew:(string|undefined)}} param0
   */
  function createCheckboxOption({ id, title, description, isNew }: { id: string; title: string; description: string; isNew?: (string | undefined); }) {
    const line = document.createElement('div');
    line.className = 'prefLineCheckbox';
    if (typeof isNew === 'string') {
      line.classList.add('newOption');
      line.dataset.version = isNew;
    }
    const label = document.createElement('label');
    label.innerText = title;

    const input = createInput({
      id,
      className: 'prefElement',
      type: 'checkbox',
      title: _('true_or_false'),
    });

    label.appendChild(input);
    line.appendChild(label);

    const i = document.createElement('i');
    i.innerText = description;
    line.appendChild(i);

    return line;
  }

  /**
   *
   * @param {{id:string,title:string,description:string,min:number,max:number,step:(number|undefined),isNew:(string|undefined)}} param0
   */
  function createIntegerOption({
    id,
    title,
    description,
    min,
    max,
    step,
    isNew,
  }: { id: string; title: string; description: string; min: number; max: number; step: (number | undefined); isNew?: (string | undefined); }) {
    const line = document.createElement('div');
    line.className = 'prefLineInteger';
    if (typeof isNew === 'string') {
      line.classList.add('newOption');
      line.dataset.version = isNew;
    }
    const label = document.createElement('label');
    label.innerText = title;

    const input = createInput({
      id,
      min,
      max,
      step,
      type: 'number',
      title: _('insert_number'),
      className: 'prefElement form-control',
    });

    label.appendChild(input);
    line.appendChild(label);

    if (description) {
      const i = document.createElement('i');
      i.innerText = description;
      line.appendChild(i);
    }

    return line;
  }

  /**
   *
   * @param {{id:string,title:string,description:string,min:number,max:number,step:(number|undefined),isNew:(string|undefined)}} param0
   */
  function createRangeOption({
    id,
    title,
    description,
    min,
    max,
    step,
    isNew,
  }: { id: string; title: string; description: string; min: number; max: number; step?: (number | undefined); isNew?: (string | undefined); }) {
    const line = document.createElement('div');
    line.className = 'prefLineSlider';
    if (typeof isNew === 'string') {
      line.classList.add('newOption');
      line.dataset.version = isNew;
    }
    const label = document.createElement('label');
    label.innerText = title;

    const input = createInput({
      id,
      min,
      max,
      step,
      title: _('pick_a_value_slider'),
      className: 'prefElement form-control',
      type: 'range',
    });

    label.appendChild(input);
    line.appendChild(label);

    if (description) {
      const i = document.createElement('i');
      i.innerText = description;
      line.appendChild(i);
    }

    return line;
  }

  function createPreferencesSection(name: string, open = false) {
    const details = document.createElement('details');
    details.open = open;
    const summary = document.createElement('summary');
    summary.innerText = name;
    details.appendChild(summary);
    return details;
  }

  async function initPreferencePanel() {
    //console.debug('Init Preference Panel');
    const style = <HTMLStyleElement>document.createElement('style');
    style['innerHTML'] = `.svl_unsaved{background-color:#ffcc00 !important;}
        .expand{display:flex; width:100%; justify-content:space-around;align-items: center;}
        .prefLineSelect{width:100%; margin-bottom:1vh;}
        .prefLineSelect label{display:block;width:100%}
        .prefLineCheckbox{width:100%; margin-bottom:1vh;}
        .prefLineCheckbox label{display:block;width:100%;}
        .prefLineCheckbox input{float:right;}
        .prefLineInteger{width:100%; margin-bottom:1vh;}
        .prefLineInteger label{display:block;width:100%}
        .prefLineInteger input{float:right;}
        .prefLineSlider {width:100%; margin-bottom:1vh;}
        .prefLineSlider label{display:block;width:100%}
        .prefLineSlider input{float:right;}
        .newOption::before {content:"${_('new_since_version')} " attr(data-version)"!"; font-weight:bolder; color:#e65c00;}
        .newOption{border:1px solid #ff9900; padding: 1px; box-shadow: 2px 3px #cc7a00;}
        .svl_logo {width:130px; display:inline-block; float:right}
        .svl_support-link{display:inline-block; width:100%; text-align:center;}
        .svl_translationblock{display:inline-block; width:100%; text-align:center; font-size:x-small}
        .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:#fff; top:0; }
        .routingDiv{opacity: 0.95; font-size:1.2em; color:#ffffff; border:0.2em #000 solid; position:absolute; top:3em; right:3.7em; padding:0.5em; background-color:#b30000;}
        .routingDiv:hover{background-color:#ff3377;}
        #sidepanel-svl summary{font-weight:bold; margin:10px;}
        #sidepanel-svl {width:98%;}
        #sidepanel-svl details{margin-bottom:9pt;}
        #sidepanel-svl i{font-size:small;}`;

    document.body.appendChild(style);
    const panelDiv = document.createElement('div');
    const mainDiv = document.createElement('div');
    mainDiv.id = 'sidepanel-svl';
    panelDiv.append(mainDiv);

    const logo = document.createElement('img');
    logo.className = 'svl_logo';
    logo.src = 'https://raw.githubusercontent.com/bedo2991/svl/master/logo.png';
    logo.alt = _('svl_logo');
    mainDiv.appendChild(logo);

    const spanThanks = document.createElement('span');
    spanThanks.innerText = _('thanks_for_using');
    mainDiv.appendChild(spanThanks);

    const svlTitle = document.createElement('h4');
    svlTitle.innerText = 'Street Vector Layer';
    mainDiv.appendChild(svlTitle);

    const spanVersion = document.createElement('span');
    spanVersion.innerText = `${_('version')} ${SVL_VERSION}`;
    mainDiv.appendChild(spanVersion);

    const supportForum = document.createElement('a');
    supportForum.innerText = `${_('something_not_working')} ${_(
      'report_it_here'
    )}.`;
    supportForum.href = GM_info.script.supportURL;
    supportForum.target = '_blank';
    supportForum.className = 'svl_support-link';
    mainDiv.appendChild(supportForum);

    const translationMessage = document.createElement('div');
    translationMessage.className = 'svl_translationblock';
    if (_('language_code') === I18n.currentLocale()) {
      //Translations are available for this language
      const translationPercentage = _('completition_percentage');
      if (translationPercentage === '100%') {
        translationMessage.innerText = `${_('fully_translated_in')} ${_(
          'translated_by'
        )}`;
      } else {
        translationMessage.innerHTML = `${translationPercentage} ${_(
          'translation_thanks'
        )} ${_(
          'translated_by'
        )}. <a href="https://www.waze.com/forum/viewtopic.php?f=819&t=149535&start=310#p2114167" target="_blank">${_(
          'would_you_like_to_help'
        )}</a>`;
      }
    } else {
      if (onlineTranslations) {
        //Call for action
        //No need to translate this.
        translationMessage.innerHTML = `<b style="color:red">Unfortunately, SVL is not yet available in your language. Would you like to help translating?<br><a href="https://www.waze.com/forum/viewtopic.php?f=819&t=149535&start=310#p2114167" target="_blank">Please contact bedo2991</a>.</b>`;
      } else {
        translationMessage.innerHTML = `<b style="color:#8b0000">An error occurred while fetching the translations. If it persists, please report it on the Waze forum.</b>`;
      }
    }
    mainDiv.appendChild(translationMessage);

    // mainDiv.id = "svl_PrefDiv";

    const saveButton = document.createElement('button');
    saveButton.id = 'svl_saveNewPref';
    saveButton.type = 'button';
    saveButton.className = 'btn disabled waze-icon-save';
    saveButton.innerText = _('save');
    saveButton.title = _('save_help');

    const rollbackButton = document.createElement('button');
    rollbackButton.id = 'svl_rollbackButton';
    rollbackButton.type = 'button';
    rollbackButton.className = 'btn btn-default disabled';
    rollbackButton.innerText = _('rollback');
    rollbackButton.title = _('rollback_help');

    const resetButton = document.createElement('button');
    resetButton.id = 'svl_resetButton';
    resetButton.type = 'button';
    resetButton.className = 'btn btn-default';
    resetButton.innerText = _('reset');
    resetButton.title = _('reset_help');

    const buttons = document.createElement('div');
    buttons.id = 'svl_buttons';
    buttons.className = 'svl_buttons expand';
    buttons.appendChild(saveButton);
    buttons.appendChild(rollbackButton);
    buttons.appendChild(resetButton);

    mainDiv.appendChild(buttons);

    const streets = createPreferencesSection(_('roads_properties'), true);

    streets.appendChild(
      createCheckboxOption({
        id: 'realsize',
        title: _('use_reallife_width'),
        description: _('use_reallife_width_descr'),
        isNew: '5.0.0',
      })
    );

    streets.appendChild(
      createDropdownOption({
        id: 'presets',
        title: _('road_themes_title'),
        description: _('road_themes_descr'),
        options: [
          { 'text': '', 'value': '' },
          { 'text': _('svl_standard_layer'), 'value': 'svl_standard' },
          { 'text': _('wme_colors_layer'), 'value': 'wme_colors' },
        ],
        isNew: '5.0.8',
      })
    );

    for (let i = 0; i < preferences['streets'].length; i += 1) {
      if (preferences['streets'][i]) {
        streets.appendChild(
          createStreetOptionLine({ i, showWidth: true, showOpacity: false })
        );
      }
    }

    const decorations = createPreferencesSection(_('segments_decorations'));

    const renderingParameters = createPreferencesSection(
      _('rendering_parameters')
    );

    const performance = createPreferencesSection(_('performance_tuning'));

    const speedLimits = createPreferencesSection(_('speed_limits'));

    const options = getOptions();
    options['streets'].forEach((o) => {
      if (o !== 'red') {
        streets.appendChild(
          createStreetOptionLine({
            i: o,
            showWidth: true,
            showOpacity: false,
          })
        );
      } else {
        streets.appendChild(
          createStreetOptionLine({
            i: o,
            showWidth: false,
            showOpacity: false,
          })
        );
      }
    });

    decorations.appendChild(
      createStreetOptionLine({
        i: 'lanes',
        showWidth: false,
        showOpacity: true,
      })
    );
    decorations.appendChild(
      createStreetOptionLine({
        i: 'toll',
        showWidth: false,
        showOpacity: true,
      })
    );
    decorations.appendChild(
      createStreetOptionLine({
        i: 'restriction',
        showWidth: false,
        showOpacity: true,
      })
    );
    decorations.appendChild(
      createStreetOptionLine({
        i: 'closure',
        showWidth: false,
        showOpacity: true,
      })
    );
    decorations.appendChild(
      createStreetOptionLine({
        i: 'headlights',
        showWidth: false,
        showOpacity: true,
      })
    );
    decorations.appendChild(
      createStreetOptionLine({
        i: 'dirty',
        showWidth: false,
        showOpacity: true,
      })
    );
    decorations.appendChild(
      createStreetOptionLine({
        i: 'nearbyHOV',
        showWidth: false,
        showOpacity: true,
      })
    );

    /* options.decorations.forEach((o) => {
      if (o !== 'dirty') {
        if (o === 'red') {
          decorations.appendChild(createStreetOptionLine(o, false));
        } else {
          decorations.appendChild(createStreetOptionLine(o));
        }
      } else {
        decorations.appendChild(createStreetOptionLine(o, false, true));
      }
    }); */

    streets.appendChild(decorations);

    streets.appendChild(
      createCheckboxOption({
        id: 'showANs',
        title: _('show_ans'),
        description: _('show_ans_descr'),
      })
    );

    mainDiv.appendChild(streets);

    renderingParameters.appendChild(
      createIntegerOption({
        id: 'layerOpacity',
        title: _('layer_opacity'),
        description: _('layer_opacity_descr'),
        min: 10,
        max: 100,
        step: 5,
        isNew: '5.0.6',
      })
    );

    renderingParameters.appendChild(
      createCheckboxOption({
        id: 'routingModeEnabled',
        title: _('enable_routing_mode'),
        description: _('enable_routing_mode_descr'),
      })
    );

    renderingParameters.appendChild(
      createCheckboxOption({
        id: 'hideRoutingModeBlock',
        title: _('hide_routing_mode_panel'),
        description: _('hide_routing_mode_panel_descr'),
        isNew: '5.0.9',
      })
    );

    renderingParameters.appendChild(
      createCheckboxOption({
        id: 'showUnderGPSPoints',
        title: _('gps_layer_above_roads'),
        description: _('gps_layer_above_roads_descr'),
      })
    );

    streets.appendChild(
      createRangeOption({
        id: 'labelOutlineWidth',
        title: _('label_width'),
        description: _('label_width_descr'),
        min: 0,
        max: 10,
        step: 1,
      })
    );

    renderingParameters.appendChild(
      createCheckboxOption({
        id: 'disableRoadLayers',
        title: _('hide_road_layer'),
        description: _('hide_road_layer_descr'),
      })
    );

    renderingParameters.appendChild(
      createCheckboxOption({
        id: 'startDisabled',
        title: _('svl_initially_disabled'),
        description: _('svl_initially_disabled_descr'),
      })
    );

    renderingParameters.appendChild(
      createRangeOption({
        id: 'clutterConstant',
        title: _('street_names_density'),
        description: _('street_names_density_descr'),
        min: 1,
        max: clutterMax,
        step: 1,
      })
    );

    const closeZoomTitle = document.createElement('h5');
    closeZoomTitle.innerText = _('close_zoom_only');

    renderingParameters.appendChild(closeZoomTitle);

    renderingParameters.appendChild(
      createCheckboxOption({
        id: 'renderGeomNodes',
        title: _('render_geometry_nodes'),
        description: _('render_geometry_nodes_descr'),
      })
    );

    renderingParameters.appendChild(
      createIntegerOption({
        id: 'fakelock',
        title: _('render_as_level'),
        description: _('render_as_level_descr'),
        min: 1,
        max: 7,
        step: 1,
      })
    );

    renderingParameters.appendChild(
      createRangeOption({
        id: 'closeZoomLabelSize',
        title: _('font_size_close'),
        description: _('font_size_close_descr'),
        min: 8,
        max: fontSizeMax,
        step: 1,
      })
    );

    renderingParameters.appendChild(
      createRangeOption({
        id: 'arrowDeclutter',
        title: _('limit_arrows'),
        description: _('limit_arrows_descr'),
        min: 1,
        max: 200,
        step: 1,
      })
    );

    const farZoomTitle = document.createElement('h5');
    farZoomTitle.innerText = _('far_zoom_only');
    renderingParameters.appendChild(farZoomTitle);

    renderingParameters.appendChild(
      createRangeOption({
        id: 'farZoomLabelSize',
        title: _('font_size_far'),
        description: _('font_size_far_descr'),
        min: 8,
        max: fontSizeMax,
      })
    );

    renderingParameters.appendChild(
      createCheckboxOption({
        id: 'hideMinorRoads',
        title: _('hide_minor_roads'),
        description: _('hide_minor_roads_descr'),
      })
    );

    mainDiv.appendChild(renderingParameters);

    const utilities = createPreferencesSection(_('utilities'));

    utilities.appendChild(
      createCheckboxOption({
        id: 'autoReload_enabled',
        title: _('automatically_refresh'),
        description: _('automatically_refresh_descr'),
      })
    );

    utilities.appendChild(
      createIntegerOption({
        id: 'autoReload_interval',
        title: _('autoreload_interval'),
        description: _('autoreload_interval_descr'),
        min: 20,
        max: 3600,
        step: 1,
      })
    );
    mainDiv.appendChild(utilities);

    // Performance settings

    performance.appendChild(
      createIntegerOption({
        id: 'useWMERoadLayerAtZoom',
        title: _('stop_svl_at_zoom'),
        description: _('stop_svl_at_zoom_descr'),
        min: 12,
        max: 17,
        step: 1,
      })
    );

    performance.appendChild(
      createIntegerOption({
        id: 'switchZoom',
        title: _('close_zoom_until_level'),
        description: _('close_zoom_until_level_descr'),
        min: 17,
        max: 21,
        step: 1,
      })
    );

    performance.appendChild(
      createIntegerOption({
        id: 'segmentsThreshold',
        title: _('segments_threshold'),
        description: _('segments_threshold_descr'),
        min: 1000,
        max: 10000,
        step: 100,
        isNew: '5.0.4',
      })
    );

    performance.appendChild(
      createIntegerOption({
        id: 'nodesThreshold',
        title: _('nodes_threshold'),
        description: _('nodes_threshold_descr'),
        min: 1000,
        max: 10000,
        step: 100,
        isNew: '5.0.4',
      })
    );
    mainDiv.appendChild(performance);

    speedLimits.appendChild(
      createCheckboxOption({
        id: 'showSLtext',
        title: _('show_sl_on_name'),
        description: _('show_sl_on_name_descr'),
      })
    );

    speedLimits.appendChild(
      createCheckboxOption({
        id: 'showSLcolor',
        title: _('show_sl_with_colors'),
        description: _('show_sl_with_colors_descr'),
      })
    );

    /*
        for (let k = W.prefs.attributes['isImperial'] ? 9 : 15; k > 1; k -= 1) {
            const span = document.createElement("span");
            if (W.prefs.attributes['isImperial']) {
                span.style['color'] = getColorStringFromSpeed((k * 10 - 5) * 1.609344);
                span.innerText = k * 10 - 5;
            } else {
                span.style['color'] = getColorStringFromSpeed(k * 10);
                span.innerText = k * 10;
            }
            span.style['marginRight'] = "1pt";
            speedLimits.appendChild(span);
        } */

    speedLimits.appendChild(
      createCheckboxOption({
        id: 'showSLSinglecolor',
        title: _('show_sl_with_one_color'),
        description: _('show_sl_with_one_color_descr'),
      })
    );

    const colorPicker = createInput({
      id: 'SLColor',
      type: 'color',
      className: 'prefElement form-control',
    });
    speedLimits.appendChild(colorPicker);

    speedLimits.appendChild(
      createCheckboxOption({
        id: 'showDashedUnverifiedSL',
        title: _('show_unverified_dashed'),
        description: _('show_unverified_dashed_descr'),
      })
    );

    const slTitle = document.createElement('h6');
    slTitle.innerText = getLocalisedString('speed limit');
    speedLimits.appendChild(slTitle);

    //Metric
    let type = 'metric';
    speedLimits.appendChild(createSpeedOptionLine('Default', true));
    for (
      let i = 1;
      i < Object.keys(preferences['speeds'][type]).length + 1;
      i += 1
    ) {
      speedLimits.appendChild(createSpeedOptionLine(i, true));
    }

    type = 'imperial';
    speedLimits.appendChild(createSpeedOptionLine('Default', false));
    for (
      let i = 1;
      i < Object.keys(preferences['speeds'][type]).length + 1;
      i += 1
    ) {
      speedLimits.appendChild(createSpeedOptionLine(i, false));
    }

    mainDiv.appendChild(speedLimits);

    const subTitle = document.createElement('h5');
    subTitle.innerText = _('settings_backup');
    mainDiv.appendChild(subTitle);

    const utilityButtons = document.createElement('div');
    utilityButtons.className = 'expand';

    const exportButton = document.createElement('button');
    exportButton.id = 'svl_exportButton';
    exportButton.type = 'button';
    exportButton.innerText = _('export');
    exportButton.className = 'btn btn-default';

    const importButton = document.createElement('button');
    importButton.id = 'svl_importButton';
    importButton.type = 'button';
    importButton.innerText = _('import');
    importButton.className = 'btn btn-default';

    utilityButtons.appendChild(importButton);
    utilityButtons.appendChild(exportButton);
    mainDiv.appendChild(utilityButtons);

    const { tabLabel, tabPane } = await wmeSDK.Sidebar.registerScriptTab();
    tabLabel.innerText = 'SVL 🗺️';
    tabLabel.title = 'Street Vector Layer';

    tabPane.innerHTML = panelDiv.innerHTML;
    // Add event listeners
    const prefElements = document.querySelectorAll('.prefElement');
    prefElements.forEach((element) => {
      element.addEventListener('change', updateValuesFromPreferences);
    });

    (<HTMLButtonElement>document
      .getElementById('svl_saveNewPref')
    ).addEventListener('click', saveNewPref);
    (<HTMLButtonElement>document
      .getElementById('svl_rollbackButton'))
      .addEventListener('click', rollbackPreferences);
    (<HTMLButtonElement>document
      .getElementById('svl_resetButton'))
      .addEventListener('click', resetPreferencesCallback);
    (<HTMLButtonElement>document
      .getElementById('svl_importButton'))
      .addEventListener('click', importPreferencesCallback);
    (<HTMLButtonElement>document
      .getElementById('svl_exportButton'))
      .addEventListener('click', exportPreferences);
    updatePreferenceValues();

  }

  /**
   *
   * @param {number} id
   */
  function removeNodeById(id: number) {
    nodesVector.destroyFeatures(nodesVector.getFeaturesByAttribute('sID', id), {
      'silent': true,
    });
  }

  /**
   *
   * @param {Array<Waze.Feature.Vector.Node>} nodes
   * @deprecated
   */
  function removeNodes(nodes: Array<Waze.Feature.Vector.Node>) {
    consoleDebug(`Removing ${nodes.length} nodes`);
    if (wmeSDK.Map.getZoomLevel() <= preferences['useWMERoadLayerAtZoom']) {
      consoleDebug('Destroy all nodes');
      nodesVector.destroyFeatures(nodesVector.features, { 'silent': true });
      return;
    }
    if (drawingAborted || nodes.length > preferences['nodesThreshold']) {
      if (!drawingAborted) {
        abortDrawing();
      }
      return;
    }
    let i: number;
    for (i = 0; i < nodes.length; i += 1) {
      removeNodeById(nodes[i].attributes.id);
    }
  }

  function removeNodesSDK(d: { dataModelName: string; objectIds: Array<(string | number)>; }) {
    if (d.dataModelName !== 'nodes') return;
    consoleDebug(`removeNodesSDK - Removing ${d.objectIds.length} nodes`);
    consoleDebug(d);
    if (wmeSDK.Map.getZoomLevel() <= preferences['useWMERoadLayerAtZoom']) {
      consoleDebug('Destroy all nodes');
      nodesVector.destroyFeatures(nodesVector.features, { 'silent': true });
      return;
    }
    if (drawingAborted || d.objectIds.length > preferences['nodesThreshold']) {
      if (!drawingAborted) {
        abortDrawing();
      }
      return;
    }
    let i: number;
    for (i = 0; i < d.objectIds.length; i += 1) {
      removeNodeById(d.objectIds[i]);
    }
  }

  function getNodeStyle(attributes) {
    if (attributes.segIDs?.length === 1) {
      // jshint ignore:line
      return nodeStyleDeadEnd;
    }
    return nodeStyle;
  }

  /**
 *
 * @param {Array<Waze.Feature.Vector.Node>} nodes
 * @deprecated
 */
  function changeNodes(nodes: Array<Waze.Feature.Vector.Node>) {
    consoleDebug('Change nodes');
    nodes.forEach((node) => {
      const { attributes } = node;
      const nodeFeature = nodesVector.getFeaturesByAttribute(
        'sID',
        attributes.id
      )[0];
      if (nodeFeature) {
        nodeFeature.style = getNodeStyle(attributes);
        const olGeo = node.getOLGeometry();
        nodeFeature.move(
          new OpenLayers.LonLat(olGeo.x, olGeo.y)
        );
      } else if (attributes.id > 0) {
        // The node has just been saved
        const newNode = drawNode(node);
        if (newNode) {
          nodesVector.addFeatures([newNode], { 'silent': true });
        }
      } // Else it is a temporary node, we won't draw it.});
    });
  }

  function editNodesSDK(d: { dataModelName: string; objectIds: Array<(string | number)>; }) {
    if (d.dataModelName !== 'nodes') return;
    consoleDebug(d);
    consoleDebug('Change nodes SDK');
    d.objectIds.forEach((nodeId) => {
      const node = W.model.nodes.getObjectById(nodeId);
      const { attributes } = node;
      const nodeFeature = nodesVector.getFeaturesByAttribute(
        'sID',
        attributes.id
      )[0];
      if (nodeFeature) {
        nodeFeature.style = getNodeStyle(attributes);
        const olGeo = node.getOLGeometry();
        nodeFeature.move(
          new OpenLayers.LonLat(olGeo.x, olGeo.y)
        );
      } else if (attributes.id > 0) {
        // The node has just been saved
        const newNode = drawNode(node);
        if (newNode) {
          nodesVector.addFeatures([newNode], { 'silent': true });
        }
      } // Else it is a temporary node, we won't draw it.});
    });
  }

  /**
   *
   * @param {Array<Waze.Feature.Vector.Node>} nodes
   */
  function nodeStateDeleted(nodes: Array<Waze.Feature.Vector.Node>) {
    consoleDebug('Node state deleted');
    for (let i = 0; i < nodes.length; i += 1) {
      removeNodeById(nodes[i].getID());
    }
  }

  /**
   *
   * @param {Array<Waze.Feature.Vector.Segment>} segments
   */
  function segmentsStateDeleted(segments: Array<Waze.Feature.Vector.Segment>) {
    for (let i = 0; i < segments.length; i += 1) {
      removeSegmentById(segments[i].getID());
    }
  }

  /*function saveNodesSDK(d: { dataModelName: string; objectIds: Array<(string | number)>; }) {
    if (d.dataModelName !== 'nodes') return;
    consoleDebug('Save node SDK');
    consoleDebug(d);
    // TODO
  }*/

  function addNodesSDK(d: { dataModelName: string; objectIds: Array<(string | number)>; }) {
    if (d.dataModelName !== 'nodes') return;
    consoleDebug(`Adding ${d.objectIds.length} nodes`);
    consoleDebug(d);
    if (drawingAborted || d.objectIds.length > preferences['nodesThreshold']) {
      if (!drawingAborted) {
        abortDrawing();
      }
      return;
    }
    if (wmeSDK.Map.getZoomLevel() <= preferences['useWMERoadLayerAtZoom']) {
      consoleDebug('Not adding them because of the zoom');
      return;
    }

    const myFeatures: OpenLayers.Feature.Vector[] = [];
    for (let i = 0; i < d.objectIds.length; i += 1) {
      const node = W.model.nodes.getObjectById(d.objectIds[i]);
      if (node && node.getOLGeometry() !== undefined) {
        //if (nodes[i].attributes.id > 0) {
        const newNode = drawNode(node);
        if (newNode) {
          myFeatures.push(newNode);
        }
        //}
      } else {
        console.warn('[SVL] Geometry of node is undefined');
      }
    }

    nodesVector.addFeatures(myFeatures, { 'silent': true });
    return true;
  }

  function removeSVLEvents(event) {
    // Keep all the events that don't have the svl flag enabled.
    return !event['svl'];
  }

  function updateStatusBasedOnZoom(): boolean {
    consoleDebug('updateStatusBasedOnZoom running');
    let mustRefresh = true;
    if (drawingAborted) {
      if (
        Object.keys(W.model.segments.objects).length <
        preferences['segmentsThreshold'] &&
        Object.keys(W.model.nodes.objects).length <
        preferences['nodesThreshold']
      ) {
        drawingAborted = false;
        setLayerVisibility(SVL_LAYER, true);
        setLayerVisibility(ROAD_LAYER, false);
        redrawAllSegments();
      } else {
        console.warn(
          `[SVL] Still too many elements to draw: Segments: ${wmeSDK.DataModel.Segments.getAll().length}/${preferences['segmentsThreshold']}, Nodes: ${wmeSDK.DataModel.Nodes.getAll().length})
          }/${preferences['nodesThreshold']
          } - You can change these thresholds in the preference panel.`
        );
      }
    }
    if (wmeSDK.Map.getZoomLevel() <= +preferences['useWMERoadLayerAtZoom']) {
      // There is nothing to draw, enable road layer
      consoleDebug('Road layer automatically enabled because of zoom out');
      // consoleDebug("Vector visibility: ", streetVector.visibility);
      if (streetVectorLayer.visibility === true) {
        SVLAutomDisabled = true;
        if (manageWMEStreetLayerCallback) {
          manageWMEStreetLayerCallback();
          manageWMEStreetLayerCallback = null;
        }
        setLayerVisibility(ROAD_LAYER, true);
        setLayerVisibility(SVL_LAYER, false);
      }
      mustRefresh = false;
    } else if (SVLAutomDisabled) {
      // Re-enable the SVL
      consoleDebug('Re-enabling SVL after zoom in');
      setLayerVisibility(SVL_LAYER, true);
      setLayerVisibility(ROAD_LAYER, false);
      manageSVLRoadLayer();
      SVLAutomDisabled = false;
    }
    //console.log("REDRAW00");
    //redrawAllSegments();
    return mustRefresh;
  }

  let timer: number;
  //let previousZoom = 30;
  function manageZoom() {
    consoleDebug("EVENT Zoomend")
    // Event deferring
    clearTimeout(timer);
    //timer = null;
    consoleDebug('manageZoom clearing timer');
    timer = setTimeout(updateStatusBasedOnZoom, 1000);
  }

  function registerSegmentsEvents() {
    // console.debug("SVL: Registering segment events");

    wmeSDK.Events.trackDataModelEvents({ dataModelName: "segments" });
    segmentEventsRemoveCallbacks.push(
      wmeSDK.Events.on({
        eventName: "wme-data-model-objects-added",
        eventHandler: ({ dataModelName, objectIds }) => { addSegmentsSDK({ dataModelName, objectIds }) },
      }));

    segmentEventsRemoveCallbacks.push(
      wmeSDK.Events.on({
        eventName: "wme-data-model-objects-changed",
        eventHandler: ({ dataModelName, objectIds }) => { editSegmentsSDK({ dataModelName, objectIds }) },
      }));

    segmentEventsRemoveCallbacks.push(
      wmeSDK.Events.on({
        eventName: "wme-data-model-objects-removed",
        eventHandler: ({ dataModelName, objectIds }) => { removeSegmentsSDK({ dataModelName, objectIds }) },
      }));

    segmentEventsRemoveCallbacks.push(
      wmeSDK.Events.on({
        eventName: "wme-data-model-objects-saved",
        eventHandler: ({ dataModelName, objectIds }) => { saveSegmentsSDK({ dataModelName, objectIds }) },
      }));
    // eslint-disable-next-line no-underscore-dangle
    const events = W.model.segments._events;
    if (typeof events === 'object') {
      events['objects-state-deleted'].push({
        'context': streetVectorLayer,
        'callback': segmentsStateDeleted,
        'svl': true,
      });
    }
    W.model.events.register('mergeend', null, mergeEndCallback);
  }

  function removeSegmentsEvents() {
    consoleDebug('Removing segments events');
    wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "segments" });
    // eslint-disable-next-line no-underscore-dangle
    while (segmentEventsRemoveCallbacks.length > 0) {
      let callback = segmentEventsRemoveCallbacks.pop();
      if (callback) {
        callback();
      }
    }

    const events = W.model.segments._events;
    if (typeof events === 'object') {
      events['objects-state-deleted'] =
        events['objects-state-deleted'].filter(removeSVLEvents);
    }
    W.model.events.unregister('mergeend', null, mergeEndCallback);
  }

  function removeNodeEvents() {
    consoleDebug('Removing node events');
    wmeSDK.Events.stopDataModelEventsTracking({ dataModelName: "nodes" });
    while (nodeEventsRemoveCallbacks.length > 0) {
      let callback = nodeEventsRemoveCallbacks.pop();
      if (callback) {
        callback();
      }
    }
    // eslint-disable-next-line no-underscore-dangle
    const events = W.model.nodes._events;
    if (typeof events === 'object') {
      events['objects-state-deleted'] =
        events['objects-state-deleted'].filter(removeSVLEvents);
    }
  }

  function registerNodeEvents() {
    consoleDebug('Registering node events');
    wmeSDK.Events.trackDataModelEvents({ dataModelName: "nodes" });
    nodeEventsRemoveCallbacks.push(
      wmeSDK.Events.on({
        eventName: "wme-data-model-objects-added",
        eventHandler: ({ dataModelName, objectIds }) => { addNodesSDK({ dataModelName, objectIds }) },
      }));

    nodeEventsRemoveCallbacks.push(
      wmeSDK.Events.on({
        eventName: "wme-data-model-objects-changed",
        eventHandler: ({ dataModelName, objectIds }) => { editNodesSDK({ dataModelName, objectIds }) },
      }));

    nodeEventsRemoveCallbacks.push(
      wmeSDK.Events.on({
        eventName: "wme-data-model-objects-removed",
        eventHandler: ({ dataModelName, objectIds }) => { removeNodesSDK({ dataModelName, objectIds }) },
      }));

    /*
    When a segment gets saved, all segments are redrawn.
    wmeSDK.Events.on({
      eventName: "wme-data-model-objects-saved",
      eventHandler: ({ dataModelName, objectIds }) => { saveNodesSDK({ dataModelName, objectIds }) },
    });*/
    // eslint-disable-next-line no-underscore-dangle
    const events = W.model.nodes._events;
    if (typeof events === 'object') {
      /*
      events.objectsremoved.push({
        'context': nodesVector,
        'callback': removeNodes,
        'svl': true,
      });
      events.objectsadded.push({
        'context': nodesVector,
        'callback': addNodes,
        'svl': true,
      });
      events.objectschanged.push({
        'context': nodesVector,
        'callback': changeNodes,
        'svl': true,
      });      */
      events['objects-state-deleted'].push({
        'context': nodesVector,
        'callback': nodeStateDeleted,
        'svl': true,
      });

    }
  }

  /**
   * Destroys all elements of all layers.
   */
  const destroyAllFeatures = () => {
    consoleDebug('Destroy all features');
    streetVectorLayer.destroyFeatures(streetVectorLayer.features, {
      'silent': true,
    });
    labelsVector.destroyFeatures(labelsVector.features, { 'silent': true });
    nodesVector.destroyFeatures(nodesVector.features, { 'silent': true });
  };

  function abortDrawing() {
    console.warn('[SVL] Abort drawing, too many elements');
    drawingAborted = true;
    setLayerVisibility(ROAD_LAYER, true);
    setLayerVisibility(SVL_LAYER, false);
    destroyAllFeatures();
  }

  function addSegmentsSDK(d: { dataModelName: DataModelName, objectIds: (string | number)[] }) {
    if (!countryID) return;
    if (d.dataModelName !== 'segments') return;
    consoleDebug(`addSegmentsSDK - Adding ${d.objectIds.length} segments`);

    if (drawingAborted || d.objectIds.length > preferences['segmentsThreshold']) {
      if (!drawingAborted) {
        abortDrawing();
      }
      return;
    }

    if (wmeSDK.Map.getZoomLevel() <= preferences['useWMERoadLayerAtZoom']) {
      consoleDebug('Not adding them because of the zoom');
      return;
    }

    consoleGroup();
    let segmentsFeatures: OpenLayers.Feature.Vector[] = [];
    let labelsFeatures: OpenLayers.Feature.Vector[] = [];
    // console.log("Size: " + e.length);
    d.objectIds.forEach((el) => {
      if (el !== null) {
        const res = drawSegment(W.model.segments.getObjectById(el));
        if (res.segmentFeatures) {
          segmentsFeatures.push(...res.segmentFeatures); //this should be way more efficient than "concat"
        }
        if (res.labels) {
          labelsFeatures.push(...res.labels);
        }
      }
    });
    if (segmentsFeatures.length > 0) {
      consoleDebug(`${segmentsFeatures.length} features added to the street layer`);
      streetVectorLayer.svlAddFeatures(segmentsFeatures, { 'silent': true });
    } else {
      consoleDebug('[SVL] no segment features drawn');
    }

    if (labelsFeatures.length > 0) {
      consoleDebug(`${labelsFeatures.length} features added to the labels layer`);
      labelsVector.addFeatures(labelsFeatures, { 'silent': true });
    } else {
      consoleDebug('[SVL] no labels features drawn');
    }
    consoleGroupEnd();
  }

  /**
   *
   * @param {number} id
   */
  function removeSegmentById(id: number) {
    consoleDebug(`RemoveSegmentById: ${id}`);
    streetVectorLayer.destroyFeatures(
      streetVectorLayer.getFeaturesByAttribute('sID', id),
      { 'silent': true }
    );
    labelsVector.destroyFeatures(
      labelsVector.getFeaturesByAttribute('sID', id),
      { 'silent': true }
    );
  }

  function saveSegmentsSDK(d: { dataModelName: DataModelName, objectIds: (string | number)[] }) {
    redrawAllSegments();
    if (d.dataModelName !== 'segments') return;
    consoleDebug(`saveSegmentsSDK - Saving ${d.objectIds.length} segments`);
    consoleDebug(d);
    // TODO
  }

  function editSegmentsSDK(d: { dataModelName: DataModelName, objectIds: (string | number)[] }) {
    // console.debug("Changed Segment");
    if (d.dataModelName !== 'segments') return;
    consoleDebug(`editSegmentsSDK - Edit ${d.objectIds.length} segments`);
    d.objectIds.forEach((segmID) => {
      removeSegmentById(segmID);
      // before, we checked that the state of the segment was not "DELETE"
      addSegmentsSDK({ dataModelName: d.dataModelName, objectIds: [segmID] });
    });
  }

  function removeSegmentsSDK(d: { dataModelName: DataModelName, objectIds: (string | number)[] }) {
    if (d.dataModelName !== 'segments') return;
    consoleDebug(`removeSegmentsSDK - Removing ${d.objectIds.length} segments`);
    if (wmeSDK.Map.getZoomLevel() <= preferences['useWMERoadLayerAtZoom']) {
      consoleDebug('Destroy all segments and labels because of zoom out');
      streetVectorLayer.destroyFeatures(streetVectorLayer.features, {
        'silent': true,
      });
      labelsVector.destroyFeatures(labelsVector.features, { 'silent': true });
      return;
    }
    if (drawingAborted || d.objectIds.length > preferences['segmentsThreshold']) {
      // TODO: I do not think we should check if we are deleting too many segments
      if (!drawingAborted) {
        abortDrawing();
      }
      return;
    }
    consoleGroup();
    d.objectIds.forEach((segmID) => {
      removeSegmentById(segmID);
    });
    consoleGroupEnd();
  }

  function manageVisibilityChanged(event) {
    // Toggle node layer visibility accordingly
    consoleDebug('ManageVisibilityChanged', event);
    nodesVector.setVisibility(event['object'].visibility);
    labelsVector.setVisibility(event['object'].visibility);
    if (event['object'].visibility) {
      // SVL was just enabled
      consoleDebug('enabled: registering events');
      registerSegmentsEvents();
      registerNodeEvents();
      const res = updateStatusBasedOnZoom();
      if (res === true) {
        redrawAllSegments();
      } /* else {
          alert("Please Zoom-in to enable the Street Vector Layer");
      } */
    } else {
      // SVL was disabled
      consoleDebug('disabled: unregistering events');
      removeSegmentsEvents();
      removeNodeEvents();

      destroyAllFeatures();
    }
  }

  /**
   *
   * @param {number} ms
   */
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForWazeWrap() {
    let trials = 1;
    wmeSDK.State.getUserInfo()
    let sleepTime = 150;
    do {
      if (
        !WazeWrap ||
        !WazeWrap.Ready ||
        !WazeWrap.Interface ||
        !WazeWrap.Alerts
      ) {
        console.log('SVL: WazeWrap not ready, retrying in 800ms');
        await sleep(trials * sleepTime);
      } else {
        return true;
      }
    } while (trials++ <= 30);
    console.error('SVL: could not initialize WazeWrap');
    throw new Error('SVL: could not initialize WazeWrap');
  }

  function initWazeWrapElements() {
    console.log('SVL: initializing WazeWrap');
    // Adding keyboard shortcut
    try {
      const toggleShortcut: KeyboardShortcut = {
        callback: () => {
          setLayerVisibility(SVL_LAYER, !streetVectorLayer.visibility);
        },
        description: "Toggle SVL",
        shortcutId: "svl",
        shortcutKeys: "l",
      };
      wmeSDK.Shortcuts.createShortcut(toggleShortcut);
      console.log('SVL: Keyboard shortcut successfully added.');
    } catch (e) {
      console.error('SVL: Error while adding the keyboard shortcut:');
      console.error(e);
    }

    // Add the layer checkbox
    try {
      WazeWrap.Interface.AddLayerCheckbox(
        'road',
        'Street Vector Layer',
        true,
        (checked) => {
          streetVectorLayer.setVisibility(checked);
        },
        streetVectorLayer
      );
    } catch (e) {
      console.error('SVL: could not add layer checkbox');
    }
    if (preferences['startDisabled']) {
      setLayerVisibility(SVL_LAYER, false);
    }
    loadTranslations().then(() => initPreferencePanel());
    //initPreferencePanel();
    WazeWrap.Interface.ShowScriptUpdate(
      'Street Vector Layer',
      SVL_VERSION,
      `<b>${_('whats_new')}</b>
      <br>- 6.0.0 - Start using the new WME SDK. SVL is likely to be discontinued if Waze quits supporting OpenLayers.
      <br>- 6.0.0 - Fix: no more road layer automatically enabled by the WME, when SVL is on.
      <br>- 5.5.3 & 4: Fix for WME Beta. <b>Warning: SVL may stop working for good in the future due to WME internal changes</b>
      <br>- 5.5.1: Use GeoJson instead of OpenLayers (no visible change)`,
      '',
      GM_info.script.supportURL
    );
  }

  function invalidTranslation(key: string): string {
    console.error('[SVL] Invalid translation key: ' + key);
    return '<invalid translation key>';
  }

  /**
   *
   * @param {string} key
   * @returns {string}
   */
  function _(key: string): string {
    const key_index = tr_keys[key];
    if (typeof key_index === 'undefined' && Object.keys(tr).length > 0) {
      return invalidTranslation(key);
    }
    const locale = I18n.currentLocale();
    if (tr[locale]) {
      if (tr[locale][key_index] && tr[locale][key_index] !== '') {
        return tr[locale][key_index];
      }
    }
    if (tr['en'] && tr['en'][key_index]) {
      return tr['en'][key_index];
    }
    return fallback[key];
    //return tr[I18n.currentLocale()]?.[tr_keys[key]] ?? tr["en"]?.[tr_keys[key]] ?? invalidTranslation(key);
  }

  /**
   * Perform a GM_xmlhttpRequest as a promise
   * @param {string} url
   * @param {Object} opt
   * @return {Promise}
   */
  function request(url: string, opt: object = {}): Promise<any> {
    if (opt) {
      Object.assign(opt, {
        url,
        timeout: 30000, //in ms
      })
    }

    return new Promise((resolve, reject) => {
      opt.onerror = opt.ontimeout = reject;
      opt.onload = resolve;
      GM_xmlhttpRequest(opt);
    })
  }

  /**@type{!Object<string,Array<string>>} */
  const tr: { [s: string]: Array<string>; } = [];
  /**@type{!Object<string,number>} */
  const tr_keys: { [s: string]: number; } = [];
  async function loadTranslations() {
    //console.debug('Loading translations...');
    const response = await request(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjug3umcYtdN9iVQc2SAqfK03o6HvozEEoxBrdg_Xf73Dt6TuApRCmT_V6UIIkMyVjRjKydl9CP8qE/pub?gid=565129786&single=true&output=tsv',
      {
        method: 'GET',
        responseType: 'text'
      }
    );

    //console.error("RESPONSE!");
    if (response.readyState === 4 && response.status === 200) {
      const data = response.responseText;
      let temp = data.split('\n');
      for (const [i, line] of temp.entries()) {
        if (i > 0) {
          const [first, ...rest] = line.split('\t');
          tr[first] = rest.map((e) => e.trim());
        } else {
          const [, ...rest] = line.split('\t');
          for (const [j, value] of rest.entries()) {
            tr_keys[value.trim()] = parseInt(j, 10);
          }
          console.dir(tr_keys);
        }
      }
      onlineTranslations = true;
      console.dir(tr);
      return true;
    }
    throw new Error('Network response for SVL translations was not ok');
  }

  /**
   * Returns the geodetic pixel size in meters, optimized for the Waze Map
   * @returns {number}
   */
  function getGeodesicPixelSizeSVL(): number {
    const lonlat = OLMap.getCachedCenter();
    const res = OLMap.resolution;
    const left = lonlat.add(-res / 2, 0);
    const right = lonlat.add(res / 2, 0);
    //const bottom = lonlat.add(0, -res / 2);
    //const top = lonlat.add(0, res / 2);
    left.transform(OLMap.projection, gmapsProjection);
    right.transform(OLMap.projection, gmapsProjection);
    // bottom.transform(source, dest);
    //top.transform(source, dest);

    //return new OpenLayers.Size(
    return OpenLayers.Util.distVincenty(left, right) * 1000;
    //  OpenLayers.Util.distVincenty(bottom, top)
    //);
  }

  /**
 *
 * @param {Object} source
 * @return {Object}
 * 
 */
  function svlExtend(source: object): object {
    let destination = {};
    if (source) {
      for (let property in source) {
        const value = source[property];
        if (value !== undefined) {
          destination[property] = value;
        }
      }
    }
    return destination;
  }

  function initSVL() {
    // Initialize variables
    svlGlobals();

    // Override OpenLayers function
    OpenLayers.Util.getElement = function () {
      const elements = [];

      for (let i = 0, len = arguments.length; i < len; i++) {
        var element = arguments[i];
        if (typeof element == 'string') {
          element = document.getElementById(element);
        }
        if (arguments.length === 1) {
          return element;
        }
        elements.push(element);
      }
      return elements;
    };

    if (loadPreferences() === false) {
      // First run, or new broswer
      safeAlert(
        'info',
        `${_('first_time')}

          ${_('some_info')}
          ${_('default_shortcut_instruction')}
          ${_('instructions_1')}
          ${_('instructions_2')}
          ${_('instructions_3')}
          ${_('instructions_4')}`
      );
    }

    /*  eslint-disable no-template-curly-in-string */
    const roadStyleMap = new OpenLayers.StyleMap({
      'pointerEvents': 'none',
      'strokeColor': '${color}',
      'strokeWidth': '${width}',
      'strokeOpacity': '${opacity}',
      'strokeDashstyle': '${dash}',
      'strokeLinecap': 'butt',
      //TODO: only add it ^ for segments with road width (or a very large width)
      'graphicZIndex': '${zIndex}',
    });

    const labelStyleMap = new OpenLayers.StyleMap({
      'fontFamily': 'Rubik, Open Sans, Alef, helvetica, sans-serif',
      'fontWeight': '800',
      'fontColor': '${color}',
      'labelOutlineColor': '${outlinecolor}',
      'labelOutlineWidth': '${outlinewidth}',
      'label': '${label}',
      'visibility': !preferences['startDisabled'],
      'angle': '${angle}',
      'pointerEvents': 'none',
      'labelAlign': 'cm', // set to center middle
    });
    /*  eslint-enable no-template-curly-in-string */
    const layerName = 'Street Vector Layer';

    streetVectorLayer = new OpenLayers.Layer.Vector(layerName, {
      'styleMap': roadStyleMap,
      'accelerator': `toggle${layerName.replace(/\s+/g, '')}`,
      'visibility': !preferences['startDisabled'],
      'isVector': true,
      'attribution': `${_('svl_version')} ${SVL_VERSION}`,
      'rendererOptions': {
        'zIndexing': true,
      },
    });

    /**
     *
     * @param {number} index
     * @return {Element}
     */
    OpenLayers.ElementsIndexer.prototype.svlGetNextElement = function (index: number): Element {
      // const nextIndex = index + 1;
      // console.log(`Order length: ${this.order.length}` );
      for (let i = index + 1; i < this.order.length; i++) {
        let nextElement = document.getElementById(this.order[i]);
        if (nextElement) {
          return nextElement;
        }
      }
      return null;
    };
    /**
     *
     * @param {HTMLElement} newNode
     * @return {Element}
     */
    OpenLayers.ElementsIndexer.prototype.insert = function (newNode: HTMLElement): Element {
      // If the node is known to the indexer, remove it so we can
      // recalculate where it should go.
      const nodeId = newNode.id;
      // if newNode exists
      if (this.indices[nodeId] != null) {
        this.remove(newNode);
      }

      this.determineZIndex(newNode);

      var leftIndex: number = -1;
      var rightIndex: number = this.order.length;
      var middle;

      while (rightIndex - leftIndex > 1) {
        middle = Math.trunc((leftIndex + rightIndex) / 2);

        // Changed here, great performance improvement by not using Utils.getElement
        var placement = this.compare(this, newNode,
          document.getElementById(this.order[middle]));

        if (placement > 0) {
          leftIndex = middle;
        } else {
          rightIndex = middle;
        }
      }

      this.order.splice(rightIndex, 0, nodeId);
      this.indices[nodeId] = this.getZIndex(newNode);

      // If the new node should be before another in the index
      // order, return the node before which we have to insert the new one;
      // else, return null to indicate that the new node can be appended.
      return this.svlGetNextElement(rightIndex);
    };

    /**
     *
     * @param {string} id
     * @param {OpenLayers.Geometry} geometry
     * @param {Object} style
     * @param {string} featureId
     * @returns
     */
    streetVectorLayer.renderer.redrawNode = function (id: string, geometry: OpenLayers.IGeometry, style: object, featureId: string) {
      style = this.applyDefaultSymbolizer(style);
      // Get the node if it's already on the map.
      var node = this.nodeFactory(id, this.getNodeType(geometry, style));

      // Set the data for the node, then draw it.
      node['_featureId'] = featureId;
      node['_boundsBottom'] = geometry.getBounds().bottom;
      node['_geometryClass'] = geometry.CLASS_NAME;
      node['_style'] = style;

      var drawResult = this.drawGeometryNode(node, geometry, style);
      if (drawResult === false) {
        return false;
      }

      node = drawResult.node;

      // Insert the node into the indexer so it can show us where to
      // place it. Note that this operation is O(log(n)). If there's a
      // performance problem (when dragging, for instance) this is
      // likely where it would be.
      if (this.indexer) {
        const insertMeAfterThisNode = this.indexer.insert(node);
        if (insertMeAfterThisNode) {
          this.vectorRoot.insertBefore(node, insertMeAfterThisNode);
        } else {
          // element can be appended
          this.vectorRoot.appendChild(node);
        }
      } else {
        // if there's no indexer, simply append the node to root,
        // but only if the node is a new one
        if (node.parentNode !== this.vectorRoot) {
          this.vectorRoot.appendChild(node);
        }
      }

      this.postDraw(node);

      return drawResult.complete;
    };

    streetVectorLayer.renderer.drawGeometry = function (geometry: OpenLayers.IGeometry, style: Partial<StyleObject>, featureId) {
      let rendered = false;
      let removeBackground = false;
      if (style.display != "none") {
        if (style.backgroundGraphic) {
          this.redrawBackgroundNode(geometry.id, geometry, style,
            featureId);
        } else {
          removeBackground = true;
        }
        rendered = this.redrawNode(geometry.id, geometry, style,
          featureId);
      }
      if (rendered === false) {
        var node = document.getElementById(geometry.id);
        if (node) {
          if (node['_style'].backgroundGraphic) {
            removeBackground = true;
          }
          node.parentNode.removeChild(node);
        }
      }
      if (removeBackground) {
        var node = document.getElementById(
          geometry.id + this.BACKGROUND_ID_SUFFIX);
        if (node) {
          node.parentNode.removeChild(node);
        }
      }
      return rendered;
    };

    streetVectorLayer.renderer.drawFeature = function drawFeature(
      feature: OpenLayers.Feature.Vector,
      style: Partial<StyleObject>,
      farZoom = isFarZoom()
    ) {
      if (style == null) {
        style = feature.style;
      }

      if (feature.geometry) {
        // if (bounds) {
        if (
          wmeSDK.Map.getZoomLevel() < 2 ||
          (feature.attributes.closeZoomOnly && farZoom) ||
          (feature.attributes.farZoomOnly && !farZoom)
        ) {
          style = { 'display': 'none' };
        } else {
          const bounds = feature.geometry.getBounds();
          if (!bounds || !bounds.intersectsBounds(streetVectorLayer.renderer.extent)) {
            style = { 'display': 'none' };
          } else {
            streetVectorLayer.renderer.featureDx = 0;
            style['pointerEvents'] = 'none';
            if (!farZoom) {
              if (!feature.attributes.isArrow && preferences['realsize']) {
                //console.dir(style['strokeWidth']);
                style['strokeWidth'] /= getGeodesicPixelSizeSVL();
                //console.dir(style['strokeWidth']);
              }
            }
          }
        }

        return streetVectorLayer.renderer.drawGeometry(
          feature.geometry,
          style,
          feature.id
        );
        // } else { alert("No bounds!"); }
      }
      return undefined;
    };

    streetVectorLayer.drawFeature = function (feature: OpenLayers.Feature.Vector, style: Partial<StyleObject>, farZoom = isFarZoom()) {
      // don't try to draw the feature with the renderer if the layer is not
      // drawn itself
      if (!this.drawn) {
        return;
      }
      if (typeof style != "object") {
        if (!style && feature.state === OpenLayers.State.DELETE) {
          style = "delete";
        }
        var renderIntent = style || feature.renderIntent;
        style = feature.style || this.style;
        if (!style) {
          style = this.styleMap.createSymbolizer(feature, renderIntent);
        }
      }

      var drawn = this.renderer.drawFeature(feature, style, farZoom);
      //TODO remove the check for null when we get rid of Renderer.SVG
      if (drawn === false || drawn === null) {
        this.unrenderedFeatures[feature.id] = feature;
      } else {
        delete this.unrenderedFeatures[feature.id];
      }
    }


    streetVectorLayer.moveTo = function (bounds: OpenLayers.Bounds, zoomChanged: boolean, dragging: boolean) {
      OpenLayers.Layer.prototype.moveTo.apply(this, arguments);

      var coordSysUnchanged = true;
      const farZoom = isFarZoom();
      if (!dragging) {
        this.renderer.root.style.visibility = 'hidden';

        var viewSize = this.map.getSize(),
          viewWidth = viewSize.w,
          viewHeight = viewSize.h,
          offsetLeft = (viewWidth / 2 * this.ratio) - viewWidth / 2,
          offsetTop = (viewHeight / 2 * this.ratio) - viewHeight / 2;
        offsetLeft += this.map.layerContainerOriginPx.x;
        offsetLeft = -Math.round(offsetLeft);
        offsetTop += this.map.layerContainerOriginPx.y;
        offsetTop = -Math.round(offsetTop);

        this.div.style.left = offsetLeft + 'px';
        this.div.style.top = offsetTop + 'px';

        var extent = this.map.getExtent().scale(this.ratio);
        coordSysUnchanged = this.renderer.setExtent(extent, zoomChanged);

        this.renderer.root.style.visibility = 'visible';

        // Force a reflow on gecko based browsers to prevent jump/flicker.
        // This seems to happen on only certain configurations; it was originally
        // noticed in FF 2.0 and Linux.
        if (OpenLayers.IS_GECKO === true) {
          this.div.scrollLeft = this.div.scrollLeft;
        }

        if (!zoomChanged && coordSysUnchanged) {
          for (var i in this.unrenderedFeatures) {
            var feature = this.unrenderedFeatures[i];
            this.drawFeature(feature, undefined, farZoom);
          }
        }
      }

      if (!this.drawn || zoomChanged || !coordSysUnchanged) {
        this.drawn = true;
        var feature;
        for (let i: number = 0, len = this.features.length; i < len; i++) {
          this.renderer.locked = (i !== (len - 1));
          feature = this.features[i];
          this.drawFeature(feature, undefined, farZoom);
        }
      }
    };

    streetVectorLayer.svlAddFeatures =
      /**
       * 
       * @param {Array.<OpenLayers.Feature.Vector|null> | null} features 
       * @param {(Object|null)=} options 
       * @returns {?}
       */
      function (features: Array<OpenLayers.Feature.Vector | null> | null, options: (object | null) | undefined): void {
        if (!features || features.length === 0) return;
        // For us features is guaranteed to be an array
        //if (!(OpenLayers.Util.isArray(features))) {
        //    features = [features];
        //}

        /*     var notify = !options || !options.silent;
            if(notify) {
                var event = {features: features};
                var ret = this.events.triggerEvent("beforefeaturesadded", event);
                if(ret === false) {
                    return;
                }
                features = event.features;
            } */

        const farZoom = isFarZoom();

        // Track successfully added features for featuresadded event, since
        // beforefeatureadded can veto single features.
        const featuresAdded: OpenLayers.Feature.Vector[] = [];
        for (let i = 0, len = features.length; i < len; i += 1) {
          if (i != (features.length - 1)) {
            this.renderer.locked = true;
          } else {
            this.renderer.locked = false;
          }
          let feature = features[i];
          if (!feature) continue;

          if (this.geometryType &&
            !(feature.geometry instanceof this.geometryType)) {
            throw new TypeError('addFeatures: component should be an ' +
              this.geometryType.prototype.CLASS_NAME);
          }

          //give feature reference to its layer
          feature.layer = this;

          if (!feature.style && this.style) {
            feature.style = svlExtend(this.style);
          }

          /*         if (notify) {
                      if(this.events.triggerEvent("beforefeatureadded",
                                                  {feature: feature}) === false) {
                          continue;
                      }
                      this.preFeatureInsert(feature);
                  } */

          featuresAdded.push(feature);
          this.features.push(feature);
          this.drawFeature(feature, undefined, farZoom);

          /*         if (notify) {
                      this.events.triggerEvent("featureadded", {
                          feature: feature
                      });
                      this.onFeatureInsert(feature);
                  } */
        }

        /*     if(notify) {
                this.events.triggerEvent("featuresadded", {features: featuresAdded});
            } */
      };

    nodesVector = new OpenLayers.Layer.Vector('Nodes Vector', {
      'visibility': !preferences['startDisabled'],
    });

    nodesVector.drawFeature = streetVectorLayer.drawFeature;
    nodesVector.addFeatures = streetVectorLayer.svlAddFeatures;
    nodesVector.moveTo = streetVectorLayer.moveTo;

    nodesVector.renderer.drawFeature = function drawFeature(feature, style: Partial<StyleObject>,
      farZoom = isFarZoom()) {
      if (wmeSDK.Map.getZoomLevel() < 2) {
        style = { 'display': 'none' };
        return nodesVector.renderer.drawGeometry(
          feature.geometry,
          style,
          feature.id
        );
      }
      if (style == null) {
        style = feature.style;
      }

      style = svlExtend(style);

      if (feature.geometry) {
        // if (bounds) {
        if (!farZoom) {
          const bounds = feature.geometry.getBounds();
          if (!bounds.intersectsBounds(nodesVector.renderer.extent)) {
            style = { 'display': 'none' };
          } else {
            nodesVector.renderer.featureDx = 0;
            if (preferences['realsize']) {
              style['pointRadius'] /= OLMap.resolution;
            }
          }
        } else {
          style = { 'display': 'none' };
        }
        return nodesVector.renderer.drawGeometry(
          feature.geometry,
          style,
          feature.id
        );

        // } else { alert("No bounds!"); }
      }
      return undefined;
    };

    labelsVector = new OpenLayers.Layer.Vector('Labels Vector', {
      'name': 'vectorLabels',
      'styleMap': labelStyleMap,
      'visibility': !preferences['startDisabled'],
    });
    labelsVector.drawFeature = streetVectorLayer.drawFeature;
    labelsVector.addFeatures = streetVectorLayer.svlAddFeatures;
    labelsVector.moveTo = streetVectorLayer.moveTo;

    labelsVector.renderer.drawFeature = function drawFeature(feature: OpenLayers.Feature.Vector, style: Partial<StyleObject>,
      farZoom = isFarZoom()) {
      const { zoom } = OLMap;
      if (zoom < 2) {
        return false;
      }
      if (style == null) {
        style = feature.style;
      }

      if (feature.geometry) {
        // if (bounds) {
        if (
          7 - feature.attributes.showAtzoom > zoom ||
          (feature.attributes.closeZoomOnly && farZoom) ||
          (feature.attributes.farZoomOnly && !farZoom)
        ) {
          style = { 'display': 'none' };
        } else {
          const bounds = feature.geometry.getBounds();
          if (!bounds || !bounds.intersectsBounds(labelsVector.renderer.extent)) {
            style = { 'display': 'none' };
          } else {
            labelsVector.renderer.featureDx = 0;
            style['pointerEvents'] = 'none';
            style['fontSize'] = farZoom
              ? preferences['farZoomLabelSize']
              : preferences['closeZoomLabelSize'];
          }
        }

        const rendered = labelsVector.renderer.drawGeometry(
          feature.geometry,
          style,
          feature.id
        );
        if (
          style['display'] !== 'none' &&
          style['label'] &&
          rendered !== false
        ) {
          const location = feature.geometry.getCentroid();

          /*
          if (style['labelXOffset'] || style['labelYOffset']) {
            const xOffset = Number.isNaN(style['labelXOffset'])
              ? 0
              : style['labelXOffset'];
            const yOffset = Number.isNaN(style['labelYOffset'])
              ? 0
              : style['labelYOffset'];
            const res = OLMap.getResolution();
            location.move(xOffset * res, yOffset * res);
          } */
          labelsVector.renderer.drawText(feature.id, style, location);
        } else {
          labelsVector.renderer.removeText(feature.id);
        }
        return rendered;
        // } else { alert("No bounds!"); }
      }
      return undefined;
    };

    labelsVector.renderer.drawText = function drawText(
      featureId,
      style: { [key: string]: any },
      location: OpenLayers.Geometry.Point
    ) {
      const drawOutline = !!style['labelOutlineWidth'];
      // First draw text in halo color and size and overlay the
      // normal text afterwards
      if (drawOutline) {
        const outlineStyle = <Partial<StyleObject>>svlExtend(style);
        outlineStyle['fontColor'] = outlineStyle['labelOutlineColor'];
        outlineStyle['fontStrokeColor'] = outlineStyle['labelOutlineColor'];
        outlineStyle['fontStrokeWidth'] = style['labelOutlineWidth'];
        if (style['labelOutlineOpacity']) {
          outlineStyle['fontOpacity'] = style['labelOutlineOpacity'];
        }
        delete outlineStyle['labelOutlineWidth'];
        labelsVector.renderer.drawText(featureId, outlineStyle, location);
      }

      const resolution = labelsVector.renderer.getResolution();

      const x: number =
        (location.x - labelsVector.renderer.featureDx) / resolution +
        labelsVector.renderer.left;
      const y = location.y / resolution - labelsVector.renderer.top;

      const suffix = drawOutline
        ? labelsVector.renderer.LABEL_OUTLINE_SUFFIX
        : labelsVector.renderer.LABEL_ID_SUFFIX;
      const label = labelsVector.renderer.nodeFactory(
        featureId + suffix,
        'text'
      );

      label.setAttribute('x', x.toString());
      label.setAttribute('y', (-y).toString());

      if (style['angle'] || style['angle'] === 0) {
        const rotate = `rotate(${style['angle']},${x},${-y})`;
        label.setAttribute('transform', rotate);
      }
      if (style['fontFamily']) {
        label.setAttribute('font-family', style['fontFamily']);
      }
      if (style['fontWeight']) {
        label.setAttribute('font-weight', style['fontWeight']);
      }

      if (style['fontSize']) {
        label.setAttribute('font-size', style['fontSize']);
      }

      if (style['fontColor']) {
        label.setAttribute('fill', style['fontColor']);
      }
      if (style['fontStrokeColor']) {
        label.setAttribute('stroke', style['fontStrokeColor']);
      }

      if (style['fontStrokeWidth']) {
        label.setAttribute('stroke-width', style['fontStrokeWidth']);
      }

      label.setAttribute('pointer-events', 'none');

      const align =
        style['labelAlign'] ?? OpenLayers.Renderer.defaultSymbolizer.labelAlign;
      label.setAttribute(
        'text-anchor',
        OpenLayers.Renderer.SVG.LABEL_ALIGN[align[0]] ?? 'middle'
      );

      if (OpenLayers.IS_GECKO === true) {
        label.setAttribute(
          'dominant-baseline',
          OpenLayers.Renderer.SVG.LABEL_ALIGN[align[1]] ?? 'central'
        );
      }

      const labelRows = style['label'].split('\n');
      const numRows = labelRows.length;
      while (label.childNodes.length > numRows) {
        label.removeChild(label.lastChild);
      }
      for (let i = 0; i < numRows; i += 1) {
        const tspan = labelsVector.renderer.nodeFactory(
          `${featureId + suffix}_tspan_${i}`,
          'tspan'
        );
        if (style['labelSelect'] === true) {
          /* eslint-disable no-underscore-dangle */
          tspan._featureId = featureId;
          tspan._geometry = location;
          tspan._geometryClass = location.CLASS_NAME;
          /* eslint-enable no-underscore-dangle */
        }
        if (OpenLayers.IS_GECKO === false) {
          tspan.setAttribute(
            'baseline-shift',
            OpenLayers.Renderer.SVG.LABEL_VSHIFT[align[1]] ?? '-35%'
          );
        }
        tspan.setAttribute('x', String(x));
        if (i === 0) {
          let vfactor = OpenLayers.Renderer.SVG.LABEL_VFACTOR[align[1]];
          if (vfactor == null) {
            vfactor = -0.5;
          }
          tspan.setAttribute('dy', `${vfactor * (numRows - 1)}em`);
        } else {
          tspan.setAttribute('dy', '1em');
        }
        tspan.textContent = labelRows[i] === '' ? ' ' : labelRows[i];
        if (!tspan.parentNode) {
          label.appendChild(tspan);
        }
      }

      if (!label.parentNode) {
        labelsVector.renderer.textRoot.appendChild(label);
      }
    };

    handleWMESettingsUpdated(false);
    updateStylesFromPreferences(preferences, false);

    // Add layers to the map
    OLMap.addLayer(streetVectorLayer);
    OLMap.addLayer(labelsVector);
    OLMap.addLayer(nodesVector);

    if (DEBUG) {
      document['sv'] = streetVectorLayer;
      document['lv'] = labelsVector;
      document['nv'] = nodesVector;
      document['svl_pref'] = preferences;
    }

    // initialisation
    const layers = OLMap.getLayersBy('name', 'roads');
    WMERoadLayer = null;
    if (layers.length === 1) {
      [WMERoadLayer] = layers;
    } else {
      console.error('SVL: Road Layer not found');
    }
    SVLAutomDisabled = false;

    if (preferences['showUnderGPSPoints']) {
      // By default, WME places the GPS points under the layer, no need to move it.
      updateLayerPosition();
    }

    updateRoutingModePanel();
    updateRefreshStatus();

    wmeSDK.Events.on({
      eventName: "wme-map-zoom-changed",
      eventHandler: manageZoom
    });
    wmeSDK.Events.trackLayerEvents({
      layerName: "roads"
    });
    manageSVLRoadLayer();

    waitForWazeWrap().then((result) => {
      if (result === true) {
        initWazeWrapElements();
      }
    });

    if (wmeSDK.Map.getZoomLevel() <= preferences['useWMERoadLayerAtZoom']) {
      setLayerVisibility(ROAD_LAYER, true);
    } else if (
      WMERoadLayer?.getVisibility() &&
      preferences['disableRoadLayers']
    ) {
      setLayerVisibility(ROAD_LAYER, false);
      console.log(
        "SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel."
      );
    }

    streetVectorLayer.events.register(
      'visibilitychanged',
      streetVectorLayer,
      manageVisibilityChanged
    );
    // Trigger the event manually
    manageVisibilityChanged({
      'object': streetVectorLayer,
    });

    // eslint-disable-next-line no-underscore-dangle
    wmeSDK.Events.on({
      eventName: 'wme-user-settings-changed',
      eventHandler: handleWMESettingsUpdated,
    });

    //mergeEndCallback();
    console.log(`[SVL] v. ${SVL_VERSION} initialized correctly.`);
  }

  function manageSVLRoadLayer() {
    manageWMEStreetLayerCallback = wmeSDK.Events.on({
      eventName: "wme-layer-visibility-changed",
      eventHandler: manageLayerChanged
    });
  }

  function redrawAllSegments() {
    consoleDebug('DrawAllSegments');
    destroyAllFeatures();
    addSegmentsSDK({ dataModelName: 'segments', objectIds: wmeSDK.DataModel.Segments.getAll().map((e) => e.id) }); // TODO: here we are getting all data, and discarding it
    addNodesSDK({ dataModelName: 'nodes', objectIds: wmeSDK.DataModel.Nodes.getAll().map((e) => e.id) });
  }

  function updateStylesFromPreferences(pref: PreferenceObject, shouldRedraw = true) {
    streetStyles = [];
    for (let i = 0; i < pref['streets'].length; i += 1) {
      if (pref['streets'][i]) {
        streetStyles[i] = {
          'strokeColor': pref['streets'][i]['strokeColor'],
          'strokeWidth': pref['streets'][i]['strokeWidth'],
          'strokeDashstyle': pref['streets'][i]['strokeDashstyle'],
          'outlineColor': bestBackground(pref['streets'][i]['strokeColor']),
        };
      }
    }
    clutterConstant = pref['clutterConstant'];
    streetVectorLayer.setOpacity(preferences['layerOpacity']);
    updateRoutingModePanel();
    if (shouldRedraw) {
      redrawAllSegments();
    }
  }

  function initCountry() {
    const topCountry = wmeSDK.DataModel.Countries.getTopCountry()
    if (!topCountry) {
      console.error('SVL: could not find topCountry');
      return;
    }
    const defaultLaneWidth = topCountry.defaultLaneWidthPerRoadType;
    if (defaultLaneWidth) {
      Object.keys(defaultLaneWidth).forEach((e) => {
        defaultSegmentWidthMeters[e] = defaultLaneWidth[e] / 50.0; //50: (width * 2) / 100
        defaultLaneWidthMeters[e] = defaultLaneWidth[e] / 100;
      });
      redrawAllSegments();
    } else {
      console.warn(
        'SVL: could not find the default lane width in Waze data model'
      );
    }
  }

  function manageLayerChanged(e: { layerName: string }) {
    if (SVLAutomDisabled || drawingAborted) return;
    consoleDebug("Layer changed: " + e.layerName);
    if (e.layerName === "roads" && streetVectorLayer.getVisibility()) {
      // if SVL is currently enabled, disable it
      wmeSDK.Map.setLayerVisibility({ layerName: "roads", visibility: false })
    }
  }

  const fallback: Record<string, string> = {};
  fallback[`completition_percentage`] = `100%`;
  fallback[`language_code`] = `en`;
  fallback[`translation_thanks`] = `translated in your language thanks to:`;
  fallback[`would_you_like_to_help`] = `Would you like to help?`;
  fallback[
    `fully_translated_in`
  ] = `Fully translated in your language thanks to:`;
  fallback[`translated_by`] = `bedo2991`;
  fallback[`routing_mode_panel_title`] = `SVL's Routing Mode`;
  fallback[`routing_mode_panel_body`] = `Hover to temporary disable it`;
  fallback[`thanks_for_using`] = `Thanks for using`;
  fallback[`version`] = `Version`;
  fallback[`something_not_working`] = `Something not working?`;
  fallback[`report_it_here`] = `Report it here`;
  fallback[`reset`] = `Reset`;
  fallback[
    `reset_help`
  ] = `Overwrite your current settings with the default ones`;
  fallback[`rollback`] = `Rollback`;
  fallback[`rollback_help`] = `Discard your temporary changes`;
  fallback[`save`] = `Save`;
  fallback[`save_help`] = `Save your edited settings`;
  fallback[`settings_backup`] = `Settings Backup`;
  fallback[`import`] = `Import`;
  fallback[`export`] = `Export`;
  fallback[`new_since_version`] = `New since v.`;
  fallback[`whats_new`] = `What's new?`;
  fallback[
    `first_time`
  ] = `This is the first time that you run Street Vector Layer in this browser.`;
  fallback[`some_info`] = `Some info about it:`;
  fallback[
    `default_shortcut_instruction`
  ] = `By default, use ALT+L to toggle the layer.`;
  fallback[
    `instructions_1`
  ] = `You can change the streets color, thickness and style using the panel on the left sidebar.`;
  fallback[
    `instructions_2`
  ] = `Your preferences will be saved for the next time in your browser.`;
  fallback[
    `instructions_3`
  ] = `The other road layers will be automatically hidden (you can change this behaviour in the preference panel).`;
  fallback[
    `instructions_4`
  ] = `Have fun and tell us on the Waze forum if you liked the script!`;
  fallback[`roads_properties`] = `Roads Properties`;
  fallback[`segments_decorations`] = `Segments Decorations`;
  fallback[`rendering_parameters`] = `Rendering Parameters`;
  fallback[`speed_limits`] = `Speed Limits`;
  fallback[`performance_tuning`] = `Performance Tuning`;
  fallback[`utilities`] = `Utilities`;
  fallback[`svl_standard_layer`] = `SVL Standard`;
  fallback[`wme_colors_layer`] = `WME Colors`;
  fallback[
    `preset_applied`
  ] = `Preset applied, don't forget to save your changes!`;
  fallback[`line_solid`] = `Solid`;
  fallback[`line_dash`] = `Dashed`;
  fallback[`line_dashdot`] = `Dash Dot`;
  fallback[`line_longdash`] = `Long Dash`;
  fallback[`line_longdashdot`] = `Long Dash Dot`;
  fallback[`line_dot`] = `Dot`;
  fallback[`color`] = `Color`;
  fallback[`opacity`] = `Opacity`;
  fallback[`width`] = `Width`;
  fallback[`width_disabled`] = `disabled if using real-size width`;
  fallback[`svl_logo`] = `Street Vector Layer Logo`;
  fallback[`preferences_saved`] = `Preferences saved!`;
  fallback[
    `preferences_saving_error`
  ] = `Could not save the preferences, your browser local storage seems to be full.`;
  fallback[
    `preferences_rollback`
  ] = `All's well that ends well! Now it's everything as it was before.`;
  fallback[
    `export_preferences_message`
  ] = `The configuration has been copied to your clipboard.
Please paste it in a file (CTRL+V) to store it.`;
  fallback[
    `preferences_parsing_error`
  ] = `Your string seems to be somehow wrong. Please check that is a valid JSON string`;
  fallback[`preferences_imported`] = `Done, preferences imported!`;
  fallback[
    `preferences_importing_error`
  ] = `Something went wrong. Is your string correct?`;
  fallback[
    `preferences_import_prompt`
  ] = `N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!`;
  fallback[`preferences_import_prompt_2`] = `Paste your string here:`;
  fallback[
    `preferences_reset_message`
  ] = `Preferences have been reset to the default values`;
  fallback[
    `preferences_reset_question`
  ] = `Are you sure you want to rollback to the default settings?`;
  fallback[
    `preferences_reset_question_2`
  ] = `ANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!`;
  fallback[`preferences_reset_yes`] = `Yes, I want to reset`;
  fallback[`preferences_reset_cancel`] = `No, cancel`;
  fallback[`cancel`] = `Cancel`;
  fallback[`speed_limit_value`] = `Speed Limit Value`;
  fallback[`kmh`] = `km/h`;
  fallback[`mph`] = `mph`;
  fallback[`true_or_false`] = `True or False`;
  fallback[`insert_number`] = `Insert a number`;
  fallback[`pick_a_value_slider`] = `Pick a value using the slider`;
  fallback[`svl_version`] = `SVL v.`;
  fallback[
    `init_error`
  ] = `Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.`;
  fallback[
    `bootstrap_error`
  ] = `Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!`;
  fallback[`use_reallife_width`] = `Use real-life Width`;
  fallback[
    `use_reallife_width_descr`
  ] = `When enabled, the segments thickness will be computed from the road's width instead of using the value set in the preferences`;
  fallback[`road_themes_title`] = `Road Themes`;
  fallback[
    `road_themes_descr`
  ] = `Applies a predefined theme to your preferences`;
  fallback[`show_ans`] = `Show Alternative Names`;
  fallback[
    `show_ans_descr`
  ] = `When enabled, at most 2 ANs that differ from the primary name are shown under the street name.`;
  fallback[`layer_opacity`] = `Layer Opacity`;
  fallback[`layer_opacity_descr`] = `10: almost invisible, 100: opaque.`;
  fallback[`enable_routing_mode`] = `Enable Routing Mode`;
  fallback[
    `enable_routing_mode_descr`
  ] = `When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway.`;
  fallback[`hide_routing_mode_panel`] = `Hide the Routing Mode Panel`;
  fallback[
    `hide_routing_mode_panel_descr`
  ] = `When enabled, the overlay to temporarily disable the routing mode is not shown.`;
  fallback[`gps_layer_above_roads`] = `GPS Layer above Roads`;
  fallback[
    `gps_layer_above_roads_descr`
  ] = `When enabled, the GPS tracks layer gets shown above the road layer.`;
  fallback[`label_width`] = `Labels Outline Width`;
  fallback[`label_width_descr`] = `How much border should the labels have?`;
  fallback[`hide_road_layer`] = `Hide WME Road Layer`;
  fallback[
    `hide_road_layer_descr`
  ] = `When enabled, the WME standard road layer gets hidden automatically.`;
  fallback[`svl_initially_disabled`] = `SVL Initially Disabled`;
  fallback[
    `svl_initially_disabled_descr`
  ] = `When enabled, the SVL does not get enabled automatically.`;
  fallback[`street_names_density`] = `Street Names Density`;
  fallback[
    `street_names_density_descr`
  ] = `For a higher value, less elements will be shown.`;
  fallback[`render_geometry_nodes`] = `Render Geometry Nodes`;
  fallback[
    `render_geometry_nodes_descr`
  ] = `When enabled, the geometry nodes are drawn, too.`;
  fallback[`render_as_level`] = `Render Map as Level`;
  fallback[
    `render_as_level_descr`
  ] = `All segments locked above this level will be stroked through with a black line.`;
  fallback[`font_size_close`] = `Font Size (at close zoom)`;
  fallback[
    `font_size_close_descr`
  ] = `Increase this value if you can't read the street names because they are too small.`;
  fallback[`limit_arrows`] = `Limit Arrows`;
  fallback[
    `limit_arrows_descr`
  ] = `Increase this value if you want less arrows to be shown on streets (this may increase the script's performance).`;
  fallback[`far_zoom_only`] = `Far-zoom only`;
  fallback[`close_zoom_only`] = `Close-zoom only`;
  fallback[`font_size_far`] = `Font Size (at far zoom)`;
  fallback[
    `font_size_far_descr`
  ] = `Increase this value if you can't read the street names because they are too small.`;
  fallback[`hide_minor_roads`] = `Hide minor roads at zoom 3`;
  fallback[
    `hide_minor_roads_descr`
  ] = `The WME loads some type of roads when they probably shouldn't be there, check this option for avoid displaying them at higher zooms.`;
  fallback[`automatically_refresh`] = `Automatically Refresh the Map`;
  fallback[
    `automatically_refresh_descr`
  ] = `When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.`;
  fallback[`autoreload_interval`] = `Auto Reload Time Interval (in Seconds)`;
  fallback[
    `autoreload_interval_descr`
  ] = `How often should the WME be refreshed for new edits?`;
  fallback[`stop_svl_at_zoom`] = `Stop using SVL at zoom level`;
  fallback[
    `stop_svl_at_zoom_descr`
  ] = `When you reach this zoom level, the WME's road layer gets automatically enabled.`;
  fallback[`close_zoom_until_level`] = `Close-zoom until zoom level`;
  fallback[
    `close_zoom_until_level_descr`
  ] = `When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)`;
  fallback[`segments_threshold`] = `Segments threshold`;
  fallback[
    `segments_threshold_descr`
  ] = `When the WME wants to draw more than this amount of segments, switch to the WME's road layer`;
  fallback[`nodes_threshold`] = `Nodes threshold`;
  fallback[
    `nodes_threshold_descr`
  ] = `When the WME wants to draw more than this amount of nodes, switch to the WME's road layer`;
  fallback[`show_sl_on_name`] = `Show on the Street Name`;
  fallback[
    `show_sl_on_name_descr`
  ] = `Show the speed limit as text at the end of the street name.`;
  fallback[`show_sl_with_colors`] = `Show using colors`;
  fallback[
    `show_sl_with_colors_descr`
  ] = `Show the speed limit by coloring the segment's outline.`;
  fallback[`show_sl_with_one_color`] = `Show using Single Color`;
  fallback[
    `show_sl_with_one_color_descr`
  ] = `Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value.`;
  fallback[
    `show_unverified_dashed`
  ] = `Show unverified Speed Limits with a dashed Line`;
  fallback[
    `show_unverified_dashed_descr`
  ] = `If the speed limit is not verified, it will be shown with a different style.`;

  initSVL();
}
