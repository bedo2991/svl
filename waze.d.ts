// waze.d.ts

declare class Restriction {
  constructor();
  getDefaultType(): string;
}

interface StyleObject {
  pointerEvents: string;
  fontSize: string;
  fontColor: string;
  fontStrokeColor: string;
  fontStrokeWidth: string;
  fontOpacity: string;
  labelOutlineColor: string;
  labelOutlineWidth: string;
  pointRadius: string;
  fontFamily: string;
  display: string;
  label: string;
  labelXOffset: string;
  labelYOffset: string;
  strokeWidth: string;
}

type GeoJson = {
  type: string;
  coordinates: Array<Array<number>>; // or number[][]
};

type GeoJsonPoint = {
  type: string;
  coordinates: Array<number>;
};

interface LaneWidthInfos {
  laneWidth: number | null;
  numberOfLanes: number;
}

interface SegmentAttributes {
  id: number;
  roadType: number;
  routingRoadType: number | null;
  virtualNodeIDs: Array<number>;
  separator: boolean;
  lockRank: number;
  validated: boolean;
  createdBy: number;
  createdOn: number;
  updatedBy: number;
  updatedOn: number;
  fwdDirection: boolean;
  revDirection: boolean;
  fromNodeID: number;
  toNodeID: number;
  primaryStreetID: number | null;
  fwdMaxSpeed: number;
  revMaxSpeed: number;
  fwdMaxSpeedUnverified: boolean;
  revMaxSpeedUnverified: boolean;
  streetIDs: Array<number>;
  junctionID: number | null;
  hasHNs: boolean;
  hasClosures: boolean;
  length: number;
  fwdToll: boolean;
  revToll: boolean;
  restrictions: Array<Restriction>;
  parkingRestrictions: Array<any>; // Consider defining a type if structure is known
  pickupRestrictions: Array<any>;  // Consider defining a type if structure is known
  permissions: number;
  crossroadID: number | null;
  fromCrossroads: Array<number>;
  toCrossroads: Array<number>;
  allowNoDirection: boolean;
  fwdTurnsLocked: boolean;
  revTurnsLocked: boolean;
  flags: number;
  fwdFlags: number;
  revFlags: number;
  level: number;
  rank: number;
  fwdLaneCount: number;
  revLaneCount: number;
  width?: number;
  fromLanesInfo: LaneWidthInfos;
  toLanesInfo: LaneWidthInfos;
}

interface RegisterSidebarTabResult {
  tabLabel: HTMLElement;
  tabPane: HTMLElement;
}

interface NodeAttributes {
  id: number;
  permissions: number;
  rank: number | null;
  segIDs: Array<number>;
  partial: boolean;
}

interface StyleMapContent {
  strokeColor?: string;
  strokeWidth?: string;
  strokeOpacity?: string;
  strokeDashstyle?: string;
  graphicZIndex?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontColor?: string;
  labelOutlineColor?: string;
  labelOutlineWidth?: string;
  label?: string;
  angle?: string;
  pointerEvents?: string;
  visibility?: boolean;
}

interface WazeModelTopCountryAttributes {
  abbr: string;
  env: string;
  id: number;
  defaultLaneWidthPerRoadType: Record<string, number>;
}

interface WazeModelTopCountry {
  getID(): number;
  /**@deprecated*/
  abbr: string;
  /**@deprecated*/
  env: string;
  /**@deprecated*/
  id: number;
  /** @deprecated*/
  defaultLaneWidthPerRoadType: Record<string, number>;
  attributes: WazeModelTopCountryAttributes;
}

interface WazeModelEvents {
  register(event_name: string, context: any | null, callback: (...args: any[]) => void): void;
  unregister(event_name: string, context: any | null, callback: (...args: any[]) => void): void;
}

interface WazeModelCollection<T> {
  objects: Record<number, T>; // Assuming IDs are numbers
  _events: Record<string, Array<any>>; // Array of what? Functions? Objects?
}

interface WazeModelSegmentsCollection extends WazeModelCollection<Waze.Feature.Vector.Segment> {
  _events: {
    objectsadded: any[];
    objectschanged: any[];
    objectsremoved: any[];
    'objects-state-deleted': any[];
  };
  getObjectById(id: number): Waze.Feature.Vector.Segment | null;
}

interface WazeModelNodesCollection extends WazeModelCollection<Waze.Feature.Vector.Node> {
  _events: {
    objectsadded: any[];
    objectschanged: any[];
    objectsremoved: any[];
    'objects-state-deleted': any[];
  };
}
interface WazeModelStreetsCollection extends WazeModelCollection<StreetAttributes> {
  getObjectById(id: number): StreetAttributes | null;
  _events: {
    objectsupdated: any[];
  };
}


interface IWazeModel {
  events: WazeModelEvents;
  actionManager: {
    unsavedActionsNum(): number;
  };
  topCountry: WazeModelTopCountry;
  streets: WazeModelStreetsCollection;
  segments: WazeModelSegmentsCollection; // Define more specific type if possible
  nodes: WazeModelNodesCollection;       // Define more specific type if possible
}
declare const WazeModel: IWazeModel;


interface StreetAttributes {
  getName(): string | null;
  id: number;
  cityID: number;
  englishName: string;
  /** @deprecated */
  name: string;
  isEmpty: boolean;
  outOfScope: boolean;
  persistent: boolean;
  selected: boolean;
  signText: string;
  signType: string;
  state: number;
}

interface AddressAttributes {
  state: object; // Consider defining a more specific type
  street: StreetAttributes;
}

declare class AddressObject { // Assuming AddressObject is a class, not just a type
  attributes: AddressAttributes;
  hasState(): boolean;
  getStreetName(): string;
  getStreet(): StreetAttributes | null;
  isEmptyStreet(): boolean;
  isEmpty(): boolean;
}

interface FlagAttributes {
  tunnel: boolean;
  unpaved: boolean;
  headlights: boolean;
  beacons: boolean;
  nearbyHOV: boolean;
  fwdSpeedCamera: boolean;
  revSpeedCamera: boolean;
  fwdLanesEnabled: boolean;
  revLanesEnabled: boolean;
}

interface WUserscriptsState {
  isInitialMapDataLoaded: boolean;
  isInitialized: boolean;
  isReady: boolean;
}

interface WUserscripts {
  state: WUserscriptsState;
  registerSidebarTab(scriptID: string): RegisterSidebarTabResult;
  waitForElementConnected(el: HTMLElement): Promise<void>;
}

interface WController {
  reload(): void;
}

interface WMap {
  roadLayer: OpenLayers.Layer.Vector | null;
  roadLayers: Array<OpenLayers.Layer.Vector> | null;
  /** @deprecated */
  getWazeMap(): WazeMap;
  /** @deprecated */
  getOLMap(): OpenLayers.Map;
  /** @deprecated */
  getLayerByUniqueName(uniqueName: string): OpenLayers.Layer.Vector;
  getLayerByName(uniqueName: string): OpenLayers.Layer.Vector;
}

interface WPrefsAttributes {
  isImperial: boolean;
}

interface WPrefs {
  _events: object; // Define more specific type if possible
  attributes: WPrefsAttributes;
}

interface IW {
  userscripts: WUserscripts;
  controller: WController;
  map: WMap;
  model: IWazeModel;
  prefs: WPrefs;
}
declare const W: IW;

interface I18nTranslations {
  [key: string]: any; // Could be string or nested object
}

interface II18n {
  translations: I18nTranslations;
  locale: string;
  currentLocale(): string;
}
declare const I18n: II18n;

interface GMInfoScript {
  version: string;
  supportURL: string;
  name: string;
}

interface IGMInfo {
  script: GMInfoScript;
}
declare const GM_info: IGMInfo;

/** @deprecated */
interface WazeMap {
  regionCode: string;
  deployEnv: string;
  minZoomLevel: number;
  maxZoomLevel: number;
  olMap: OpenLayers.Map;
  /** @deprecated */
  getOLMap(): OpenLayers.Map;
}

// OpenLayers definitions
declare namespace OpenLayers {
  class ElementsIndexer {
    constructor();
    order: Array<string>;
    indices: Record<string, any>; // More specific type if known for indices' values
    getZIndex(node: Element): number;
    determineZIndex(newNode: any): void;
    exists(newNode: HTMLElement): boolean;
    insert(newNode: HTMLElement): (HTMLElement | null);
    remove(newNode: HTMLElement): void;
    compare(a: any, b: any, c: any): any; // Define more specific types
    getNextElement(index: number): HTMLElement;
  }

  namespace Event {
    function preventDefault(event: Event): void;
  }

  const State: {
    UNKNOWN: "Unknown";
    INSERT: "Insert";
    UPDATE: "Update";
    DELETE: "Delete";
  };

  class Bounds {
    constructor(left?: number, bottom?: number, right?: number, top?: number); // Common constructor
    intersectsBounds(extend: OpenLayers.Bounds): boolean;
    scale(ratio: number, origin?: OpenLayers.Pixel | OpenLayers.LonLat): OpenLayers.Bounds;
    // Add other common Bounds methods like toGeometry, getCenterLonLat, etc. if used
  }

  class Projection {
    constructor(projCode: string, object?: object);
    proj: any; // Could be more specific, e.g. Proj4js.Proj
    projCode: string;
    titleRegEx: RegExp; // Assuming it's a RegExp
  }

  class LonLat {
    lon: number;
    lat: number;
    constructor(lon: number, lat: number);
    add(lon: number, lat: number): OpenLayers.LonLat;
    transform(source: OpenLayers.Projection, dest: OpenLayers.Projection): OpenLayers.LonLat;
    // Add other common LonLat methods like clone, equals, etc. if used
  }

  class Pixel {
    x: number;
    y: number;
    constructor(x: number, y: number);
    // Add other common Pixel methods like clone, equals, add, etc. if used
  }

  class Size {
    w: number;
    h: number;
    constructor(w: number, h: number);
    // Add other common Size methods like clone, equals, etc. if used
  }

  class Map {
    constructor(div: string | HTMLElement, options?: any); // Common constructor
    zoom: number;
    resolution: number;
    projection: OpenLayers.Projection;
    layerContainerOriginPx: { x: number; y: number };
    events: {
      register(eventName: string, context: any, callback: (...args: any[]) => void, priority?: boolean): void;
      // Add unregister, triggerEvent if needed
    };
    getCachedCenter(): OpenLayers.LonLat;
    addLayer(layer: OpenLayers.Layer.Vector | OpenLayers.Layer.LayerBase): void; // Allow any layer type
    getLayersBy(attr: string, value: string): Array<OpenLayers.Layer.Vector | OpenLayers.Layer.LayerBase>;
    getGeodesicPixelSize(pixel?: OpenLayers.Pixel): OpenLayers.Size;
    getSize(): OpenLayers.Size;
    getExtent(): OpenLayers.Bounds;
    // Add other common Map methods like getZoom, setCenter, addControl, etc. if used
  }

  class StyleMap {
    constructor(style: StyleMapContent | any); // 'any' for complex OL style objects
    createSymbolizer(feature: OpenLayers.Feature.Vector, intent: string): object;
  }

  interface IGeometry {
    // Common geometry properties/methods
    id: string;
    bounds: OpenLayers.Bounds | null;
    getBounds(): OpenLayers.Bounds | null;
    transform(source: OpenLayers.Projection, dest: OpenLayers.Projection): this;
    CLASS_NAME: string;
    // Add other common methods like clone, destroy, etc.
  }

  namespace Geometry {
    class Point implements OpenLayers.IGeometry {
      x: number;
      y: number;
      id: string;
      bounds: OpenLayers.Bounds | null;
      CLASS_NAME: string;
      constructor(x: number, y: number);
      transform(source: OpenLayers.Projection, dest: OpenLayers.Projection): OpenLayers.Geometry.Point;
      distanceTo(point: OpenLayers.Geometry.Point): number;
      getBounds(): OpenLayers.Bounds | null;
      getCentroid(): OpenLayers.Geometry.Point;
      clone(): OpenLayers.Geometry.Point;
      move(x: number, y: number): void;
      // Add other common Point methods
    }

    class LineString implements OpenLayers.IGeometry {
      components: Array<OpenLayers.Geometry.Point>;
      id: string;
      bounds: OpenLayers.Bounds | null;
      CLASS_NAME: string;
      constructor(points: Array<OpenLayers.Geometry.Point>);
      getVertices(): Array<OpenLayers.Geometry.Point>;
      simplify(factor: number): OpenLayers.Geometry.LineString;
      getBounds(): OpenLayers.Bounds | null;
      transform(source: OpenLayers.Projection, dest: OpenLayers.Projection): OpenLayers.Geometry.LineString;
      getCentroid(weighted?: boolean): Point;
      clone(): Geometry;
      // Add other common LineString methods
    }
  }

  class Renderer {
    constructor(); // Assuming a constructor, though not specified
    featureDx: number;
    root: HTMLElement;
    textRoot: HTMLElement; // Or SVGElement if specific
    left: any; // Type?
    extent: OpenLayers.Bounds;
    top: any; // Type?
    LABEL_ID_SUFFIX: string;
    LABEL_OUTLINE_SUFFIX: string;
    vectorRoot: HTMLElement; // Or SVGElement
    indexer: OpenLayers.ElementsIndexer;
    locked: boolean;

    getNodeType(geometry: OpenLayers.IGeometry, style: object): string;
    postDraw(node: HTMLElement): void;
    drawGeometryNode(node: HTMLElement, geometry: OpenLayers.IGeometry, style: object): ({ node: any, complete: boolean } | boolean);
    applyDefaultSymbolizer(symbolizer: object): object;
    redrawNode(id: string, geometry: OpenLayers.Geometry.Point, style: object, featureId: string): void;
    redrawBackgroundNode(id: string, geometry: OpenLayers.Geometry.Point, style: object, featureId: string): void;
    removeText(id: number | string): void; // ID could be string based on other methods
    getResolution(): number;
    drawFeature(feature: OpenLayers.Feature.Vector, style?: object): void; // Style often optional
    drawText(id: string, style: object, location: OpenLayers.Geometry.Point): void; // Location can be complex
    setExtent(extent: OpenLayers.Bounds, resolutionChanged?: boolean): void;
    drawGeometry(geometry: OpenLayers.IGeometry, style: object, id: string): boolean;
    nodeFactory(id: string, type: string): HTMLLabelElement; // Or SVGElement etc.

    static symbol: any; // Or Record<string, any>
    static BACKGROUND_ID_SUFFIX: string;
    static defaultSymbolizer: {
      labelAlign: string;
      // Add other default symbolizer properties if known
    };
  }

  namespace Renderer { // For nested classes/statics
    class SVG { // Assuming this is a class that can be instantiated
      constructor();
      static LABEL_VSHIFT: any[]; // Or number[]
      static LABEL_ALIGN: any[];  // Or string[]
      static LABEL_VFACTOR: any[];// Or number[]
    }
  }


  const IS_GECKO: boolean;

  namespace Util {
    function getElement(...element: (string | HTMLElement)[]): HTMLElement | null;
    function isArray(obj: any): boolean;
    function extend(destination: object, source: object): object;
    function distVincenty(p1: OpenLayers.LonLat, p2: OpenLayers.LonLat): number; // Assuming LonLat points
  }

  namespace Feature {
    class Vector {
      geometry: OpenLayers.Geometry.Point | OpenLayers.Geometry.LineString | null;
      layer: OpenLayers.Layer.Vector | null;
      attributes: any; // Can be more specific if attributes structure is known
      model: Waze.Feature.Vector.Segment | Waze.Feature.Vector.Node; // Assuming Waze feature model
      style: any | null; // OL style object
      id: string; // Features usually have an ID

      constructor(
        geometry?: OpenLayers.Geometry.Point | OpenLayers.Geometry.LineString,
        attributes?: any,
        style?: any
      );
      clone(): OpenLayers.Feature.Vector;
      move(lonLat: OpenLayers.LonLat | OpenLayers.Pixel): void; // Argument can also be Pixel
      // Add other common Feature.Vector methods like destroy, toState, etc.
    }
  }

  namespace Layer {
    // A base layer class might be useful if common properties are shared
    class LayerBase {
      map: OpenLayers.Map | null;
      div: HTMLElement;
      events: {
        /* @deprecated */
        register(eventName: string, context: any, callback: (...args: any[]) => void, priority?: boolean): void;
        triggerEvent(type: string, evt: any): boolean;
      };
      constructor(name: string, options?: any);
      // Common methods for all layers
      destroy(): void;
      setOpacity(opacity: number): void;
      setVisibility(visibility: boolean): void;
      getVisibility(): boolean;
      redraw(): boolean;
      moveTo(bounds: OpenLayers.Bounds, zoomChanged: boolean, dragging: boolean): void;
      // Add other common methods: getZIndex, setZIndex, addOptions, etc.
    }

    class Vector extends LayerBase {
      renderer: OpenLayers.Renderer;
      visibility: boolean; // Already in LayerBase if it inherits, but explicitly listed
      features: Array<OpenLayers.Feature.Vector>;
      unrenderedFeatures: Map<number, OpenLayers.Feature.Vector>; // Key type might be string
      style: any | null; // OL style object
      styleMap: OpenLayers.StyleMap;

      constructor(name: string, properties?: any); // properties is often 'options'

      // redraw is in LayerBase
      preFeatureInsert(feature: OpenLayers.Feature.Vector): void;
      onFeatureInsert(feature: OpenLayers.Feature.Vector): void;
      getZIndex(): string;
      setZIndex(zIndex: (number | string)): void;
      // setOpacity, setVisibility, getVisibility, setZIndex are in LayerBase
      destroyFeatures(features?: Array<OpenLayers.Feature.Vector>, options?: object): void;
      getFeaturesByAttribute(attributeName: string, id: any): Array<OpenLayers.Feature.Vector>;
      addFeatures(features: Array<OpenLayers.Feature.Vector>, options?: object): void;
      // setZIndex(zIndex: number): void;
      // moveTo is in LayerBase
    }
  }
}


declare namespace WazeWrap {
  namespace User {
    function Rank(): number;
  }
  namespace Alerts {
    function info(name: string, message: string): void;
    function warning(name: string, message: string): void;
    function error(name: string, message: string): void;
    function success(name: string, message: string): void;
    function debug(name: string, message: string): void;
    function prompt(
      name: string,
      message: string,
      defaultText: string | null,
      okCallback: (text: string) => void,
      cancelCalback?: () => void // Typically optional
    ): void;
    function confirm(
      name: string,
      message: string,
      okCallback: () => void,
      cancelCalback?: () => void, // Typically optional
      okButtonText?: string,
      cancelButtonText?: string
    ): void;
  }
  const Ready: boolean;
  function hasSelectedFeatures(): boolean;

  namespace Interface {
    class Tab {
      constructor(name: string, content: string, callback?: () => void, context?: object);
      // Add methods if Tab instances have them
    }
    class Shortcut {
      constructor(
        name: string,
        desc: string,
        group: string,
        title: string,
        shortcut: string,
        callback: () => void,
        scope?: object
      );
      add(): void;
      // Add other methods if Shortcut instances have them (e.g., remove)
    }
    function ShowScriptUpdate(
      name: string,
      version: string,
      html: string,
      greasemonkeyURL?: string, // Often optional
      forumURL?: string // Often optional
    ): void;
    function AddLayerCheckbox(
      group: string,
      checkboxText: string,
      checked: boolean,
      callback: (checked: boolean) => void,
      layer: OpenLayers.Layer.Vector | OpenLayers.Layer.LayerBase // Any layer type
    ): void; // Return type? Typically an input element or null
  }
}

declare class jQueryObject {
  // This is a simplified jQuery object. For full jQuery, use @types/jquery
  constructor();
  prop(propertyName: string, value: boolean | string): this;
  click(handler: (eventObject: Event) => any): this; // Event can be jQuery.Event
  // Add other common jQuery methods you use: val(), attr(), html(), append(), find(), etc.
  [key: string]: any; // Allow any other jQuery methods/properties
}

declare function $(selector: string | Element | Document | Window | jQueryObject /*| JQueryStatic*/): jQueryObject;


interface GMXmlHttpRequestDetails {
  method?: "GET" | "POST" | "HEAD" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";
  url: string;
  headers?: Record<string, string>;
  data?: string | Document | Blob | ArrayBufferView | ArrayBuffer | FormData | URLSearchParams | ReadableStream<Uint8Array>;
  cookie?: string;
  binary?: boolean;
  nocache?: boolean;
  revalidate?: boolean;
  timeout?: number;
  context?: any;
  responseType?: "arraybuffer" | "blob" | "json" | "text" | "document" | "stream";
  overrideMimeType?: string;
  anonymous?: boolean;
  fetch?: boolean;
  user?: string;
  password?: string;
  onabort?: (response: GMXmlHttpRequestResponse) => void;
  onerror?: (response: GMXmlHttpRequestResponse) => void;
  onloadstart?: (response: GMXmlHttpRequestResponse) => void;
  onprogress?: (response: GMXmlHttpRequestProgressResponse) => void;
  onreadystatechange?: (response: GMXmlHttpRequestResponse) => void;
  ontimeout?: (response: GMXmlHttpRequestResponse) => void;
  onload?: (response: GMXmlHttpRequestResponse) => void;
  /** @param {Tampermonkey.AbortHandle} abort */
  // abort?: () => void; // This would be on the returned object from GM_xmlhttpRequest
}
interface GMXmlHttpRequestResponse {
  finalUrl: string;
  readyState: 0 | 1 | 2 | 3 | 4;
  status: number;
  statusText: string;
  responseHeaders: string;
  response: any;
  responseXML?: Document | null;
  responseText?: string | null;
  context?: any;
}
interface GMXmlHttpRequestProgressResponse extends GMXmlHttpRequestResponse {
  lengthComputable: boolean;
  loaded: number;
  total: number;
}

interface GMXmlHttpRequestControl {
  abort(): void;
}

declare function GM_xmlhttpRequest(details: GMXmlHttpRequestDetails): GMXmlHttpRequestControl;
declare function GM_setClipboard(text: string, type?: string): void;
declare function GM_addStyle(css: string): HTMLElement;


declare namespace Waze {
  class DataModel {
    constructor();
    // Add properties/methods if known
  }
  namespace Feature {
    namespace Vector {
      class Segment {
        model: Waze.DataModel;
        attributes: SegmentAttributes;
        state: string | null; // state can be null for new features
        constructor(); // Potentially takes arguments if new segments can be created
        getGeometry(): GeoJson;
        /** @deprecated use getGeometry */
        getOLGeometry(): OpenLayers.Geometry.LineString;
        getAttributes(): SegmentAttributes;
        isOneWay(): boolean;
        getState(): string | null;
        isInRoundabout(): boolean;
        getLockRank(): number; // 0 to 6
        getFlagAttributes(): FlagAttributes;
        getAddress(model: IWazeModel): AddressObject; // WazeModel type here
        getID(): number;
        /** @deprecated */
        getOldID(): number | null; // Can be null
      }
      class Node {
        attributes: NodeAttributes;
        model: Waze.DataModel; // Assuming Node also has a model
        state: string | null;  // state can be null for new features
        constructor(); // Potentially takes arguments
        isConnectedToBigJunction(): boolean;
        getGeometry(): GeoJsonPoint;
        /** @deprecated use getGeometry */
        getOLGeometry(): OpenLayers.Geometry.Point;
        getAttributes(): NodeAttributes;
        getState(): string | null;
        isOneWay(): boolean; // This seems unusual for a node, often related to connected segments
        isInRoundabout(): boolean;
        getLockRank(): number; // 0 to 6
        getFlagAttributes(): FlagAttributes; // This also seems unusual for a node
        getID(): number;
      }
    }
  }
}

// Augmenting global Window object
interface Navigator {
  scheduling?: { // The '?' indicates it might not always be present
    isInputPending(): boolean;
  };
}

interface Window {
  // 'navigator.scheduling' is handled by augmenting Navigator above
}

declare global {
  /** @deprecated use wmeSDK */
  var W: IW;
  var OpenLayers: typeof OpenLayers;
  var WazeWrap: typeof WazeWrap;
  /** @deprecated do not use */
  var Waze: typeof Waze;
}
