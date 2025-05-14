(function () {
    'use strict';

    unsafeWindow.SDK_INITIALIZED.then(initScript);
    function initScript() {
        if (!unsafeWindow.getWmeSdk) {
            throw new Error("SDK not available");
        }
        const wmeSDK = unsafeWindow.getWmeSdk({
            scriptId: "svl-sdk",
            scriptName: "Street Vector Layer"
        });
        console.debug(`SDK v. ${wmeSDK.getSDKVersion()} on ${wmeSDK.getWMEVersion()} initialized`);
        const SVL_VERSION = GM_info.script.version;
        const DEBUG = unsafeWindow.localStorage.getItem('svlDebugOn') === 'true';
        const consoleDebug = DEBUG
            ? (...args) => {
                for (let i = 0; i < args.length; i += 1) {
                    if (typeof args[i] === 'string') {
                        console.log(`[SVL] ${SVL_VERSION}: ${args[i]}`);
                    }
                    else {
                        console.dir(args[i]);
                    }
                }
            }
            : () => { };
        const consoleGroup = DEBUG ? console.group : () => { };
        const consoleGroupEnd = DEBUG ? console.groupEnd : () => { };
        const assertFeatureDoesNotExist = DEBUG
            ? (id, layer) => {
                if (layer.getFeaturesByAttribute("sID", id).length > 0) {
                    console.error(`[SVL] Performance. Feature with id ${id} already exists in layer ${layer.name}`);
                    console.dir(wmeSDK.Events);
                    console.trace();
                    throw new Error(`Feature with id ${id} already exists in layer ${layer.name}`);
                }
            }
            : () => { };
        let onlineTranslations = false;
        let autoLoadInterval = null;
        let clutterConstant;
        const segmentEventsRemoveCallbacks = [];
        const nodeEventsRemoveCallbacks = [];
        let manageWMEStreetLayerCallback = null;
        let countryID = null;
        let streetStyles = [];
        let streetVectorLayer;
        let nodesVector;
        let labelsVector;
        let drawingAborted = false;
        let preferences;
        let WMERoadLayer;
        let SVLAutomDisabled;
        let OLMap;
        let gmapsProjection;
        const ROAD_LAYER = 0;
        const SVL_LAYER = 1;
        const layerCheckboxes = {
            'ROAD_LAYER': null,
            'SVL_LAYER': null,
        };
        const clutterMax = 20;
        const fontSizeMax = 32;
        const superScript = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
        const validatedStyle = {
            strokeColor: '#F53BFF',
            strokeDashstyle: 'solid',
        };
        const roundaboutStyle = {
            strokeColor: '#111111',
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
        const safeAlert = (level, message) => {
            try {
                WazeWrap.Alerts[level](GM_info.script.name, message);
            }
            catch (e) {
                console.error(e);
                alert(message);
            }
        };
        function isFarZoom(zoom = wmeSDK.Map.getZoomLevel()) {
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
                document.querySelector('#panel-container')?.hasChildNodes() === false) {
                wmeSDK.DataModel.refreshData();
            }
        }
        function setLayerVisibility(layer, visibility, trial = 0) {
            if (layer === SVL_LAYER) {
                consoleDebug(`Changing SVL Layer visibility to ${visibility}`);
            }
            else if (WMERoadLayer) {
                consoleDebug(`Changing Road Layer visibility to ${visibility}`);
            }
            else {
                console.warn("SVL: cannot toggle the WME's road layer");
            }
            if (!layerCheckboxes[layer]) {
                consoleDebug(`Initialising checkbox for layer ${layer}`);
                layerCheckboxes[layer] = document.getElementById(layer === SVL_LAYER
                    ? 'layer-switcher-item_street_vector_layer'
                    : 'layer-switcher-item_road');
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
        }
        function savePreferences(pref, silent = true) {
            consoleDebug('savePreferences');
            pref.version = SVL_VERSION;
            try {
                unsafeWindow.localStorage.setItem('svl', JSON.stringify(pref));
                if (!silent) {
                    safeAlert('success', _('preferences_saved'));
                }
            }
            catch (e) {
                console.error(e);
                safeAlert('error', _('preferences_saving_error'));
            }
        }
        function saveDefaultPreferences() {
            consoleDebug('saveDefaultPreferences');
            loadPreferences(true);
        }
        const defaultLaneWidthMeters = {
            '1': 3.1,
            '2': 3.5,
            '3': 4.5,
            '4': 3.5,
            '5': 1,
            '6': 4.2,
            '7': 4,
            '8': 4,
            '10': 1,
            '15': 4,
            '16': 1,
            '17': 3.5,
            '18': 3,
            '19': 2.5,
            '20': 3,
            '22': 2.5,
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
        function loadPreferences(overwrite = false) {
            let oldUser = true;
            let loadedPreferences = null;
            if (overwrite === true) {
                unsafeWindow.localStorage.removeItem('svl');
            }
            else {
                const pref = unsafeWindow.localStorage.getItem('svl');
                if (pref) {
                    loadedPreferences = JSON.parse(pref);
                }
            }
            if (loadedPreferences === null) {
                if (overwrite) {
                    consoleDebug('Overwriting existing preferences');
                }
                else {
                    oldUser = false;
                    consoleDebug('Creating new preferences for the first time');
                }
            }
            preferences = {};
            preferences['autoReload'] = {};
            preferences['autoReload']['interval'] =
                loadedPreferences?.['autoReload']?.['interval'] ?? 60000;
            preferences['autoReload']['enabled'] =
                loadedPreferences?.['autoReload']?.['enabled'] ?? false;
            preferences['showSLSinglecolor'] =
                loadedPreferences?.['showSLSinglecolor'] ?? false;
            preferences['SLColor'] = loadedPreferences?.['SLColor'] ?? '#ffdf00';
            preferences['fakelock'] =
                loadedPreferences?.['fakelock'] ?? wmeSDK.State.getUserInfo()?.rank ?? 6;
            preferences['hideMinorRoads'] =
                loadedPreferences?.['hideMinorRoads'] ?? true;
            preferences['showDashedUnverifiedSL'] =
                loadedPreferences?.['showDashedUnverifiedSL'] ?? true;
            preferences['showSLcolor'] = loadedPreferences?.['showSLcolor'] ?? true;
            preferences['showSLtext'] = loadedPreferences?.['showSLtext'] ?? true;
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
            preferences['streets'][1] = {
                'strokeColor': loadedPreferences?.['streets'][1]?.['strokeColor'] ?? '#FFFFFF',
                'strokeWidth': loadedPreferences?.['streets'][1]?.['strokeWidth'] ?? 10,
                'strokeDashstyle': loadedPreferences?.['streets'][1]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][20] = {
                'strokeColor': loadedPreferences?.['streets'][20]?.['strokeColor'] ?? '#2282AB',
                'strokeWidth': loadedPreferences?.['streets'][20]?.['strokeWidth'] ?? 9,
                'strokeDashstyle': loadedPreferences?.['streets'][20]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][4] = {
                'strokeColor': loadedPreferences?.['streets'][4]?.['strokeColor'] ?? '#3FC91C',
                'strokeWidth': loadedPreferences?.['streets'][4]?.['strokeWidth'] ?? 11,
                'strokeDashstyle': loadedPreferences?.['streets'][4]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][3] = {
                'strokeColor': loadedPreferences?.['streets'][3]?.['strokeColor'] ?? '#387FB8',
                'strokeWidth': loadedPreferences?.['streets'][3]?.['strokeWidth'] ?? 18,
                'strokeDashstyle': loadedPreferences?.['streets'][3]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][7] = {
                'strokeColor': loadedPreferences?.['streets'][7]?.['strokeColor'] ?? '#ECE589',
                'strokeWidth': loadedPreferences?.['streets'][7]?.['strokeWidth'] ?? 14,
                'strokeDashstyle': loadedPreferences?.['streets'][7]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][6] = {
                'strokeColor': loadedPreferences?.['streets'][6]?.['strokeColor'] ?? '#C13040',
                'strokeWidth': loadedPreferences?.['streets'][6]?.['strokeWidth'] ?? 16,
                'strokeDashstyle': loadedPreferences?.['streets'][6]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][16] = {
                'strokeColor': loadedPreferences?.['streets'][16]?.['strokeColor'] ?? '#B700FF',
                'strokeWidth': loadedPreferences?.['streets'][16]?.['strokeWidth'] ?? 5,
                'strokeDashstyle': loadedPreferences?.['streets'][16]?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['streets'][5] = {
                'strokeColor': loadedPreferences?.['streets'][5]?.['strokeColor'] ?? '#00FF00',
                'strokeWidth': loadedPreferences?.['streets'][5]?.['strokeWidth'] ?? 5,
                'strokeDashstyle': loadedPreferences?.['streets'][5]?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['streets'][8] = {
                'strokeColor': loadedPreferences?.['streets'][8]?.['strokeColor'] ?? '#82614A',
                'strokeWidth': loadedPreferences?.['streets'][8]?.['strokeWidth'] ?? 7,
                'strokeDashstyle': loadedPreferences?.['streets'][8]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][15] = {
                'strokeColor': loadedPreferences?.['streets'][15]?.['strokeColor'] ?? '#FF8000',
                'strokeWidth': loadedPreferences?.['streets'][15]?.['strokeWidth'] ?? 5,
                'strokeDashstyle': loadedPreferences?.['streets'][15]?.['strokeDashstyle'] ?? 'dashdot',
            };
            preferences['streets'][18] = {
                'strokeColor': loadedPreferences?.['streets'][18]?.['strokeColor'] ?? '#FFFFFF',
                'strokeWidth': loadedPreferences?.['streets'][18]?.['strokeWidth'] ?? 8,
                'strokeDashstyle': loadedPreferences?.['streets'][18]?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['streets'][17] = {
                'strokeColor': loadedPreferences?.['streets'][17]?.['strokeColor'] ?? '#00FFB3',
                'strokeWidth': loadedPreferences?.['streets'][17]?.['strokeWidth'] ?? 7,
                'strokeDashstyle': loadedPreferences?.['streets'][17]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][22] = {
                'strokeColor': loadedPreferences?.['streets'][22]?.['strokeColor'] ?? '#C6C7FF',
                'strokeWidth': loadedPreferences?.['streets'][22]?.['strokeWidth'] ?? 6,
                'strokeDashstyle': loadedPreferences?.['streets'][22]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][19] = {
                'strokeColor': loadedPreferences?.['streets'][19]?.['strokeColor'] ?? '#00FF00',
                'strokeWidth': loadedPreferences?.['streets'][19]?.['strokeWidth'] ?? 5,
                'strokeDashstyle': loadedPreferences?.['streets'][19]?.['strokeDashstyle'] ?? 'dashdot',
            };
            preferences['streets'][2] = {
                'strokeColor': loadedPreferences?.['streets'][2]?.['strokeColor'] ?? '#CBA12E',
                'strokeWidth': loadedPreferences?.['streets'][2]?.['strokeWidth'] ?? 12,
                'strokeDashstyle': loadedPreferences?.['streets'][2]?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['streets'][10] = {
                'strokeColor': loadedPreferences?.['streets'][10]?.['strokeColor'] ?? '#0000FF',
                'strokeWidth': loadedPreferences?.['streets'][10]?.['strokeWidth'] ?? 5,
                'strokeDashstyle': loadedPreferences?.['streets'][10]?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['red'] = {
                'strokeColor': loadedPreferences?.['red']?.['strokeColor'] ?? '#FF0000',
                'strokeDashstyle': loadedPreferences?.['red']?.['strokeDashstyle'] ?? 'solid',
            };
            preferences['roundabout'] = {
                'strokeColor': loadedPreferences?.['roundabout']?.['strokeColor'] ?? '#111',
                'strokeWidth': loadedPreferences?.['roundabout']?.['strokeWidth'] ?? 1,
                'strokeDashstyle': loadedPreferences?.['roundabout']?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['lanes'] = {
                'strokeColor': loadedPreferences?.['lanes']?.['strokeColor'] ?? '#454443',
                'strokeDashstyle': loadedPreferences?.['lanes']?.['strokeDashstyle'] ?? 'dash',
                'strokeOpacity': loadedPreferences?.['lanes']?.['strokeOpacity'] ?? 0.9,
            };
            preferences['toll'] = {
                'strokeColor': loadedPreferences?.['toll']?.['strokeColor'] ?? '#00E1FF',
                'strokeDashstyle': loadedPreferences?.['toll']?.['strokeDashstyle'] ?? 'solid',
                'strokeOpacity': loadedPreferences?.['toll']?.['strokeOpacity'] ?? 1.0,
            };
            preferences['closure'] = {
                'strokeColor': loadedPreferences?.['closure']?.['strokeColor'] ?? '#FF00FF',
                'strokeOpacity': loadedPreferences?.['closure']?.['strokeOpacity'] ?? 1.0,
                'strokeDashstyle': loadedPreferences?.['closure']?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['headlights'] = {
                'strokeColor': loadedPreferences?.['headlights']?.['strokeColor'] ?? '#bfff00',
                'strokeOpacity': loadedPreferences?.['headlights']?.['strokeOpacity'] ?? 0.9,
                'strokeDashstyle': loadedPreferences?.['headlights']?.['strokeDashstyle'] ?? 'dot',
            };
            preferences['nearbyHOV'] = {
                'strokeColor': loadedPreferences?.['nearbyHOV']?.['strokeColor'] ?? '#ff66ff',
                'strokeOpacity': loadedPreferences?.['nearbyHOV']?.['strokeOpacity'] ?? 1.0,
                'strokeDashstyle': loadedPreferences?.['nearbyHOV']?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['restriction'] = {
                'strokeColor': loadedPreferences?.['restriction']?.['strokeColor'] ?? '#F2FF00',
                'strokeOpacity': loadedPreferences?.['restriction']?.['strokeOpacity'] ?? 1.0,
                'strokeDashstyle': loadedPreferences?.['restriction']?.['strokeDashstyle'] ?? 'dash',
            };
            preferences['dirty'] = {
                'strokeColor': loadedPreferences?.['dirty']?.['strokeColor'] ?? '#82614A',
                'strokeOpacity': loadedPreferences?.['dirty']?.['strokeOpacity'] ?? 0.6,
                'strokeDashstyle': loadedPreferences?.['dirty']?.['strokeDashstyle'] ?? 'longdash',
            };
            preferences['speeds'] = {};
            preferences['speeds']['default'] =
                loadedPreferences?.['speed']?.['default'] ?? '#cc0000';
            if (loadedPreferences?.['speeds']?.['metric']) {
                preferences['speeds']['metric'] = loadedPreferences['speeds']['metric'];
            }
            else {
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
            }
            else {
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
            savePreferences(preferences);
            return oldUser;
        }
        function bestBackground(color) {
            const oppositeColor = parseInt(color.substring(1, 3), 16) * 0.299 +
                parseInt(color.substring(3, 5), 16) * 0.587 +
                parseInt(color.substring(5, 7), 16) * 0.114;
            if (oppositeColor < 127) {
                return '#FFF';
            }
            return '#000';
        }
        function getColorStringFromSpeed(metricspeed) {
            if (preferences['showSLSinglecolor']) {
                return preferences['SLColor'];
            }
            const type = W.prefs.attributes['isImperial'] ? 'imperial' : 'metric';
            const speed = W.prefs.attributes['isImperial']
                ? Math.round(metricspeed / 1.609344)
                : metricspeed;
            return (preferences['speeds'][type][speed] ?? preferences['speeds']['default']);
        }
        function getAngle(isForward, p0, p1) {
            let dx = 0;
            let dy = 0;
            if (isForward) {
                dx = p1.x - p0.x;
                dy = p1.y - p0.y;
            }
            else {
                dx = p0.x - p1.x;
                dy = p0.y - p1.y;
            }
            const angle = Math.atan2(dx, dy);
            return (angle * 180) / Math.PI;
        }
        function getSuperScript(number) {
            let res = '';
            if (number) {
                let numberString = number.toString();
                if (W.prefs.attributes['isImperial'] === true) {
                    numberString = Math.round(number / 1.609344).toString();
                }
                numberString = numberString.toString();
                for (let i = 0; i < numberString.length; i += 1) {
                    res += superScript[numberString.charAt(i)];
                }
            }
            return res;
        }
        function hasNonEmptyStreet(segment) {
            const e = segment.getAddress(W.model);
            return null != e.getStreet() && !e.isEmptyStreet();
        }
        function drawLabels(segmentModel, simplified) {
            let labelFeature;
            let labelText;
            let directionArrow;
            let p0;
            let p1;
            const labels = [];
            labelFeature = null;
            const attributes = segmentModel.getAttributes();
            const address = segmentModel.getAddress(W.model);
            const hasStreetName = hasNonEmptyStreet(segmentModel);
            let streetPart = '';
            if (hasStreetName) {
                streetPart = address.getStreetName();
            }
            else if (attributes.roadType < 10 && !segmentModel.isInRoundabout()) {
                streetPart = '⚑';
            }
            let altStreetPart = '';
            if (preferences['showANs']) {
                let ANsShown = 0;
                for (let i = 0; i < attributes.streetIDs.length; i += 1) {
                    const streetID = attributes.streetIDs[i];
                    if (ANsShown === 2) {
                        altStreetPart += ' …';
                        break;
                    }
                    const altStreet = W.model.streets.getObjectById(streetID);
                    const altStreetName = altStreet?.name ?? altStreet?.getName();
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
                }
                else if (attributes.fwdMaxSpeed) {
                    speedPart = getSuperScript(attributes.fwdMaxSpeed);
                    if (attributes.revMaxSpeed) {
                        speedPart += `'${getSuperScript(attributes.revMaxSpeed)}`;
                    }
                }
                else {
                    speedPart = getSuperScript(attributes.revMaxSpeed);
                    if (attributes.fwdMaxSpeed) {
                        speedPart += `'${getSuperScript(attributes.fwdMaxSpeed)}`;
                    }
                }
                if (attributes.fwdMaxSpeedUnverified ||
                    attributes.revMaxSpeedUnverified) {
                    speedPart += '?';
                }
            }
            labelText = `${streetPart} ${speedPart}`;
            if (labelText === ' ') {
                return [];
            }
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
            const distances = [];
            for (let p = 0; p < simplified.length - 1; p += 1) {
                const distance = simplified[p].distanceTo(simplified[p + 1]);
                distances.push({ index: p, distance });
            }
            distances.sort((a, b) => a.distance > b.distance ? -1 : a.distance < b.distance ? 1 : 0);
            let labelsToInsert = streetPart === '' ? 1 : distances.length;
            const requiredSpace = clutterConstant * labelText.length;
            for (let i = 0; i < distances.length && labelsToInsert > 0; i += 1) {
                if (distances[i].distance < (i > 0 ? requiredSpace : requiredSpace - 30)) {
                    break;
                }
                const p = distances[i].index;
                let dx = 0;
                let dy = 0;
                p0 = simplified[p];
                p1 = new OpenLayers.Geometry.LineString([
                    p0,
                    simplified[p + 1],
                ]).getCentroid(true);
                labelFeature = sampleLabel.clone();
                labelFeature.geometry = p1;
                if (attributes.fwdDirection) {
                    dx = p1.x - p0.x;
                    dy = p1.y - p0.y;
                }
                else {
                    dx = p0.x - p1.x;
                    dy = p0.y - p1.y;
                }
                const angle = Math.atan2(dx, dy);
                let degrees = 90 + (angle * 180) / Math.PI;
                if (streetPart !== '') {
                    directionArrow = ' ▶ ';
                    if (degrees > 90 && degrees < 270) {
                        degrees -= 180;
                    }
                    else {
                        directionArrow = ' ◀ ';
                    }
                }
                else {
                    directionArrow = '';
                }
                if (!segmentModel.isOneWay()) {
                    directionArrow = '';
                }
                labelFeature.attributes.label =
                    directionArrow + labelText + directionArrow + altStreetPart;
                labelFeature.attributes['angle'] = degrees;
                labelFeature.attributes.closeZoomOnly = p % 2 === 1;
                labelFeature.attributes.showAtzoom = labelsToInsert;
                labelsToInsert -= 1;
                labels.push(labelFeature);
            }
            return labels;
        }
        function createAverageSpeedCamera({ id, rev, isForward, p0, p1 }) {
            const degrees = getAngle(isForward, rev ? p1 : p0, rev ? p0 : p1);
            return new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(p0.x + Math.sin(degrees) * 10, p0.y + Math.cos(degrees) * 10), {
                'sID': id,
            }, {
                'rotation': degrees,
                'externalGraphic': 'https://raw.githubusercontent.com/bedo2991/svl/master/average.png',
                'graphicWidth': 36,
                'graphicHeight': 36,
                'graphicZIndex': 300,
                'fillOpacity': 1,
                'pointerEvents': 'none',
            });
        }
        function drawSegment(model) {
            if (!model || model.getState() === 'DELETE')
                return {};
            const attributes = model.getAttributes();
            assertFeatureDoesNotExist(attributes.id, streetVectorLayer);
            consoleDebug(`Drawing segment: ${attributes.id}`);
            const geoPoints = model.getGeometry().coordinates;
            const olPointArray = geoPoints.map(geoPoint => new OpenLayers.Geometry.Point(geoPoint[0], geoPoint[1]).transform(gmapsProjection, OLMap.projection));
            const simplified = new OpenLayers.Geometry.LineString(olPointArray).simplify(1.5).components;
            const segmentFeatures = [];
            const baselevel = attributes.level * 100;
            const isTwoWay = attributes.fwdDirection && attributes.revDirection;
            const isInRoundabout = model.isInRoundabout();
            let isBridge = false;
            let hasSpeedLimitDrawn = false;
            let roadType = attributes.roadType;
            let segmentWidth = 0;
            if (preferences['realsize']) {
                let segmentWidthFrom = 0;
                let segmentWidthTo = 0;
                if (attributes.fromLanesInfo) {
                    if (attributes.fromLanesInfo.laneWidth) {
                        segmentWidthFrom =
                            (attributes.fromLanesInfo.numberOfLanes *
                                attributes.fromLanesInfo.laneWidth) /
                                100.0;
                    }
                    else {
                        segmentWidthFrom =
                            attributes.fromLanesInfo.numberOfLanes *
                                defaultLaneWidthMeters[attributes.roadType];
                    }
                }
                else {
                    segmentWidthFrom = defaultLaneWidthMeters[attributes.roadType];
                }
                if (attributes.toLanesInfo) {
                    if (attributes.toLanesInfo.laneWidth) {
                        segmentWidthTo =
                            (attributes.toLanesInfo.numberOfLanes *
                                attributes.toLanesInfo.laneWidth) /
                                100.0;
                    }
                    else {
                        segmentWidthTo =
                            attributes.toLanesInfo.numberOfLanes *
                                defaultLaneWidthMeters[attributes.roadType];
                    }
                }
                else {
                    segmentWidthTo = defaultLaneWidthMeters[attributes.roadType];
                }
                if (!isTwoWay) {
                    segmentWidth = attributes.fwdDirection
                        ? segmentWidthFrom
                        : segmentWidthTo;
                }
                else if (segmentWidthTo != segmentWidthFrom) {
                    segmentWidth = segmentWidthFrom + segmentWidthTo;
                }
                else if (segmentWidthFrom) {
                    segmentWidth = segmentWidthFrom * 2.0;
                }
            }
            else {
                segmentWidth = streetStyles[roadType].strokeWidth;
            }
            const totalSegmentWidth = segmentWidth;
            let roadWidth = totalSegmentWidth;
            let lineFeature = null;
            if (attributes.primaryStreetID === null) {
                lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                    'sID': attributes.id,
                    'color': preferences['red']['strokeColor'],
                    'width': totalSegmentWidth,
                    'dash': preferences['red']['strokeDashstyle'],
                });
                segmentFeatures.push(lineFeature);
                return { segmentFeatures };
            }
            if (preferences['routingModeEnabled'] &&
                attributes.routingRoadType !== null) {
                roadType = attributes.routingRoadType;
            }
            if (streetStyles[roadType] !== undefined) {
                const speed = attributes.fwdMaxSpeed ?? attributes.revMaxSpeed;
                if (attributes.level > 0) {
                    isBridge = true;
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': '#000000',
                        'zIndex': baselevel + 100,
                        'width': totalSegmentWidth,
                    });
                    segmentFeatures.push(lineFeature);
                }
                hasSpeedLimitDrawn = speed && preferences['showSLcolor'];
                if (hasSpeedLimitDrawn && isBridge) {
                    roadWidth = totalSegmentWidth * 0.56;
                }
                else if (isBridge || hasSpeedLimitDrawn) {
                    roadWidth = totalSegmentWidth * 0.68;
                }
                if (hasSpeedLimitDrawn) {
                    const speedStrokeStyle = preferences['showDashedUnverifiedSL'] &&
                        (attributes.fwdMaxSpeedUnverified || attributes.revMaxSpeedUnverified)
                        ? 'dash'
                        : 'solid';
                    if (!preferences['showSLSinglecolor'] &&
                        (attributes.fwdMaxSpeed || attributes.revMaxSpeed) &&
                        attributes.fwdMaxSpeed !== attributes.revMaxSpeed &&
                        !model.isOneWay()) {
                        const offset = isBridge
                            ? totalSegmentWidth * 0.14
                            : totalSegmentWidth * 0.22;
                        const left = [];
                        const right = [];
                        for (let k = 0; k < olPointArray.length - 1; k += 1) {
                            const pk = olPointArray[k];
                            const pk1 = olPointArray[k + 1];
                            const dx = pk.x - pk1.x;
                            const dy = pk.y - pk1.y;
                            left[0] = pk.clone();
                            right[0] = pk.clone();
                            left[1] = pk1.clone();
                            right[1] = pk1.clone();
                            if (Math.abs(dx) < 0.5) {
                                if (dy > 0) {
                                    left[0].move(-offset, 0);
                                    left[1].move(-offset, 0);
                                    right[0].move(offset, 0);
                                    right[1].move(offset, 0);
                                }
                                else {
                                    left[0].move(offset, 0);
                                    left[1].move(offset, 0);
                                    right[0].move(-offset, 0);
                                    right[1].move(-offset, 0);
                                }
                            }
                            else {
                                const m = dy / dx;
                                const mb = -1 / m;
                                if (Math.abs(m) < 0.05) {
                                    if (dx > 0) {
                                        left[0].move(0, offset);
                                        left[1].move(0, offset);
                                        right[0].move(0, -offset);
                                        right[1].move(0, -offset);
                                    }
                                    else {
                                        left[0].move(0, -offset);
                                        left[1].move(0, -offset);
                                        right[0].move(0, offset);
                                        right[1].move(0, offset);
                                    }
                                }
                                else {
                                    let appliedOffset = offset;
                                    if ((dy > 0 && dx > 0) || (dx < 0 && dy > 0)) {
                                        appliedOffset = -offset;
                                    }
                                    const temp = Math.sqrt(1 + mb * mb);
                                    left[0].move(appliedOffset / temp, appliedOffset * (mb / temp));
                                    left[1].move(appliedOffset / temp, appliedOffset * (mb / temp));
                                    right[0].move(-appliedOffset / temp, -appliedOffset * (mb / temp));
                                    right[1].move(-appliedOffset / temp, -appliedOffset * (mb / temp));
                                }
                            }
                            lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(left), {
                                'sID': attributes.id,
                                'color': getColorStringFromSpeed(attributes.fwdMaxSpeed),
                                'width': roadWidth,
                                'dash': speedStrokeStyle,
                                closeZoomOnly: true,
                                'zIndex': baselevel + 105,
                            });
                            segmentFeatures.push(lineFeature);
                            lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(right), {
                                'sID': attributes.id,
                                'color': getColorStringFromSpeed(attributes.revMaxSpeed),
                                'width': roadWidth,
                                'dash': speedStrokeStyle,
                                closeZoomOnly: true,
                                'zIndex': baselevel + 110,
                            });
                            segmentFeatures.push(lineFeature);
                        }
                    }
                    else {
                        let speedValue = attributes.fwdMaxSpeed;
                        if (model.isOneWay() && attributes.revDirection) {
                            speedValue = attributes.revMaxSpeed;
                        }
                        if (speedValue) {
                            lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                                'sID': attributes.id,
                                'color': getColorStringFromSpeed(speedValue),
                                'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                                'dash': speedStrokeStyle,
                                closeZoomOnly: true,
                                'zIndex': baselevel + 115,
                            });
                            segmentFeatures.push(lineFeature);
                        }
                    }
                }
                lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                    'sID': attributes.id,
                    'color': streetStyles[roadType]['strokeColor'],
                    'width': roadWidth,
                    'dash': streetStyles[roadType]['strokeDashstyle'],
                    'zIndex': baselevel + 120,
                });
                segmentFeatures.push(lineFeature);
                if (attributes.level < 0) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': '#000000',
                        'width': roadWidth,
                        'opacity': 0.3,
                        'zIndex': baselevel + 125,
                    });
                    segmentFeatures.push(lineFeature);
                }
                const currentLock = model.getLockRank() + 1;
                if (currentLock > preferences['fakelock'] ||
                    currentLock > WazeWrap?.User?.Rank()) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': nonEditableStyle.strokeColor,
                        'width': roadWidth * 0.1,
                        'dash': nonEditableStyle.strokeDashstyle,
                        'zIndex': baselevel + 147,
                    });
                    segmentFeatures.push(lineFeature);
                }
                const flags = model.getFlagAttributes();
                if (flags.unpaved) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': preferences['dirty']['strokeColor'],
                        'width': roadWidth * 0.7,
                        'opacity': preferences['dirty']['strokeOpacity'],
                        'dash': preferences['dirty']['strokeDashstyle'],
                        'zIndex': baselevel + 135,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (attributes.hasClosures) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': preferences['closure']['strokeColor'],
                        'width': roadWidth * 0.6,
                        'dash': preferences['closure']['strokeDashstyle'],
                        'opacity': preferences['closure']['strokeOpacity'],
                        closeZoomOnly: true,
                        'zIndex': baselevel + 140,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (attributes.fwdToll ||
                    attributes.revToll ||
                    attributes.restrictions.some((r) => r.getDefaultType() === 'TOLL')) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': preferences['toll']['strokeColor'],
                        'width': roadWidth * 0.3,
                        'dash': preferences['toll']['strokeDashstyle'],
                        'opacity': preferences['toll']['strokeOpacity'],
                        'zIndex': baselevel + 145,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (isInRoundabout) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': roundaboutStyle.strokeColor,
                        'width': roadWidth * 0.15,
                        'dash': roundaboutStyle.strokeDashstyle,
                        'opacity': roundaboutStyle.strokeOpacity,
                        closeZoomOnly: true,
                        'zIndex': baselevel + 150,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (attributes.restrictions.length > 0) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': preferences['restriction']['strokeColor'],
                        'width': roadWidth * 0.4,
                        'dash': preferences['restriction']['strokeDashstyle'],
                        'opacity': preferences['restriction']['strokeOpacity'],
                        closeZoomOnly: true,
                        'zIndex': baselevel + 155,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (attributes.validated === false) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': validatedStyle.strokeColor,
                        'width': roadWidth * 0.5,
                        'dash': validatedStyle.strokeDashstyle,
                        closeZoomOnly: true,
                        'zIndex': baselevel + 160,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (flags.headlights) {
                    segmentFeatures.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': preferences['headlights']['strokeColor'],
                        'width': roadWidth * 0.2,
                        'dash': preferences['headlights']['strokeDashstyle'],
                        'opacity': preferences['headlights']['strokeOpacity'],
                        closeZoomOnly: true,
                        'zIndex': baselevel + 165,
                    }));
                }
                if (flags.nearbyHOV) {
                    segmentFeatures.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': preferences['nearbyHOV']['strokeColor'],
                        'width': roadWidth * 0.25,
                        'dash': preferences['nearbyHOV']['strokeDashstyle'],
                        'opacity': preferences['nearbyHOV']['strokeOpacity'],
                        closeZoomOnly: true,
                        'zIndex': baselevel + 166,
                    }));
                }
                if (attributes.fwdLaneCount > 0) {
                    const res = olPointArray.slice(-2);
                    res[0] = new OpenLayers.Geometry.LineString([
                        res[0],
                        res[1],
                    ]).getCentroid(true);
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(res), {
                        'sID': attributes.id,
                        'color': preferences['lanes']['strokeColor'],
                        'width': roadWidth * 0.3,
                        'dash': preferences['lanes']['strokeDashstyle'],
                        'opacity': preferences['lanes']['strokeOpacity'],
                        closeZoomOnly: true,
                        'zIndex': baselevel + 170,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (attributes.revLaneCount > 0) {
                    const res = olPointArray.slice(0, 2);
                    res[1] = new OpenLayers.Geometry.LineString([
                        res[0],
                        res[1],
                    ]).getCentroid(true);
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(res), {
                        'sID': attributes.id,
                        'color': preferences['lanes']['strokeColor'],
                        'width': roadWidth * 0.3,
                        'dash': preferences['lanes']['strokeDashstyle'],
                        'opacity': preferences['lanes']['strokeOpacity'],
                        closeZoomOnly: true,
                        'zIndex': baselevel + 175,
                    });
                    segmentFeatures.push(lineFeature);
                }
                if (attributes.fwdDirection === false ||
                    attributes.revDirection === false) {
                    let simplifiedPoints = olPointArray;
                    if (!isInRoundabout &&
                        attributes.length / olPointArray.length < preferences['arrowDeclutter']) {
                        simplifiedPoints = simplified;
                    }
                    if ((attributes.fwdDirection || attributes.revDirection) === false) {
                        for (let p = 0; p < simplifiedPoints.length - 1; p += 1) {
                            segmentFeatures.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString([
                                simplifiedPoints[p],
                                simplifiedPoints[p + 1],
                            ]).getCentroid(true), {
                                'sID': attributes.id,
                                closeZoomOnly: true,
                                isArrow: true,
                                'zIndex': baselevel + 180,
                            }, unknownDirStyle));
                        }
                    }
                    else {
                        const step = isInRoundabout ? 3 : 1;
                        for (let p = step - 1; p < simplifiedPoints.length - 1; p += step) {
                            const degrees = getAngle(attributes.fwdDirection, simplifiedPoints[p], simplifiedPoints[p + 1]);
                            const segmentLineString = new OpenLayers.Geometry.LineString([
                                simplifiedPoints[p],
                                simplifiedPoints[p + 1],
                            ]);
                            segmentFeatures.push(new OpenLayers.Feature.Vector(segmentLineString.getCentroid(true), {
                                'sID': attributes.id,
                                closeZoomOnly: true,
                                isArrow: true,
                            }, {
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
                            }));
                        }
                    }
                }
                if (flags.fwdSpeedCamera) {
                    segmentFeatures.push(createAverageSpeedCamera({
                        id: attributes.id,
                        rev: false,
                        isForward: attributes.fwdDirection,
                        p0: olPointArray[0],
                        p1: olPointArray[1],
                    }));
                }
                if (flags.revSpeedCamera) {
                    segmentFeatures.push(createAverageSpeedCamera({
                        id: attributes.id,
                        rev: true,
                        isForward: attributes.fwdDirection,
                        p0: olPointArray[olPointArray.length - 1],
                        p1: olPointArray[olPointArray.length - 2],
                    }));
                }
                if (preferences['renderGeomNodes'] === true && !isInRoundabout) {
                    for (let p = 1; p < olPointArray.length - 2; p += 1) {
                        segmentFeatures.push(new OpenLayers.Feature.Vector(olPointArray[p], {
                            'sID': attributes.id,
                            'zIndex': baselevel + 200,
                            closeZoomOnly: true,
                            isArrow: true,
                        }, geometryNodeStyle));
                    }
                }
                if (flags.tunnel) {
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': tunnelFlagStyle1.strokeColor,
                        'opacity': tunnelFlagStyle1.strokeOpacity,
                        'width': roadWidth * 0.3,
                        'dash': tunnelFlagStyle1.strokeDashstyle,
                        'zIndex': baselevel + 177,
                    });
                    segmentFeatures.push(lineFeature);
                    lineFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(olPointArray), {
                        'sID': attributes.id,
                        'color': tunnelFlagStyle2.strokeColor,
                        'width': roadWidth * 0.1,
                        'dash': tunnelFlagStyle2.strokeDashstyle,
                        'zIndex': baselevel + 177,
                    });
                    segmentFeatures.push(lineFeature);
                }
            }
            const labels = drawLabels(model, simplified);
            return { segmentFeatures, labels };
        }
        function drawNode(model) {
            if (model.getState() === 'DELETE')
                return null;
            const attributes = model.getAttributes();
            assertFeatureDoesNotExist(attributes.id, nodesVector);
            const geoPoints = model.getGeometry();
            const point = new OpenLayers.Geometry.Point(geoPoints.coordinates[0], geoPoints.coordinates[1]).transform(gmapsProjection, OLMap.projection);
            const pointFeature = new OpenLayers.Feature.Vector(point, {
                'sID': attributes.id,
            }, getNodeStyle(attributes));
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
                }
                catch (ex) {
                    safeAlert('error', _('preferences_parsing_error'));
                    return;
                }
                if (preferences !== null && preferences['streets']) {
                    updateStylesFromPreferences(preferences);
                    savePreferences(preferences);
                    updatePreferenceValues();
                    safeAlert('success', _('preferences_imported'));
                }
                else {
                    safeAlert('error', 'preferences_importing_error');
                }
            }
        }
        const importPreferencesCallback = () => {
            WazeWrap.Alerts.prompt(GM_info.script.name, `${_('preferences_import_prompt')}\n\n${_('preferences_import_prompt_2')}`, '', importPreferences, null);
        };
        function updateLayerPosition(trial = 0) {
            const gpsLayer = W.map.getLayerByName('gps_points');
            if (gpsLayer) {
                const gpsLayerIndex = parseInt(gpsLayer.getZIndex(), 10);
                consoleDebug(`GPS Layer index: ${gpsLayerIndex}`);
                if (preferences['showUnderGPSPoints']) {
                    streetVectorLayer.setZIndex(gpsLayerIndex - 20);
                    nodesVector.setZIndex(gpsLayerIndex - 15);
                }
                else {
                    streetVectorLayer.setZIndex(gpsLayerIndex + 15);
                    nodesVector.setZIndex(gpsLayerIndex + 20);
                }
            }
            else {
                if (trial < 10) {
                    consoleDebug('The GPS Layer was not available, trial ' + trial);
                    setTimeout(() => {
                        updateLayerPosition(++trial);
                    }, 1000 * trial);
                }
            }
        }
        function createInput({ id, type, className, title, min, max, step }) {
            const input = document.createElement('input');
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
            if (preferences['routingModeEnabled'] &&
                preferences['hideRoutingModeBlock'] !== true) {
                if (div !== null) {
                    return;
                }
                let routingModeDiv = document.createElement('div');
                routingModeDiv.id = ID;
                routingModeDiv.className = 'routingDiv';
                routingModeDiv.innerHTML = `${_('routing_mode_panel_title')}<br><small>${_('routing_mode_panel_body')}<small>`;
                routingModeDiv.addEventListener('mouseenter', () => {
                    preferences['routingModeEnabled'] = false;
                    redrawAllSegments();
                });
                routingModeDiv.addEventListener('mouseleave', () => {
                    preferences['routingModeEnabled'] = true;
                    redrawAllSegments();
                });
                document.getElementById('map').appendChild(routingModeDiv);
            }
            else {
                div?.remove();
            }
        }
        function updateRefreshStatus() {
            clearInterval(autoLoadInterval);
            autoLoadInterval = null;
            if (preferences['autoReload'] && preferences['autoReload']['enabled']) {
                autoLoadInterval = setInterval(refreshWME, preferences['autoReload']['interval']);
            }
        }
        function handleWMESettingsUpdated(shouldRefresh = true) {
            let refreshRequested = false;
            const settings = wmeSDK.Settings.getUserSettings();
            if (settings.isImperial !== preferences['isImperial']) {
                preferences['isImperial'] = settings.isImperial;
                refreshRequested = true;
            }
            if (refreshRequested && shouldRefresh) {
                redrawAllSegments();
            }
        }
        function updateValuesFromPreferences() {
            document.getElementById('svl_saveNewPref').classList.remove('disabled');
            document.getElementById('svl_saveNewPref').disabled = false;
            document.getElementById('svl_saveNewPref').classList.add('btn-primary');
            document.getElementById('svl_rollbackButton').classList.remove('disabled');
            document.getElementById('svl_rollbackButton').disabled = false;
            document.getElementById('svl_buttons').classList.add('svl_unsaved');
            const presetSelect = document.getElementById('svl_presets');
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
            }
            else {
                for (let i = 0; i < preferences['streets'].length; i += 1) {
                    if (preferences['streets'][i]) {
                        preferences['streets'][i] = {};
                        preferences['streets'][i]['strokeColor'] = document.getElementById(`svl_streetColor_${i}`).value;
                        preferences['streets'][i]['strokeWidth'] = document.getElementById(`svl_streetWidth_${i}`).value;
                        preferences['streets'][i]['strokeDashstyle'] = document.querySelector(`#svl_strokeDashstyle_${i} option:checked`).value;
                    }
                }
            }
            preferences['fakelock'] = document.getElementById('svl_fakelock').value;
            const type = wmeSDK.Settings.getUserSettings().isImperial === true ? 'imperial' : 'metric';
            const speeds = Object.keys(preferences['speeds'][type]);
            preferences['speeds'][type] = {};
            for (let i = 1; i < speeds.length + 1; i += 1) {
                const { value } = document.getElementById(`svl_slValue_${type}_${i}`);
                preferences['speeds'][type][value] = (document.getElementById(`svl_slColor_${type}_${i}`)).value;
            }
            preferences['speeds']['default'] = (document.getElementById(`svl_slColor_${type}_Default`)).value;
            preferences['red'] = {};
            preferences['red']['strokeColor'] = document.getElementById('svl_streetColor_red').value;
            preferences['red']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_red option:checked').value;
            preferences['dirty'] = {};
            preferences['dirty']['strokeColor'] = document.getElementById('svl_streetColor_dirty').value;
            preferences['dirty']['strokeOpacity'] =
                document.getElementById('svl_streetOpacity_dirty').value / 100.0;
            preferences['dirty']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_dirty option:checked').value;
            preferences['lanes'] = {};
            preferences['lanes']['strokeColor'] = document.getElementById('svl_streetColor_lanes').value;
            preferences['lanes']['strokeOpacity'] =
                document.getElementById('svl_streetOpacity_lanes').value / 100.0;
            preferences['lanes']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_lanes option:checked').value;
            preferences['toll'] = {};
            preferences['toll']['strokeColor'] = document.getElementById('svl_streetColor_toll').value;
            preferences['toll']['strokeOpacity'] =
                document.getElementById('svl_streetOpacity_toll').value / 100.0;
            preferences['toll']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_toll option:checked').value;
            preferences['restriction'] = {};
            preferences['restriction']['strokeColor'] = document.getElementById('svl_streetColor_restriction').value;
            preferences['restriction']['strokeOpacity'] =
                document.getElementById('svl_streetOpacity_restriction').value / 100.0;
            preferences['restriction']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_restriction option:checked').value;
            preferences['closure'] = {};
            preferences['closure']['strokeColor'] = document.getElementById('svl_streetColor_closure').value;
            preferences['closure']['strokeOpacity'] =
                document.getElementById('svl_streetOpacity_closure').value / 100.0;
            preferences['closure']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_closure option:checked').value;
            preferences['headlights'] = {};
            preferences['headlights']['strokeColor'] = document.getElementById('svl_streetColor_headlights').value;
            preferences['headlights']['strokeOpacity'] =
                document.getElementById('svl_streetOpacity_headlights').value / 100.0;
            preferences['headlights']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_headlights option:checked').value;
            preferences['nearbyHOV'] = {};
            preferences['nearbyHOV']['strokeColor'] = document.getElementById('svl_streetColor_nearbyHOV').value;
            preferences['nearbyHOV']['strokeOpacity'] =
                document.getElementById('svl_streetOpacity_nearbyHOV').value / 100.0;
            preferences['nearbyHOV']['strokeDashstyle'] = document.querySelector('#svl_strokeDashstyle_nearbyHOV option:checked').value;
            preferences['autoReload'] = {};
            preferences['autoReload']['interval'] =
                document.getElementById('svl_autoReload_interval').value * 1000;
            preferences['autoReload']['enabled'] = document.getElementById('svl_autoReload_enabled').checked;
            preferences['clutterConstant'] = document.getElementById('svl_clutterConstant').value;
            preferences['arrowDeclutter'] =
                document.getElementById('svl_arrowDeclutter').value;
            preferences['labelOutlineWidth'] = document.getElementById('svl_labelOutlineWidth').value;
            preferences['disableRoadLayers'] = document.getElementById('svl_disableRoadLayers').checked;
            preferences['startDisabled'] =
                document.getElementById('svl_startDisabled').checked;
            preferences['showSLtext'] =
                document.getElementById('svl_showSLtext').checked;
            preferences['showSLcolor'] =
                document.getElementById('svl_showSLcolor').checked;
            preferences['showSLSinglecolor'] = document.getElementById('svl_showSLSinglecolor').checked;
            preferences['SLColor'] = document.getElementById('svl_SLColor').value;
            preferences['hideMinorRoads'] =
                document.getElementById('svl_hideMinorRoads').checked;
            preferences['showDashedUnverifiedSL'] = document.getElementById('svl_showDashedUnverifiedSL').checked;
            preferences['farZoomLabelSize'] = document.getElementById('svl_farZoomLabelSize').value;
            preferences['closeZoomLabelSize'] = document.getElementById('svl_closeZoomLabelSize').value;
            preferences['renderGeomNodes'] = document.getElementById('svl_renderGeomNodes').checked;
            preferences['nodesThreshold'] =
                document.getElementById('svl_nodesThreshold').value;
            preferences['segmentsThreshold'] = document.getElementById('svl_segmentsThreshold').value;
            preferences['layerOpacity'] =
                document.getElementById('svl_layerOpacity').value / 100.0;
            if (preferences['showUnderGPSPoints'] !==
                document.getElementById('svl_showUnderGPSPoints').checked) {
                preferences['showUnderGPSPoints'] = document.getElementById('svl_showUnderGPSPoints').checked;
                updateLayerPosition();
            }
            else {
                preferences['showUnderGPSPoints'] = document.getElementById('svl_showUnderGPSPoints').checked;
            }
            preferences['routingModeEnabled'] = document.getElementById('svl_routingModeEnabled').checked;
            preferences['hideRoutingModeBlock'] = document.getElementById('svl_hideRoutingModeBlock').checked;
            updateRoutingModePanel();
            preferences['useWMERoadLayerAtZoom'] = document.getElementById('svl_useWMERoadLayerAtZoom').value;
            preferences['switchZoom'] = document.getElementById('svl_switchZoom').value;
            preferences['showANs'] = document.getElementById('svl_showANs').checked;
            preferences['realsize'] = document.getElementById('svl_realsize').checked;
            if (preferences['realsize']) {
                $('input.segmentsWidth').prop('disabled', true);
            }
            else {
                $('input.segmentsWidth').prop('disabled', false);
            }
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
            WazeWrap.Alerts.confirm(GM_info.script.name, `${_('preferences_reset_question')}\n${_('preferences_reset_question_2')}`, resetPreferences, null, _('preferences_reset_yes'), _('preferences_reset_cancel'));
        }
        function createDropdownOption({ id, title, description, options, isNew }) {
            const line = document.createElement('div');
            line.className = 'prefLineSelect';
            {
                line.classList.add('newOption');
                line.dataset.version = isNew;
            }
            const newSelect = document.createElement('select');
            newSelect.className = 'prefElement';
            const label = document.createElement('label');
            label.innerText = title;
            newSelect.id = `svl_${id}`;
            if (options && options.length > 0) {
                options.forEach((o) => {
                    const option = document.createElement('option');
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
        function createDashStyleDropdown(id) {
            const newSelect = document.createElement('select');
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
        function getLocalisedString(i) {
            const locale = I18n.translations[I18n.locale];
            switch (i) {
                case 'red':
                    return locale?.['segment']?.['address']?.['none'] ?? i;
                case 'toll':
                    return locale?.['edit']?.['segment']?.['fields']?.['toll_road'] ?? i;
                case 'restriction':
                    return (locale?.['restrictions']?.['modal_headers']?.['restriction_summary'] ?? i);
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
            }
            return locale?.['segment']?.['road_types'][i] ?? i;
        }
        function createStreetOptionLine({ i, showWidth = true, showOpacity = false, }) {
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
        function createSpeedOptionLine(i, metric = true) {
            const type = metric ? 'metric' : 'imperial';
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
        function updatePreferenceValues() {
            const saveNewButton = document.getElementById('svl_saveNewPref');
            saveNewButton.classList.add('disabled');
            saveNewButton.disabled = true;
            saveNewButton.classList.remove('btn-primary');
            const rollbackButton = document.getElementById('svl_rollbackButton');
            rollbackButton.classList.add('disabled');
            rollbackButton.disabled = true;
            document.getElementById('svl_buttons').classList.remove('svl_unsaved');
            updateStreetsPreferenceValues();
            const options = getOptions();
            options['streets'].forEach((o) => {
                if (o !== 'red') {
                    document.getElementById(`svl_streetWidth_${o}`).value =
                        preferences[o]['strokeWidth'];
                }
                document.getElementById(`svl_streetColor_${o}`).value =
                    preferences[o]['strokeColor'];
                document.getElementById(`svl_strokeDashstyle_${o}`).value =
                    preferences[o]['strokeDashstyle'];
            });
            options['decorations'].forEach((o) => {
                if ([
                    'dirty',
                    'lanes',
                    'toll',
                    'restriction',
                    'closure',
                    'headlights',
                    'nearbyHOV',
                ].includes(o)) {
                    document.getElementById(`svl_streetOpacity_${o}`).value =
                        preferences[o]['strokeOpacity'] * 100.0;
                }
                else {
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
            document.getElementById('svl_hideRoutingModeBlock').checked =
                preferences['hideRoutingModeBlock'];
            document.getElementById('svl_showANs').checked = preferences['showANs'];
            document.getElementById('svl_layerOpacity').value =
                String(preferences['layerOpacity'] * 100);
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
            const WMEUsesImperial = W.prefs.attributes['isImperial'];
            const type = WMEUsesImperial ? 'imperial' : 'metric';
            const speeds = Object.keys(preferences['speeds'][type]);
            const slLinesToHide = document.querySelectorAll(WMEUsesImperial ? '.svl_metric' : '.svl_imperial');
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
        function createCheckboxOption({ id, title, description, isNew }) {
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
        function createIntegerOption({ id, title, description, min, max, step, isNew, }) {
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
        function createRangeOption({ id, title, description, min, max, step, isNew, }) {
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
        function createPreferencesSection(name, open = false) {
            const details = document.createElement('details');
            details.open = open;
            const summary = document.createElement('summary');
            summary.innerText = name;
            details.appendChild(summary);
            return details;
        }
        async function initPreferencePanel() {
            const style = document.createElement('style');
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
            supportForum.innerText = `${_('something_not_working')} ${_('report_it_here')}.`;
            supportForum.href = GM_info.script.supportURL;
            supportForum.target = '_blank';
            supportForum.className = 'svl_support-link';
            mainDiv.appendChild(supportForum);
            const translationMessage = document.createElement('div');
            translationMessage.className = 'svl_translationblock';
            if (_('language_code') === I18n.currentLocale()) {
                const translationPercentage = _('completition_percentage');
                if (translationPercentage === '100%') {
                    translationMessage.innerText = `${_('fully_translated_in')} ${_('translated_by')}`;
                }
                else {
                    translationMessage.innerHTML = `${translationPercentage} ${_('translation_thanks')} ${_('translated_by')}. <a href="https://www.waze.com/forum/viewtopic.php?f=819&t=149535&start=310#p2114167" target="_blank">${_('would_you_like_to_help')}</a>`;
                }
            }
            else {
                if (onlineTranslations) {
                    translationMessage.innerHTML = `<b style="color:red">Unfortunately, SVL is not yet available in your language. Would you like to help translating?<br><a href="https://www.waze.com/forum/viewtopic.php?f=819&t=149535&start=310#p2114167" target="_blank">Please contact bedo2991</a>.</b>`;
                }
                else {
                    translationMessage.innerHTML = `<b style="color:#8b0000">An error occurred while fetching the translations. If it persists, please report it on the Waze forum.</b>`;
                }
            }
            mainDiv.appendChild(translationMessage);
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
            streets.appendChild(createCheckboxOption({
                id: 'realsize',
                title: _('use_reallife_width'),
                description: _('use_reallife_width_descr'),
                isNew: '5.0.0',
            }));
            streets.appendChild(createDropdownOption({
                id: 'presets',
                title: _('road_themes_title'),
                description: _('road_themes_descr'),
                options: [
                    { 'text': '', 'value': '' },
                    { 'text': _('svl_standard_layer'), 'value': 'svl_standard' },
                    { 'text': _('wme_colors_layer'), 'value': 'wme_colors' },
                ],
                isNew: '5.0.8',
            }));
            for (let i = 0; i < preferences['streets'].length; i += 1) {
                if (preferences['streets'][i]) {
                    streets.appendChild(createStreetOptionLine({ i, showWidth: true, showOpacity: false }));
                }
            }
            const decorations = createPreferencesSection(_('segments_decorations'));
            const renderingParameters = createPreferencesSection(_('rendering_parameters'));
            const performance = createPreferencesSection(_('performance_tuning'));
            const speedLimits = createPreferencesSection(_('speed_limits'));
            const options = getOptions();
            options['streets'].forEach((o) => {
                if (o !== 'red') {
                    streets.appendChild(createStreetOptionLine({
                        i: o,
                        showWidth: true,
                        showOpacity: false,
                    }));
                }
                else {
                    streets.appendChild(createStreetOptionLine({
                        i: o,
                        showWidth: false,
                        showOpacity: false,
                    }));
                }
            });
            decorations.appendChild(createStreetOptionLine({
                i: 'lanes',
                showWidth: false,
                showOpacity: true,
            }));
            decorations.appendChild(createStreetOptionLine({
                i: 'toll',
                showWidth: false,
                showOpacity: true,
            }));
            decorations.appendChild(createStreetOptionLine({
                i: 'restriction',
                showWidth: false,
                showOpacity: true,
            }));
            decorations.appendChild(createStreetOptionLine({
                i: 'closure',
                showWidth: false,
                showOpacity: true,
            }));
            decorations.appendChild(createStreetOptionLine({
                i: 'headlights',
                showWidth: false,
                showOpacity: true,
            }));
            decorations.appendChild(createStreetOptionLine({
                i: 'dirty',
                showWidth: false,
                showOpacity: true,
            }));
            decorations.appendChild(createStreetOptionLine({
                i: 'nearbyHOV',
                showWidth: false,
                showOpacity: true,
            }));
            streets.appendChild(decorations);
            streets.appendChild(createCheckboxOption({
                id: 'showANs',
                title: _('show_ans'),
                description: _('show_ans_descr'),
            }));
            mainDiv.appendChild(streets);
            renderingParameters.appendChild(createIntegerOption({
                id: 'layerOpacity',
                title: _('layer_opacity'),
                description: _('layer_opacity_descr'),
                min: 10,
                max: 100,
                step: 5,
                isNew: '5.0.6',
            }));
            renderingParameters.appendChild(createCheckboxOption({
                id: 'routingModeEnabled',
                title: _('enable_routing_mode'),
                description: _('enable_routing_mode_descr'),
            }));
            renderingParameters.appendChild(createCheckboxOption({
                id: 'hideRoutingModeBlock',
                title: _('hide_routing_mode_panel'),
                description: _('hide_routing_mode_panel_descr'),
                isNew: '5.0.9',
            }));
            renderingParameters.appendChild(createCheckboxOption({
                id: 'showUnderGPSPoints',
                title: _('gps_layer_above_roads'),
                description: _('gps_layer_above_roads_descr'),
            }));
            streets.appendChild(createRangeOption({
                id: 'labelOutlineWidth',
                title: _('label_width'),
                description: _('label_width_descr'),
                min: 0,
                max: 10,
                step: 1,
            }));
            renderingParameters.appendChild(createCheckboxOption({
                id: 'disableRoadLayers',
                title: _('hide_road_layer'),
                description: _('hide_road_layer_descr'),
            }));
            renderingParameters.appendChild(createCheckboxOption({
                id: 'startDisabled',
                title: _('svl_initially_disabled'),
                description: _('svl_initially_disabled_descr'),
            }));
            renderingParameters.appendChild(createRangeOption({
                id: 'clutterConstant',
                title: _('street_names_density'),
                description: _('street_names_density_descr'),
                min: 1,
                max: clutterMax,
                step: 1,
            }));
            const closeZoomTitle = document.createElement('h5');
            closeZoomTitle.innerText = _('close_zoom_only');
            renderingParameters.appendChild(closeZoomTitle);
            renderingParameters.appendChild(createCheckboxOption({
                id: 'renderGeomNodes',
                title: _('render_geometry_nodes'),
                description: _('render_geometry_nodes_descr'),
            }));
            renderingParameters.appendChild(createIntegerOption({
                id: 'fakelock',
                title: _('render_as_level'),
                description: _('render_as_level_descr'),
                min: 1,
                max: 7,
                step: 1,
            }));
            renderingParameters.appendChild(createRangeOption({
                id: 'closeZoomLabelSize',
                title: _('font_size_close'),
                description: _('font_size_close_descr'),
                min: 8,
                max: fontSizeMax,
                step: 1,
            }));
            renderingParameters.appendChild(createRangeOption({
                id: 'arrowDeclutter',
                title: _('limit_arrows'),
                description: _('limit_arrows_descr'),
                min: 1,
                max: 200,
                step: 1,
            }));
            const farZoomTitle = document.createElement('h5');
            farZoomTitle.innerText = _('far_zoom_only');
            renderingParameters.appendChild(farZoomTitle);
            renderingParameters.appendChild(createRangeOption({
                id: 'farZoomLabelSize',
                title: _('font_size_far'),
                description: _('font_size_far_descr'),
                min: 8,
                max: fontSizeMax,
            }));
            renderingParameters.appendChild(createCheckboxOption({
                id: 'hideMinorRoads',
                title: _('hide_minor_roads'),
                description: _('hide_minor_roads_descr'),
            }));
            mainDiv.appendChild(renderingParameters);
            const utilities = createPreferencesSection(_('utilities'));
            utilities.appendChild(createCheckboxOption({
                id: 'autoReload_enabled',
                title: _('automatically_refresh'),
                description: _('automatically_refresh_descr'),
            }));
            utilities.appendChild(createIntegerOption({
                id: 'autoReload_interval',
                title: _('autoreload_interval'),
                description: _('autoreload_interval_descr'),
                min: 20,
                max: 3600,
                step: 1,
            }));
            mainDiv.appendChild(utilities);
            performance.appendChild(createIntegerOption({
                id: 'useWMERoadLayerAtZoom',
                title: _('stop_svl_at_zoom'),
                description: _('stop_svl_at_zoom_descr'),
                min: 12,
                max: 17,
                step: 1,
            }));
            performance.appendChild(createIntegerOption({
                id: 'switchZoom',
                title: _('close_zoom_until_level'),
                description: _('close_zoom_until_level_descr'),
                min: 17,
                max: 21,
                step: 1,
            }));
            performance.appendChild(createIntegerOption({
                id: 'segmentsThreshold',
                title: _('segments_threshold'),
                description: _('segments_threshold_descr'),
                min: 1000,
                max: 10000,
                step: 100,
                isNew: '5.0.4',
            }));
            performance.appendChild(createIntegerOption({
                id: 'nodesThreshold',
                title: _('nodes_threshold'),
                description: _('nodes_threshold_descr'),
                min: 1000,
                max: 10000,
                step: 100,
                isNew: '5.0.4',
            }));
            mainDiv.appendChild(performance);
            speedLimits.appendChild(createCheckboxOption({
                id: 'showSLtext',
                title: _('show_sl_on_name'),
                description: _('show_sl_on_name_descr'),
            }));
            speedLimits.appendChild(createCheckboxOption({
                id: 'showSLcolor',
                title: _('show_sl_with_colors'),
                description: _('show_sl_with_colors_descr'),
            }));
            speedLimits.appendChild(createCheckboxOption({
                id: 'showSLSinglecolor',
                title: _('show_sl_with_one_color'),
                description: _('show_sl_with_one_color_descr'),
            }));
            const colorPicker = createInput({
                id: 'SLColor',
                type: 'color',
                className: 'prefElement form-control',
            });
            speedLimits.appendChild(colorPicker);
            speedLimits.appendChild(createCheckboxOption({
                id: 'showDashedUnverifiedSL',
                title: _('show_unverified_dashed'),
                description: _('show_unverified_dashed_descr'),
            }));
            const slTitle = document.createElement('h6');
            slTitle.innerText = getLocalisedString('speed limit');
            speedLimits.appendChild(slTitle);
            let type = 'metric';
            speedLimits.appendChild(createSpeedOptionLine('Default', true));
            for (let i = 1; i < Object.keys(preferences['speeds'][type]).length + 1; i += 1) {
                speedLimits.appendChild(createSpeedOptionLine(i, true));
            }
            type = 'imperial';
            speedLimits.appendChild(createSpeedOptionLine('Default', false));
            for (let i = 1; i < Object.keys(preferences['speeds'][type]).length + 1; i += 1) {
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
            const prefElements = document.querySelectorAll('.prefElement');
            prefElements.forEach((element) => {
                element.addEventListener('change', updateValuesFromPreferences);
            });
            document
                .getElementById('svl_saveNewPref').addEventListener('click', saveNewPref);
            document
                .getElementById('svl_rollbackButton')
                .addEventListener('click', rollbackPreferences);
            document
                .getElementById('svl_resetButton')
                .addEventListener('click', resetPreferencesCallback);
            document
                .getElementById('svl_importButton')
                .addEventListener('click', importPreferencesCallback);
            document
                .getElementById('svl_exportButton')
                .addEventListener('click', exportPreferences);
            updatePreferenceValues();
        }
        function removeNodeById(id) {
            nodesVector.destroyFeatures(nodesVector.getFeaturesByAttribute('sID', id), {
                'silent': true,
            });
        }
        function removeNodesSDK(d) {
            if (d.dataModelName !== 'nodes')
                return;
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
            let i;
            for (i = 0; i < d.objectIds.length; i += 1) {
                removeNodeById(d.objectIds[i]);
            }
        }
        function getNodeStyle(attributes) {
            if (attributes.segIDs?.length === 1) {
                return nodeStyleDeadEnd;
            }
            return nodeStyle;
        }
        function editNodesSDK(d) {
            if (d.dataModelName !== 'nodes')
                return;
            consoleDebug(d);
            consoleDebug('Change nodes SDK');
            d.objectIds.forEach((nodeId) => {
                const node = W.model.nodes.getObjectById(nodeId);
                const { attributes } = node;
                const nodeFeature = nodesVector.getFeaturesByAttribute('sID', attributes.id)[0];
                if (nodeFeature) {
                    nodeFeature.style = getNodeStyle(attributes);
                    const olGeo = node.getOLGeometry();
                    nodeFeature.move(new OpenLayers.LonLat(olGeo.x, olGeo.y));
                }
                else if (attributes.id > 0) {
                    const newNode = drawNode(node);
                    if (newNode) {
                        nodesVector.addFeatures([newNode], { 'silent': true });
                    }
                }
            });
        }
        function nodeStateDeleted(nodes) {
            consoleDebug('Node state deleted');
            for (let i = 0; i < nodes.length; i += 1) {
                removeNodeById(nodes[i].getID());
            }
        }
        function segmentsStateDeleted(segments) {
            for (let i = 0; i < segments.length; i += 1) {
                removeSegmentById(segments[i].getID());
            }
        }
        function addNodesSDK(d) {
            if (d.dataModelName !== 'nodes')
                return;
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
            const myFeatures = [];
            for (let i = 0; i < d.objectIds.length; i += 1) {
                const node = W.model.nodes.getObjectById(d.objectIds[i]);
                if (node && node.getOLGeometry() !== undefined) {
                    const newNode = drawNode(node);
                    if (newNode) {
                        myFeatures.push(newNode);
                    }
                }
                else {
                    console.warn('[SVL] Geometry of node is undefined');
                }
            }
            nodesVector.addFeatures(myFeatures, { 'silent': true });
            return true;
        }
        function removeSVLEvents(event) {
            return !event['svl'];
        }
        function updateStatusBasedOnZoom() {
            consoleDebug('updateStatusBasedOnZoom running');
            let mustRefresh = true;
            if (drawingAborted) {
                if (Object.keys(W.model.segments.objects).length <
                    preferences['segmentsThreshold'] &&
                    Object.keys(W.model.nodes.objects).length <
                        preferences['nodesThreshold']) {
                    drawingAborted = false;
                    setLayerVisibility(SVL_LAYER, true);
                    setLayerVisibility(ROAD_LAYER, false);
                    redrawAllSegments();
                }
                else {
                    console.warn(`[SVL] Still too many elements to draw: Segments: ${wmeSDK.DataModel.Segments.getAll().length}/${preferences['segmentsThreshold']}, Nodes: ${wmeSDK.DataModel.Nodes.getAll().length})
          }/${preferences['nodesThreshold']} - You can change these thresholds in the preference panel.`);
                }
            }
            if (wmeSDK.Map.getZoomLevel() <= +preferences['useWMERoadLayerAtZoom']) {
                consoleDebug('Road layer automatically enabled because of zoom out');
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
            }
            else if (SVLAutomDisabled) {
                consoleDebug('Re-enabling SVL after zoom in');
                setLayerVisibility(SVL_LAYER, true);
                setLayerVisibility(ROAD_LAYER, false);
                manageSVLRoadLayer();
                SVLAutomDisabled = false;
            }
            return mustRefresh;
        }
        let timer;
        function manageZoom() {
            consoleDebug("EVENT Zoomend");
            clearTimeout(timer);
            consoleDebug('manageZoom clearing timer');
            timer = setTimeout(updateStatusBasedOnZoom, 1000);
        }
        function registerSegmentsEvents() {
            wmeSDK.Events.trackDataModelEvents({ dataModelName: "segments" });
            segmentEventsRemoveCallbacks.push(wmeSDK.Events.on({
                eventName: "wme-data-model-objects-added",
                eventHandler: ({ dataModelName, objectIds }) => { addSegmentsSDK({ dataModelName, objectIds }); },
            }));
            segmentEventsRemoveCallbacks.push(wmeSDK.Events.on({
                eventName: "wme-data-model-objects-changed",
                eventHandler: ({ dataModelName, objectIds }) => { editSegmentsSDK({ dataModelName, objectIds }); },
            }));
            segmentEventsRemoveCallbacks.push(wmeSDK.Events.on({
                eventName: "wme-data-model-objects-removed",
                eventHandler: ({ dataModelName, objectIds }) => { removeSegmentsSDK({ dataModelName, objectIds }); },
            }));
            segmentEventsRemoveCallbacks.push(wmeSDK.Events.on({
                eventName: "wme-data-model-objects-saved",
                eventHandler: ({ dataModelName, objectIds }) => { saveSegmentsSDK({ dataModelName, objectIds }); },
            }));
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
            const events = W.model.nodes._events;
            if (typeof events === 'object') {
                events['objects-state-deleted'] =
                    events['objects-state-deleted'].filter(removeSVLEvents);
            }
        }
        function registerNodeEvents() {
            consoleDebug('Registering node events');
            wmeSDK.Events.trackDataModelEvents({ dataModelName: "nodes" });
            nodeEventsRemoveCallbacks.push(wmeSDK.Events.on({
                eventName: "wme-data-model-objects-added",
                eventHandler: ({ dataModelName, objectIds }) => { addNodesSDK({ dataModelName, objectIds }); },
            }));
            nodeEventsRemoveCallbacks.push(wmeSDK.Events.on({
                eventName: "wme-data-model-objects-changed",
                eventHandler: ({ dataModelName, objectIds }) => { editNodesSDK({ dataModelName, objectIds }); },
            }));
            nodeEventsRemoveCallbacks.push(wmeSDK.Events.on({
                eventName: "wme-data-model-objects-removed",
                eventHandler: ({ dataModelName, objectIds }) => { removeNodesSDK({ dataModelName, objectIds }); },
            }));
            const events = W.model.nodes._events;
            if (typeof events === 'object') {
                events['objects-state-deleted'].push({
                    'context': nodesVector,
                    'callback': nodeStateDeleted,
                    'svl': true,
                });
            }
        }
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
        function addSegmentsSDK(d) {
            if (!countryID)
                return;
            if (d.dataModelName !== 'segments')
                return;
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
            let segmentsFeatures = [];
            let labelsFeatures = [];
            d.objectIds.forEach((el) => {
                if (el !== null) {
                    const res = drawSegment(W.model.segments.getObjectById(el));
                    if (res.segmentFeatures) {
                        segmentsFeatures.push(...res.segmentFeatures);
                    }
                    if (res.labels) {
                        labelsFeatures.push(...res.labels);
                    }
                }
            });
            if (segmentsFeatures.length > 0) {
                consoleDebug(`${segmentsFeatures.length} features added to the street layer`);
                streetVectorLayer.svlAddFeatures(segmentsFeatures, { 'silent': true });
            }
            else {
                consoleDebug('[SVL] no segment features drawn');
            }
            if (labelsFeatures.length > 0) {
                consoleDebug(`${labelsFeatures.length} features added to the labels layer`);
                labelsVector.addFeatures(labelsFeatures, { 'silent': true });
            }
            else {
                consoleDebug('[SVL] no labels features drawn');
            }
            consoleGroupEnd();
        }
        function removeSegmentById(id) {
            consoleDebug(`RemoveSegmentById: ${id}`);
            streetVectorLayer.destroyFeatures(streetVectorLayer.getFeaturesByAttribute('sID', id), { 'silent': true });
            labelsVector.destroyFeatures(labelsVector.getFeaturesByAttribute('sID', id), { 'silent': true });
        }
        function saveSegmentsSDK(d) {
            redrawAllSegments();
            if (d.dataModelName !== 'segments')
                return;
            consoleDebug(`saveSegmentsSDK - Saving ${d.objectIds.length} segments`);
            consoleDebug(d);
        }
        function editSegmentsSDK(d) {
            if (d.dataModelName !== 'segments')
                return;
            consoleDebug(`editSegmentsSDK - Edit ${d.objectIds.length} segments`);
            d.objectIds.forEach((segmID) => {
                removeSegmentById(segmID);
                addSegmentsSDK({ dataModelName: d.dataModelName, objectIds: [segmID] });
            });
        }
        function removeSegmentsSDK(d) {
            if (d.dataModelName !== 'segments')
                return;
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
            consoleDebug('ManageVisibilityChanged', event);
            nodesVector.setVisibility(event['object'].visibility);
            labelsVector.setVisibility(event['object'].visibility);
            if (event['object'].visibility) {
                consoleDebug('enabled: registering events');
                registerSegmentsEvents();
                registerNodeEvents();
                const res = updateStatusBasedOnZoom();
                if (res === true) {
                    redrawAllSegments();
                }
            }
            else {
                consoleDebug('disabled: unregistering events');
                removeSegmentsEvents();
                removeNodeEvents();
                destroyAllFeatures();
            }
        }
        function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }
        async function waitForWazeWrap() {
            let trials = 1;
            wmeSDK.State.getUserInfo();
            let sleepTime = 150;
            do {
                if (!WazeWrap ||
                    !WazeWrap.Ready ||
                    !WazeWrap.Interface ||
                    !WazeWrap.Alerts) {
                    console.log('SVL: WazeWrap not ready, retrying in 800ms');
                    await sleep(trials * sleepTime);
                }
                else {
                    return true;
                }
            } while (trials++ <= 30);
            console.error('SVL: could not initialize WazeWrap');
            throw new Error('SVL: could not initialize WazeWrap');
        }
        function initWazeWrapElements() {
            console.log('SVL: initializing WazeWrap');
            try {
                const toggleShortcut = {
                    callback: () => {
                        setLayerVisibility(SVL_LAYER, !streetVectorLayer.visibility);
                    },
                    description: "Toggle SVL",
                    shortcutId: "svl",
                    shortcutKeys: "l",
                };
                wmeSDK.Shortcuts.createShortcut(toggleShortcut);
                console.log('SVL: Keyboard shortcut successfully added.');
            }
            catch (e) {
                console.error('SVL: Error while adding the keyboard shortcut:');
                console.error(e);
            }
            try {
                WazeWrap.Interface.AddLayerCheckbox('road', 'Street Vector Layer', true, (checked) => {
                    streetVectorLayer.setVisibility(checked);
                }, streetVectorLayer);
            }
            catch (e) {
                console.error('SVL: could not add layer checkbox');
            }
            if (preferences['startDisabled']) {
                setLayerVisibility(SVL_LAYER, false);
            }
            loadTranslations().then(() => initPreferencePanel());
            WazeWrap.Interface.ShowScriptUpdate('Street Vector Layer', SVL_VERSION, `<b>${_('whats_new')}</b>
      <br>- 6.0.0 - Start using the new WME SDK. SVL is likely to be discontinued if Waze quits supporting OpenLayers.
      <br>- 6.0.0 - Fix: no more road layer automatically enabled by the WME, when SVL is on.
      <br>- 5.5.3 & 4: Fix for WME Beta. <b>Warning: SVL may stop working for good in the future due to WME internal changes</b>
      <br>- 5.5.1: Use GeoJson instead of OpenLayers (no visible change)`, '', GM_info.script.supportURL);
        }
        function invalidTranslation(key) {
            console.error('[SVL] Invalid translation key: ' + key);
            return '<invalid translation key>';
        }
        function _(key) {
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
        }
        function request(url, opt = {}) {
            if (opt) {
                Object.assign(opt, {
                    url,
                    timeout: 30000,
                });
            }
            return new Promise((resolve, reject) => {
                opt.onerror = opt.ontimeout = reject;
                opt.onload = resolve;
                GM_xmlhttpRequest(opt);
            });
        }
        const tr = [];
        const tr_keys = [];
        async function loadTranslations() {
            const response = await request('https://docs.google.com/spreadsheets/d/e/2PACX-1vRjug3umcYtdN9iVQc2SAqfK03o6HvozEEoxBrdg_Xf73Dt6TuApRCmT_V6UIIkMyVjRjKydl9CP8qE/pub?gid=565129786&single=true&output=tsv', {
                method: 'GET',
                responseType: 'text'
            });
            if (response.readyState === 4 && response.status === 200) {
                const data = response.responseText;
                let temp = data.split('\n');
                for (const [i, line] of temp.entries()) {
                    if (i > 0) {
                        const [first, ...rest] = line.split('\t');
                        tr[first] = rest.map((e) => e.trim());
                    }
                    else {
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
        function getGeodesicPixelSizeSVL() {
            const lonlat = OLMap.getCachedCenter();
            const res = OLMap.resolution;
            const left = lonlat.add(-res / 2, 0);
            const right = lonlat.add(res / 2, 0);
            left.transform(OLMap.projection, gmapsProjection);
            right.transform(OLMap.projection, gmapsProjection);
            return OpenLayers.Util.distVincenty(left, right) * 1000;
        }
        function svlExtend(source) {
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
            svlGlobals();
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
                safeAlert('info', `${_('first_time')}

          ${_('some_info')}
          ${_('default_shortcut_instruction')}
          ${_('instructions_1')}
          ${_('instructions_2')}
          ${_('instructions_3')}
          ${_('instructions_4')}`);
            }
            const roadStyleMap = new OpenLayers.StyleMap({
                'pointerEvents': 'none',
                'strokeColor': '${color}',
                'strokeWidth': '${width}',
                'strokeOpacity': '${opacity}',
                'strokeDashstyle': '${dash}',
                'strokeLinecap': 'butt',
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
                'labelAlign': 'cm',
            });
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
            OpenLayers.ElementsIndexer.prototype.svlGetNextElement = function (index) {
                for (let i = index + 1; i < this.order.length; i++) {
                    let nextElement = document.getElementById(this.order[i]);
                    if (nextElement) {
                        return nextElement;
                    }
                }
                return null;
            };
            OpenLayers.ElementsIndexer.prototype.insert = function (newNode) {
                const nodeId = newNode.id;
                if (this.indices[nodeId] != null) {
                    this.remove(newNode);
                }
                this.determineZIndex(newNode);
                var leftIndex = -1;
                var rightIndex = this.order.length;
                var middle;
                while (rightIndex - leftIndex > 1) {
                    middle = Math.trunc((leftIndex + rightIndex) / 2);
                    var placement = this.compare(this, newNode, document.getElementById(this.order[middle]));
                    if (placement > 0) {
                        leftIndex = middle;
                    }
                    else {
                        rightIndex = middle;
                    }
                }
                this.order.splice(rightIndex, 0, nodeId);
                this.indices[nodeId] = this.getZIndex(newNode);
                return this.svlGetNextElement(rightIndex);
            };
            streetVectorLayer.renderer.redrawNode = function (id, geometry, style, featureId) {
                style = this.applyDefaultSymbolizer(style);
                var node = this.nodeFactory(id, this.getNodeType(geometry, style));
                node['_featureId'] = featureId;
                node['_boundsBottom'] = geometry.getBounds().bottom;
                node['_geometryClass'] = geometry.CLASS_NAME;
                node['_style'] = style;
                var drawResult = this.drawGeometryNode(node, geometry, style);
                if (drawResult === false) {
                    return false;
                }
                node = drawResult.node;
                if (this.indexer) {
                    const insertMeAfterThisNode = this.indexer.insert(node);
                    if (insertMeAfterThisNode) {
                        this.vectorRoot.insertBefore(node, insertMeAfterThisNode);
                    }
                    else {
                        this.vectorRoot.appendChild(node);
                    }
                }
                else {
                    if (node.parentNode !== this.vectorRoot) {
                        this.vectorRoot.appendChild(node);
                    }
                }
                this.postDraw(node);
                return drawResult.complete;
            };
            streetVectorLayer.renderer.drawGeometry = function (geometry, style, featureId) {
                let rendered = false;
                let removeBackground = false;
                if (style.display != "none") {
                    if (style.backgroundGraphic) {
                        this.redrawBackgroundNode(geometry.id, geometry, style, featureId);
                    }
                    else {
                        removeBackground = true;
                    }
                    rendered = this.redrawNode(geometry.id, geometry, style, featureId);
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
                    var node = document.getElementById(geometry.id + this.BACKGROUND_ID_SUFFIX);
                    if (node) {
                        node.parentNode.removeChild(node);
                    }
                }
                return rendered;
            };
            streetVectorLayer.renderer.drawFeature = function drawFeature(feature, style, farZoom = isFarZoom()) {
                if (style == null) {
                    style = feature.style;
                }
                if (feature.geometry) {
                    if (wmeSDK.Map.getZoomLevel() < 2 ||
                        (feature.attributes.closeZoomOnly && farZoom) ||
                        (feature.attributes.farZoomOnly && !farZoom)) {
                        style = { 'display': 'none' };
                    }
                    else {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds || !bounds.intersectsBounds(streetVectorLayer.renderer.extent)) {
                            style = { 'display': 'none' };
                        }
                        else {
                            streetVectorLayer.renderer.featureDx = 0;
                            style['pointerEvents'] = 'none';
                            if (!farZoom) {
                                if (!feature.attributes.isArrow && preferences['realsize']) {
                                    style['strokeWidth'] /= getGeodesicPixelSizeSVL();
                                }
                            }
                        }
                    }
                    return streetVectorLayer.renderer.drawGeometry(feature.geometry, style, feature.id);
                }
                return undefined;
            };
            streetVectorLayer.drawFeature = function (feature, style, farZoom = isFarZoom()) {
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
                if (drawn === false || drawn === null) {
                    this.unrenderedFeatures[feature.id] = feature;
                }
                else {
                    delete this.unrenderedFeatures[feature.id];
                }
            };
            streetVectorLayer.moveTo = function (bounds, zoomChanged, dragging) {
                OpenLayers.Layer.prototype.moveTo.apply(this, arguments);
                var coordSysUnchanged = true;
                const farZoom = isFarZoom();
                if (!dragging) {
                    this.renderer.root.style.visibility = 'hidden';
                    var viewSize = this.map.getSize(), viewWidth = viewSize.w, viewHeight = viewSize.h, offsetLeft = (viewWidth / 2 * this.ratio) - viewWidth / 2, offsetTop = (viewHeight / 2 * this.ratio) - viewHeight / 2;
                    offsetLeft += this.map.layerContainerOriginPx.x;
                    offsetLeft = -Math.round(offsetLeft);
                    offsetTop += this.map.layerContainerOriginPx.y;
                    offsetTop = -Math.round(offsetTop);
                    this.div.style.left = offsetLeft + 'px';
                    this.div.style.top = offsetTop + 'px';
                    var extent = this.map.getExtent().scale(this.ratio);
                    coordSysUnchanged = this.renderer.setExtent(extent, zoomChanged);
                    this.renderer.root.style.visibility = 'visible';
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
                    for (let i = 0, len = this.features.length; i < len; i++) {
                        this.renderer.locked = (i !== (len - 1));
                        feature = this.features[i];
                        this.drawFeature(feature, undefined, farZoom);
                    }
                }
            };
            streetVectorLayer.svlAddFeatures =
                function (features, options) {
                    if (!features || features.length === 0)
                        return;
                    const farZoom = isFarZoom();
                    for (let i = 0, len = features.length; i < len; i += 1) {
                        if (i != (features.length - 1)) {
                            this.renderer.locked = true;
                        }
                        else {
                            this.renderer.locked = false;
                        }
                        let feature = features[i];
                        if (!feature)
                            continue;
                        if (this.geometryType &&
                            !(feature.geometry instanceof this.geometryType)) {
                            throw new TypeError('addFeatures: component should be an ' +
                                this.geometryType.prototype.CLASS_NAME);
                        }
                        feature.layer = this;
                        if (!feature.style && this.style) {
                            feature.style = svlExtend(this.style);
                        }
                        this.features.push(feature);
                        this.drawFeature(feature, undefined, farZoom);
                    }
                };
            nodesVector = new OpenLayers.Layer.Vector('Nodes Vector', {
                'visibility': !preferences['startDisabled'],
            });
            nodesVector.drawFeature = streetVectorLayer.drawFeature;
            nodesVector.addFeatures = streetVectorLayer.svlAddFeatures;
            nodesVector.moveTo = streetVectorLayer.moveTo;
            nodesVector.renderer.drawFeature = function drawFeature(feature, style, farZoom = isFarZoom()) {
                if (wmeSDK.Map.getZoomLevel() < 2) {
                    style = { 'display': 'none' };
                    return nodesVector.renderer.drawGeometry(feature.geometry, style, feature.id);
                }
                if (style == null) {
                    style = feature.style;
                }
                style = svlExtend(style);
                if (feature.geometry) {
                    if (!farZoom) {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds.intersectsBounds(nodesVector.renderer.extent)) {
                            style = { 'display': 'none' };
                        }
                        else {
                            nodesVector.renderer.featureDx = 0;
                            if (preferences['realsize']) {
                                style['pointRadius'] /= OLMap.resolution;
                            }
                        }
                    }
                    else {
                        style = { 'display': 'none' };
                    }
                    return nodesVector.renderer.drawGeometry(feature.geometry, style, feature.id);
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
            labelsVector.renderer.drawFeature = function drawFeature(feature, style, farZoom = isFarZoom()) {
                const { zoom } = OLMap;
                if (zoom < 2) {
                    return false;
                }
                if (style == null) {
                    style = feature.style;
                }
                if (feature.geometry) {
                    if (7 - feature.attributes.showAtzoom > zoom ||
                        (feature.attributes.closeZoomOnly && farZoom) ||
                        (feature.attributes.farZoomOnly && !farZoom)) {
                        style = { 'display': 'none' };
                    }
                    else {
                        const bounds = feature.geometry.getBounds();
                        if (!bounds || !bounds.intersectsBounds(labelsVector.renderer.extent)) {
                            style = { 'display': 'none' };
                        }
                        else {
                            labelsVector.renderer.featureDx = 0;
                            style['pointerEvents'] = 'none';
                            style['fontSize'] = farZoom
                                ? preferences['farZoomLabelSize']
                                : preferences['closeZoomLabelSize'];
                        }
                    }
                    const rendered = labelsVector.renderer.drawGeometry(feature.geometry, style, feature.id);
                    if (style['display'] !== 'none' &&
                        style['label'] &&
                        rendered !== false) {
                        const location = feature.geometry.getCentroid();
                        labelsVector.renderer.drawText(feature.id, style, location);
                    }
                    else {
                        labelsVector.renderer.removeText(feature.id);
                    }
                    return rendered;
                }
                return undefined;
            };
            labelsVector.renderer.drawText = function drawText(featureId, style, location) {
                const drawOutline = !!style['labelOutlineWidth'];
                if (drawOutline) {
                    const outlineStyle = svlExtend(style);
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
                const x = (location.x - labelsVector.renderer.featureDx) / resolution +
                    labelsVector.renderer.left;
                const y = location.y / resolution - labelsVector.renderer.top;
                const suffix = drawOutline
                    ? labelsVector.renderer.LABEL_OUTLINE_SUFFIX
                    : labelsVector.renderer.LABEL_ID_SUFFIX;
                const label = labelsVector.renderer.nodeFactory(featureId + suffix, 'text');
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
                const align = style['labelAlign'] ?? OpenLayers.Renderer.defaultSymbolizer.labelAlign;
                label.setAttribute('text-anchor', OpenLayers.Renderer.SVG.LABEL_ALIGN[align[0]] ?? 'middle');
                if (OpenLayers.IS_GECKO === true) {
                    label.setAttribute('dominant-baseline', OpenLayers.Renderer.SVG.LABEL_ALIGN[align[1]] ?? 'central');
                }
                const labelRows = style['label'].split('\n');
                const numRows = labelRows.length;
                while (label.childNodes.length > numRows) {
                    label.removeChild(label.lastChild);
                }
                for (let i = 0; i < numRows; i += 1) {
                    const tspan = labelsVector.renderer.nodeFactory(`${featureId + suffix}_tspan_${i}`, 'tspan');
                    if (style['labelSelect'] === true) {
                        tspan._featureId = featureId;
                        tspan._geometry = location;
                        tspan._geometryClass = location.CLASS_NAME;
                    }
                    if (OpenLayers.IS_GECKO === false) {
                        tspan.setAttribute('baseline-shift', OpenLayers.Renderer.SVG.LABEL_VSHIFT[align[1]] ?? '-35%');
                    }
                    tspan.setAttribute('x', String(x));
                    if (i === 0) {
                        let vfactor = OpenLayers.Renderer.SVG.LABEL_VFACTOR[align[1]];
                        if (vfactor == null) {
                            vfactor = -0.5;
                        }
                        tspan.setAttribute('dy', `${vfactor * (numRows - 1)}em`);
                    }
                    else {
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
            OLMap.addLayer(streetVectorLayer);
            OLMap.addLayer(labelsVector);
            OLMap.addLayer(nodesVector);
            if (DEBUG) {
                document['sv'] = streetVectorLayer;
                document['lv'] = labelsVector;
                document['nv'] = nodesVector;
                document['svl_pref'] = preferences;
            }
            const layers = OLMap.getLayersBy('name', 'roads');
            WMERoadLayer = null;
            if (layers.length === 1) {
                [WMERoadLayer] = layers;
            }
            else {
                console.error('SVL: Road Layer not found');
            }
            SVLAutomDisabled = false;
            if (preferences['showUnderGPSPoints']) {
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
            }
            else if (WMERoadLayer?.getVisibility() &&
                preferences['disableRoadLayers']) {
                setLayerVisibility(ROAD_LAYER, false);
                console.log("SVL: WME's roads layer was disabled by Street Vector Layer. You can change this behaviour in the preference panel.");
            }
            streetVectorLayer.events.register('visibilitychanged', streetVectorLayer, manageVisibilityChanged);
            manageVisibilityChanged({
                'object': streetVectorLayer,
            });
            wmeSDK.Events.on({
                eventName: 'wme-user-settings-changed',
                eventHandler: handleWMESettingsUpdated,
            });
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
            addSegmentsSDK({ dataModelName: 'segments', objectIds: wmeSDK.DataModel.Segments.getAll().map((e) => e.id) });
            addNodesSDK({ dataModelName: 'nodes', objectIds: wmeSDK.DataModel.Nodes.getAll().map((e) => e.id) });
        }
        function updateStylesFromPreferences(pref, shouldRedraw = true) {
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
            const topCountry = wmeSDK.DataModel.Countries.getTopCountry();
            if (!topCountry) {
                console.error('SVL: could not find topCountry');
                return;
            }
            const defaultLaneWidth = topCountry.defaultLaneWidthPerRoadType;
            if (defaultLaneWidth) {
                Object.keys(defaultLaneWidth).forEach((e) => {
                    defaultLaneWidth[e] / 50.0;
                    defaultLaneWidthMeters[e] = defaultLaneWidth[e] / 100;
                });
                redrawAllSegments();
            }
            else {
                console.warn('SVL: could not find the default lane width in Waze data model');
            }
        }
        function manageLayerChanged(e) {
            if (SVLAutomDisabled || drawingAborted)
                return;
            consoleDebug("Layer changed: " + e.layerName);
            if (e.layerName === "roads" && streetVectorLayer.getVisibility()) {
                wmeSDK.Map.setLayerVisibility({ layerName: "roads", visibility: false });
            }
        }
        const fallback = {};
        fallback[`completition_percentage`] = `100%`;
        fallback[`language_code`] = `en`;
        fallback[`translation_thanks`] = `translated in your language thanks to:`;
        fallback[`would_you_like_to_help`] = `Would you like to help?`;
        fallback[`fully_translated_in`] = `Fully translated in your language thanks to:`;
        fallback[`translated_by`] = `bedo2991`;
        fallback[`routing_mode_panel_title`] = `SVL's Routing Mode`;
        fallback[`routing_mode_panel_body`] = `Hover to temporary disable it`;
        fallback[`thanks_for_using`] = `Thanks for using`;
        fallback[`version`] = `Version`;
        fallback[`something_not_working`] = `Something not working?`;
        fallback[`report_it_here`] = `Report it here`;
        fallback[`reset`] = `Reset`;
        fallback[`reset_help`] = `Overwrite your current settings with the default ones`;
        fallback[`rollback`] = `Rollback`;
        fallback[`rollback_help`] = `Discard your temporary changes`;
        fallback[`save`] = `Save`;
        fallback[`save_help`] = `Save your edited settings`;
        fallback[`settings_backup`] = `Settings Backup`;
        fallback[`import`] = `Import`;
        fallback[`export`] = `Export`;
        fallback[`new_since_version`] = `New since v.`;
        fallback[`whats_new`] = `What's new?`;
        fallback[`first_time`] = `This is the first time that you run Street Vector Layer in this browser.`;
        fallback[`some_info`] = `Some info about it:`;
        fallback[`default_shortcut_instruction`] = `By default, use ALT+L to toggle the layer.`;
        fallback[`instructions_1`] = `You can change the streets color, thickness and style using the panel on the left sidebar.`;
        fallback[`instructions_2`] = `Your preferences will be saved for the next time in your browser.`;
        fallback[`instructions_3`] = `The other road layers will be automatically hidden (you can change this behaviour in the preference panel).`;
        fallback[`instructions_4`] = `Have fun and tell us on the Waze forum if you liked the script!`;
        fallback[`roads_properties`] = `Roads Properties`;
        fallback[`segments_decorations`] = `Segments Decorations`;
        fallback[`rendering_parameters`] = `Rendering Parameters`;
        fallback[`speed_limits`] = `Speed Limits`;
        fallback[`performance_tuning`] = `Performance Tuning`;
        fallback[`utilities`] = `Utilities`;
        fallback[`svl_standard_layer`] = `SVL Standard`;
        fallback[`wme_colors_layer`] = `WME Colors`;
        fallback[`preset_applied`] = `Preset applied, don't forget to save your changes!`;
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
        fallback[`preferences_saving_error`] = `Could not save the preferences, your browser local storage seems to be full.`;
        fallback[`preferences_rollback`] = `All's well that ends well! Now it's everything as it was before.`;
        fallback[`export_preferences_message`] = `The configuration has been copied to your clipboard.
Please paste it in a file (CTRL+V) to store it.`;
        fallback[`preferences_parsing_error`] = `Your string seems to be somehow wrong. Please check that is a valid JSON string`;
        fallback[`preferences_imported`] = `Done, preferences imported!`;
        fallback[`preferences_importing_error`] = `Something went wrong. Is your string correct?`;
        fallback[`preferences_import_prompt`] = `N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!`;
        fallback[`preferences_import_prompt_2`] = `Paste your string here:`;
        fallback[`preferences_reset_message`] = `Preferences have been reset to the default values`;
        fallback[`preferences_reset_question`] = `Are you sure you want to rollback to the default settings?`;
        fallback[`preferences_reset_question_2`] = `ANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!`;
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
        fallback[`init_error`] = `Street Vector Layer failed to inizialize. Maybe the Editor has been updated or your connection/pc is really slow.`;
        fallback[`bootstrap_error`] = `Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!`;
        fallback[`use_reallife_width`] = `Use real-life Width`;
        fallback[`use_reallife_width_descr`] = `When enabled, the segments thickness will be computed from the road's width instead of using the value set in the preferences`;
        fallback[`road_themes_title`] = `Road Themes`;
        fallback[`road_themes_descr`] = `Applies a predefined theme to your preferences`;
        fallback[`show_ans`] = `Show Alternative Names`;
        fallback[`show_ans_descr`] = `When enabled, at most 2 ANs that differ from the primary name are shown under the street name.`;
        fallback[`layer_opacity`] = `Layer Opacity`;
        fallback[`layer_opacity_descr`] = `10: almost invisible, 100: opaque.`;
        fallback[`enable_routing_mode`] = `Enable Routing Mode`;
        fallback[`enable_routing_mode_descr`] = `When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway.`;
        fallback[`hide_routing_mode_panel`] = `Hide the Routing Mode Panel`;
        fallback[`hide_routing_mode_panel_descr`] = `When enabled, the overlay to temporarily disable the routing mode is not shown.`;
        fallback[`gps_layer_above_roads`] = `GPS Layer above Roads`;
        fallback[`gps_layer_above_roads_descr`] = `When enabled, the GPS tracks layer gets shown above the road layer.`;
        fallback[`label_width`] = `Labels Outline Width`;
        fallback[`label_width_descr`] = `How much border should the labels have?`;
        fallback[`hide_road_layer`] = `Hide WME Road Layer`;
        fallback[`hide_road_layer_descr`] = `When enabled, the WME standard road layer gets hidden automatically.`;
        fallback[`svl_initially_disabled`] = `SVL Initially Disabled`;
        fallback[`svl_initially_disabled_descr`] = `When enabled, the SVL does not get enabled automatically.`;
        fallback[`street_names_density`] = `Street Names Density`;
        fallback[`street_names_density_descr`] = `For a higher value, less elements will be shown.`;
        fallback[`render_geometry_nodes`] = `Render Geometry Nodes`;
        fallback[`render_geometry_nodes_descr`] = `When enabled, the geometry nodes are drawn, too.`;
        fallback[`render_as_level`] = `Render Map as Level`;
        fallback[`render_as_level_descr`] = `All segments locked above this level will be stroked through with a black line.`;
        fallback[`font_size_close`] = `Font Size (at close zoom)`;
        fallback[`font_size_close_descr`] = `Increase this value if you can't read the street names because they are too small.`;
        fallback[`limit_arrows`] = `Limit Arrows`;
        fallback[`limit_arrows_descr`] = `Increase this value if you want less arrows to be shown on streets (this may increase the script's performance).`;
        fallback[`far_zoom_only`] = `Far-zoom only`;
        fallback[`close_zoom_only`] = `Close-zoom only`;
        fallback[`font_size_far`] = `Font Size (at far zoom)`;
        fallback[`font_size_far_descr`] = `Increase this value if you can't read the street names because they are too small.`;
        fallback[`hide_minor_roads`] = `Hide minor roads at zoom 3`;
        fallback[`hide_minor_roads_descr`] = `The WME loads some type of roads when they probably shouldn't be there, check this option for avoid displaying them at higher zooms.`;
        fallback[`automatically_refresh`] = `Automatically Refresh the Map`;
        fallback[`automatically_refresh_descr`] = `When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.`;
        fallback[`autoreload_interval`] = `Auto Reload Time Interval (in Seconds)`;
        fallback[`autoreload_interval_descr`] = `How often should the WME be refreshed for new edits?`;
        fallback[`stop_svl_at_zoom`] = `Stop using SVL at zoom level`;
        fallback[`stop_svl_at_zoom_descr`] = `When you reach this zoom level, the WME's road layer gets automatically enabled.`;
        fallback[`close_zoom_until_level`] = `Close-zoom until zoom level`;
        fallback[`close_zoom_until_level_descr`] = `When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)`;
        fallback[`segments_threshold`] = `Segments threshold`;
        fallback[`segments_threshold_descr`] = `When the WME wants to draw more than this amount of segments, switch to the WME's road layer`;
        fallback[`nodes_threshold`] = `Nodes threshold`;
        fallback[`nodes_threshold_descr`] = `When the WME wants to draw more than this amount of nodes, switch to the WME's road layer`;
        fallback[`show_sl_on_name`] = `Show on the Street Name`;
        fallback[`show_sl_on_name_descr`] = `Show the speed limit as text at the end of the street name.`;
        fallback[`show_sl_with_colors`] = `Show using colors`;
        fallback[`show_sl_with_colors_descr`] = `Show the speed limit by coloring the segment's outline.`;
        fallback[`show_sl_with_one_color`] = `Show using Single Color`;
        fallback[`show_sl_with_one_color_descr`] = `Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value.`;
        fallback[`show_unverified_dashed`] = `Show unverified Speed Limits with a dashed Line`;
        fallback[`show_unverified_dashed_descr`] = `If the speed limit is not verified, it will be shown with a different style.`;
        initSVL();
    }

})();
