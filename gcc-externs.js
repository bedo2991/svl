/* eslint-disable */
/** @fileoverview Define globals that must not be renamed
 *  @externs
 */
const Restriction = class {
  constructor() {}
  /**
   * @return {string}
   */
  getDefaultType() {}
};

/**
 * @typedef {Object} SegmentAttributes
 * @property {number} id - the segments ID
 * @property {number} roadType - the ID of the roads' type
 * @property {?number} routingRoadType
 * @property {Array.<number>} virtualNodeIDs
 * @property {boolean} separator
 * @property {number} lockRank
 * @property {boolean} validated
 * @property {number} createdBy
 * @property {number} createdOn
 * @property {number} updatedBy
 * @property {number}  updatedOn
 * @property {boolean}  fwdDirection
 * @property {boolean}  revDirection
 * @property {number}  fromNodeID
 * @property {number}  toNodeID
 * @property {number}  primaryStreetID
 * @property {OpenLayers.Geometry.LineString}  geometry
 * @property {number}  fwdMaxSpeed
 * @property {number}  revMaxSpeed
 * @property {boolean}  fwdMaxSpeedUnverified
 * @property {boolean}  revMaxSpeedUnverified
 * @property {Array.<number>}  streetIDs
 * @property {?number}  junctionID
 * @property {boolean}  hasHNs
 * @property {boolean}  hasClosures
 * @property {number}  length
 * @property {boolean}  fwdToll
 * @property {boolean}  revToll
 * @property {Array.<Restriction>}  restrictions
 * @property {Array}  parkingRestrictions
 * @property {Array}  pickupRestrictions
 * @property {number}  permissions
 * @property {?number}  crossroadID
 * @property {Array}  fromCrossroads
 * @property {Array}  toCrossroads
 * @property {boolean}  allowNoDirection
 * @property {boolean}  fwdTurnsLocked
 * @property {boolean}  revTurnsLocked
 * @property {number}  flags
 * @property {number}  fwdFlags
 * @property {number}  revFlags
 * @property {number}  level
 * @property {number}  rank
 * @property {number}  fwdLaneCount
 * @property {number}  revLaneCount
 */
let SegmentAttributes;

/**
 * @typedef {Object} NodeAttributes
 * @property {number} id
 * @property {OpenLayers.Geometry.Point} geometry
 * @property {number} permissions
 * @property {?number} rank
 * @property {Array.<number>} segIDs
 * @property {boolean} partial
 */
let NodeAttributes;

/**
 * @typedef {Object} StyleMapContent
 * @property {string} strokeColor
 * @property {string} strokeWidth
 * @property {string} strokeOpacity
 * @property {string} strokeDashstyle
 * @property {string} graphicZIndex
 * @property {string} fontFamily
 * @property {string} fontWeight
 * @property {string} fontColor
 * @property {string} labelOutlineColor
 * @property {string} labelOutlineWidth
 * @property {string} label
 * @property {string} angle
 * @property {string} pointerEvents
 * @property {boolean} visibility
 */
let StyleMapContent;

/**
 * @typedef {Object} StreetAttributes
 * @property {number} id
 * @property {?number} cityID
 * @property {?string} englishName
 * @property {?string} name
 * @property {boolean} isEmpty
 * @property {boolean} outOfScope
 * @property {boolean} persistent
 * @property {boolean} selected
 * @property {?string} signText
 * @property {?string} signType
 * @property {?number} state
 */
let StreetAttributes;

/**
 * @typedef {Object} AddressAttributes
 * @property {Object} state
 * @property {StreetAttributes} street
 */

let AddressAttributes;

/**
 * @typedef {Object} AddressObject
 * @property {AddressAttributes} attributes
 */

let AddressObject;

/**
 * @typedef {Object} FlagAttributes
 * @property {boolean} tunnel
 * @property {boolean} unpaved
 * @property {boolean} headlights
 * @property {boolean} beacons
 * @property {boolean} nearbyHOV
 * @property {boolean} fwdSpeedCamera
 * @property {boolean} revSpeedCamera
 * @property {boolean} fwdLanesEnabled
 * @property {boolean} revLanesEnabled
 */
let FlagAttributes;

const W = {
  'controller': {
    'reload': function () {},
  },
  'map': {
    /**
     * @return {OpenLayers.Map}
     */
    'getOLMap': function () {},
    /**
     *
     * @param {string} uniqueName
     * @return {OpenLayers.Layer.Vector}
     */
    'getLayerByUniqueName': function (uniqueName) {},
  },
  'model': {
    'actionManager': {
      /**
       * @return {number}
       */
      'unsavedActionsNum': function () {},
    },
    'streets': {
      /** @type{Object.<number, StreetAttributes>} */
      'objects': {},
      '_events': {
        'objectsupdated': [],
      },
    },
    'segments': {
      'objects': {},
      '_events': {
        'objectsadded': [],
        'objectschanged': [],
        'objectsremoved': [],
        'objects-state-deleted': [],
      },
    },
    'nodes': {
      'objects': {},
      '_events': {
        'objectsadded': [],
        'objectschanged': [],
        'objectsremoved': [],
        'objects-state-deleted': [],
      },
    },
  },
  'prefs': {
    'attributes': {
      'isImperial': true,
    },
  },
};

const I18n = {
  'translations': {},
  /** @type {string} */
  'locale': '',
};
const GM_info = {
  'script': {
    /** @type {string} */
    'version': '',
    /** @type {string} */
    'supportURL': '',
    /** @type {string} */
    'name': '',
  },
};

/**
 * @typedef {Object} OpenLayers
 */
const OpenLayers = {
  'Bounds': class {
    constructor() {}

    /**
     *
     * @param {OpenLayers.Bounds} extend
     * @return {boolean}
     */
    intersectsBounds(extend) {}
  },
  'LonLat': class {
    /**
     *
     * @param {number} lon
     * @param {number} lat
     */
    constructor(lon, lat) {}
  },
  'Pixel': class {
    /**
     *
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {}
  },
  'Map': class {
    constructor() {
      /** @type {number} */
      this.zoom;
      /** @type {number} */
      this.resolution;
      this.events = {
        /**
         *
         * @param {string} eventName
         * @param {*} a
         * @param {Function} callback
         * @param {boolean} [priority=false]
         */
        'register': function (eventName, a, callback, priority) {},
      };
    }

    /**
     *
     * @param {OpenLayers.Layer.Vector} layer
     */
    addLayer(layer) {}

    /**
     *
     * @param {string} attr
     * @param {string} value
     * @return {Array.<OpenLayers.Layer.Vector>}
     */
    getLayersBy(attr, value) {}
  },
  'StyleMap': class {
    /**
     *
     * @param {StyleMapContent} style
     */
    constructor(style) {}
  },
  /** @typedef {Object} Geometry */
  'Geometry': {
    'Point': class Point {
      /**
       *
       * @param {number} x
       * @param {number} y
       */
      constructor(x, y) {
        /** @type {number} */
        this.x;
        /** @type {number} */
        this.y;
      }

      /**
       *
       * @param {OpenLayers.Geometry.Point} point
       * @return {number}
       */
      distanceTo(point) {}
    },
    'LineString': class LineString {
      constructor(pointArray) {
        /** @type {Array.<OpenLayers.Geometry.Point>} */
        this.components;
      }
      /**@return Array */
      getVertices() {}
      /**
       *
       * @param {boolean} a
       */
      getCentroid(a) {}

      /**
       *
       * @param {number} factor
       * @return {OpenLayers.Geometry.LineString}
       */
      simplify(factor) {}
    },

    /**
     * @return {OpenLayers.Bounds}
     */
    'getBounds': function () {},
  },
  /** @typedef Renderer */
  'Renderer': class {
    constructor() {
      /** @type {number} */
      this.featureDx;
      this.textRoot;
      this.left;
      //* * @type {OpenLayers.Bounds} */
      this.extent;
      this.top;
      /** @type {string} */
      this.LABEL_ID_SUFFIX;
      /** @type {string} */
      this.LABEL_OUTLINE_SUFFIX;
    }

    /**
     *
     * @param {number} id
     */
    removeText(id) {}

    /** @returns {number} */
    getResolution() {}

    drawFeature(feature, style) {}

    drawText(id, style, location) {}

    drawGeometry(geometry, style, id) {}

    /**
     *
     * @param {string} id
     * @param {string} type
     */
    nodeFactory(id, type) {}
  },
  /** @type {boolean} */
  'IS_GECKO': true,
  'Util': {
    'extend': function (a, b) {},
  },
  /** @typedef Feature
   */
  'Feature': {
    'Vector': class {
      /**
       *
       * @param {OpenLayers.Geometry.Point | OpenLayers.Geometry.LineString} geometry
       * @param {Object} attributes
       * @param {Object=} style
       */
      constructor(geometry, attributes, style) {
        /** @type {OpenLayers.Geometry.Point | OpenLayers.Geometry.LineString} */
        this.geometry;
        this.attributes;
        /** @type{Waze.Feature.Vector.Segment|Waze.Feature.Vector.Node} */
        this.model;
        this.style;
      }

      /** @return {OpenLayers.Feature.Vector} */
      clone() {}
      /**
       *
       * @param {OpenLayers.LonLat|OpenLayers.Pixel} lonLat
       */
      move(lonLat) {}
    },
  },
  /** @typedef Layer
   *
   */
  'Layer': {
    /**
     * @unrestricted
     */
    'Vector': class {
      /**
       *
       * @param {string} name
       * @param {Object} properties
       */
      constructor(name, properties) {
        this.events = {
          /**
           *
           * @param {string} eventName
           * @param {*} a
           * @param {Function} callback
           * @param {boolean} [priority=false]
           */
          'register': function (eventName, a, callback, priority) {},
        };
        /** @type {OpenLayers.Renderer} */
        this.renderer;
        /** @type {boolean} */
        this.visibility = true;
        /** @type {Array.<OpenLayers.Feature.Vector>} */
        this.features;
      }

      /**
       * @return {number}
       */
      getZIndex() {}

      /**
       *
       * @param {boolean} bool
       */
      setVisibility(bool) {}

      /**
       *
       * @return {boolean}
       */
      getVisibility() {}

      /**
       *
       * @param {number} value
       */
      setZIndex(value) {}

      /**
       *
       * @param {Array.<OpenLayers.Feature.Vector>=} array
       * @param {Object=} options
       */
      destroyFeatures(array, options) {}

      /**
       *
       * @param {string} featureName
       * @param {*} id
       * @return {Array.<OpenLayers.Feature.Vector>}
       */
      getFeaturesByAttribute(featureName, id) {}

      /**
       *
       * @param {Array.<OpenLayers.Feature.Vector>} features
       * @param {Object=} options
       */
      addFeatures(features, options) {}
    },
  },
};
// Static properties
OpenLayers.Renderer.symbol = {};
OpenLayers.Renderer.defaultSymbolizer = {
  /** @type {string} */
  'labelAlign': '',
};

OpenLayers.Renderer.SVG = class SVG {
  constructor() {}
};

// Static properties
OpenLayers.Renderer.SVG.LABEL_VSHIFT = [];
OpenLayers.Renderer.SVG.LABEL_ALIGN = [];
OpenLayers.Renderer.SVG.LABEL_VFACTOR = [];

const WazeWrap = {
  'User': {
    /** @return {number} */
    'Rank': function () {},
  },
  'Alerts': {
    /**
     *
     * @param {string} name
     * @param {string} message
     */
    'info': function (name, message) {},
    /**
     *
     * @param {string} name
     * @param {string} message
     */
    'warning': function (name, message) {},
    /**
     *
     * @param {string} name
     * @param {string} message
     */
    'error': function (name, message) {},
    /**
     *
     * @param {string} name
     * @param {string} message
     */
    'success': function (name, message) {},
    /**
     *
     * @param {string} name
     * @param {string} message
     */
    'debug': function (name, message) {},
    /**
     *
     * @param {string} name
     * @param {string} message
     * @param {?string} defaultText
     * @param {Function} okCallback
     * @param {Function} cancelCalback
     */
    'prompt': function (
      name,
      message,
      defaultText,
      okCallback,
      cancelCalback
    ) {},
    /**
     *
     * @param {string} name
     * @param {string} message
     * @param {Function} okCallback
     * @param {Function} cancelCalback
     * @param {?string} [okButtonText="Ok"]
     * @param {?string} [cancelButtonText="Cancel"]
     */
    'confirm': function (
      name,
      message,
      okCallback,
      cancelCalback,
      okButtonText,
      cancelButtonText
    ) {},
  },
  /** @type {boolean} */
  'Ready': true,
  /**
   * @return {boolean}
   */
  'hasSelectedFeatures': function () {},
  'Interface': {
    'Tab': class {
      /**
       * Creates a tab in the side panel
       * @function WazeWrap.Interface.Tab
       * @param {string} name
       * @param {string} content
       * @param {Function} callback
       * @param {Object=} context
       * */
      constructor(name, content, callback, context) {}
    },
    'Shortcut': class {
      /**
       * Creates a keyboard shortcut for the supplied callback event
       * @function WazeWrap.Interface.Shortcut
       * @param {string} name
       * @param {string} desc
       * @param {string} group
       * @param {string} title
       * @param {string} shortcut
       * @param {Function} callback
       * @param {Object=} scope
       * @return {OpenLayers.Geometry.Point} A point at the general location of the segment, null if the segment is not found
       * */
      constructor(name, desc, group, title, shortcut, callback, scope) {}

      add() {}
    },
    /**
     *
     * @param {string} name
     * @param {string} version
     * @param {string} html
     * @param {string} greasemonkeyURL
     * @param {string} forumURL
     */
    'ShowScriptUpdate': function (
      name,
      version,
      html,
      greasemonkeyURL,
      forumURL
    ) {},

    /**
     * Creates a checkbox in the layer menu
     * @function WazeWrap.Interface.AddLayerCheckbox
     * @param {string} group
     * @param {string} checkboxText
     * @param {boolean} checked
     * @param {Function} callback
     * @param {Object} layer
     * */
    'AddLayerCheckbox': function (
      group,
      checkboxText,
      checked,
      callback,
      layer
    ) {},
  },
};
const jQueryObject = class jQueryObject {
  constructor() {}
  /**
   *
   * @param {string} a
   * @param {boolean|string} b
   */
  prop(a, b) {}
  /**
   *
   * @param {Function} callback
   */
  click(callback) {}
};

/**
 * @param {string} x
 * @return {jQueryObject}
 */
const $ = function (x) {};
/**
 *
 * @param {string} x
 */
const GM_setClipboard = function (x) {};

/** @typedef {Object} Waze */
const Waze = {
  'DataModel': class {
    constructor() {}
  },
  /** @typedef {Object} Feature */
  'Feature': {
    /** @typedef {Object} Vector */
    'Vector': {
      'Segment': class {
        constructor() {
          /** @type{Waze.DataModel} */
          this.model;
          /** @type {SegmentAttributes} */
          this.attributes;
          /** @type {string} */
          this.state;
        }

        /** @return {SegmentAttributes} */
        getAttributes() {}

        /** @return {boolean} */
        isOneWay() {}

        /** @return {boolean} */
        isInRoundabout() {}

        /** @return {number} - from 0 to 6. */
        getLockRank() {}

        /** @return {FlagAttributes} */
        getFlagAttributes() {}

        /** @return {AddressObject} */
        getAddress() {}

        /** @return {boolean} */
        hasNonEmptyStreet() {}
        /**
         * @return {number}
         */
        getID() {}

        /**
         * @return {?number}
         */
        getOldID() {}
      },
      'Node': class {
        constructor() {
          /** @type {NodeAttributes} */
          this.attributes;
        }

        /** @return {NodeAttributes} */
        getAttributes() {}

        /** @return {boolean} */
        isOneWay() {}

        /** @return {boolean} */
        isInRoundabout() {}

        /** @return {number} - from 0 to 6. */
        getLockRank() {}

        /** @return {FlagAttributes} */
        getFlagAttributes() {}

        /**
         * @return {number}
         */
        getID() {}
      },
    },
  },
};
