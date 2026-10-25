# AGENTS.md — Street Vector Layer (SVL)

Guidelines and architectural context for AI coding agents working on `street-vector-layer` (v7+).

## Project Overview
Userscript for the Waze Map Editor (WME) that renders segment and node data models as customizable vector layers, replacing WME's standard tile-based roads layer.

---

## ⚠️ Critical Codebase Warning: `main.user.ts` Legacy Code
- **Active Architecture (`v7.0+`):** Located in [`SVLMediator.ts`](./SVLMediator.ts), [`svlGlobals.ts`](./svlGlobals.ts), [`Utils.ts`](./Utils.ts), and [`Controllers/`](./Controllers/).
- **Legacy Dead Code in [`main.user.ts`](./main.user.ts):** [`main.user.ts`](./main.user.ts) bootstraps the SDK and calls `SVLMediator.initialize({ wmeSDK })` in the first ~36 lines. **Everything below line 37 (~5,250 lines) is unreferenced pre-v7.0 monolithic legacy code.** Do NOT edit or reference the legacy functions at the bottom of `main.user.ts`; all changes must be made in `SVLMediator.ts`, `svlGlobals.ts`, `Utils.ts`, or `Controllers/*`.

---

## Critical Rules & Constraints

1. **WME SDK Mode (`AsyncWmeSDK`):**
   - SVL uses the **asynchronous `AsyncWmeSDK`** interface (`import { AsyncWmeSDK } from "wme-sdk-typings"`), initialized with `mode: "async"`.
   - Always pass `mode: "async"` to `getWmeSdk`. Under `AsyncWmeSDK`, SDK calls (`DataModel`, `Map`, `Events.trackDataModelEvents`, `Settings`, `Shortcuts`, `LayerSwitcher`, `Sidebar`) return `Promise`s and must be `await`ed (note: `Events.on` / `Events.off` and layer `styleContext` functions remain synchronous).
2. **SDK Documentation & Typings:**
   - Refer to `https://www.waze.com/editor/sdk/` (production) and `https://beta.waze.com/editor/sdk/` (beta).
   - Import types from `wme-sdk-typings` (e.g., `AsyncWmeSDK`, `Segment`, `Node`, `SdkFeature`, `LayerStyleRule`, `AllEvents`) and `@types/tampermonkey`.
   - The compile-time `__DEBUG__` ambient declaration lives in [`svlGlobals.ts`](./svlGlobals.ts).
3. **Zero Legacy Globals (`W`, `OpenLayers`, `I18n`, `WazeWrap`):**
   - SVL's active codebase is 100% migrated to `AsyncWmeSDK`.
   - Do NOT introduce any uses of `W`, `W.model`, `W.map`, `OpenLayers`, `I18n`, or `WazeWrap`. All layers (including rotated multi-line street/speed labels on `SDK_LAYERS.LABELS`), geometry operations, map metrics, and translations use WME SDK APIs and pure TypeScript/Turf.js utilities.

---

## SDK Bootstrap Pattern (`AsyncWmeSDK`)

Target pattern for [`main.user.ts`](./main.user.ts):

```typescript
import { AsyncWmeSDK } from "wme-sdk-typings";
import SVLMediator from "./SVLMediator";

unsafeWindow.SDK_INITIALIZED.then(initScript);

async function initScript() {
  if (!unsafeWindow.getWmeSdk) {
    throw new Error("SVL: SDK not available");
  }
  const wmeSDK: AsyncWmeSDK = unsafeWindow.getWmeSdk({
    scriptId: "svl-sdk",
    scriptName: "Street Vector Layer",
    mode: "async",
  });

  await SVLMediator.initialize({ wmeSDK });
}
```

---

## Architecture: Mediator + Singleton Controllers

SVL follows a strict **Mediator + Singleton Controllers** pattern. Controllers never call each other directly; they communicate exclusively through [`SVLMediator`](./SVLMediator.ts).

### Two-Way Event Flow
1. **Controller → Mediator (`AcceptedControllerEvents`):**
   - Defined in [`svlGlobals.ts`](./svlGlobals.ts).
   - Controllers notify the mediator via `this.mediator.notify(this, AcceptedControllerEvents.EVENT_NAME, data)`.
2. **Mediator → Controllers (`SVLEvents`):**
   - Defined in [`Controllers/AbstractMediator.ts`](./Controllers/AbstractMediator.ts).
   - Controllers subscribe via `this.mediator.subscribe(SVLEvents.EVENT_NAME, callback)`.
   - The mediator broadcasts via `this.emit(SVLEvents.EVENT_NAME, data)`.

### Layer State Machine (`SVLLayerState`)
Managed by [`LayerStateController`](./Controllers/LayerStateController.ts) and defined in [`svlGlobals.ts`](./svlGlobals.ts):
- `UNINITIALIZED`: Initial state before SDK layers are registered.
- `INITIALIZED`: Layers created and configured; transitions immediately toward active states.
- `VISIBLE`: Layer is enabled and actively rendering segments, nodes, arrows, icons, and labels.
- `DRAWING_ABORTED`: Drawing exceeded segment threshold (`disableMasterLayerThreshold`, default `8000` segments); partial features are cleared.
- `AUTOMATICALLY_DISABLED`: Zoom level is below `disableRoadLayersUnderZoom` (`<= 14`); SVL hides itself and restores standard WME road layer visibility.
- `USER_DISABLED`: User toggled SVL off via layer switcher or shortcut (`Alt+V`).

### Controller Responsibilities ([`Controllers/`](./Controllers/))
- [`SVLMediator.ts`](./SVLMediator.ts) (extends [`AbstractMediator.ts`](./Controllers/AbstractMediator.ts)): Central orchestrator. Initializes controllers in dependency order, routes notifications, manages active drawing locks (`#currentlyDrawing`), and exposes shared read-only state (`getPreference`, `getString`, `getLayerState`, `getCurrentZoom`, `getPixelSize`).
- [`LayerStateController.ts`](./Controllers/LayerStateController.ts): Registers the 5 SDK layers (`SDK_LAYERS.SEGMENTS`, `NODES`, `ARROWS`, `ICONS`, `LABELS`) via `wmeSDK.Map.addLayer` with `styleContext` & `styleRules`. Manages the `SVLLayerState` state machine, layer visibility, Z-index ordering (including GPS points and `farTurnPathLayer`), and geodesic pixel size caching (`wmeSDK.Map.getMapExtent()` + `wmeSDK.Map.getMapResolution()`).
- [`RenderingController.ts`](./Controllers/RenderingController.ts): Converts WME `Segment` and `Node` models into GeoJSON `SdkFeature` objects. Handles road styling, patterns/dashes, routing mode styles, ANR/red-road highlights, head/tail/direction arrows, restriction/closure/elevation icons, and SDK street/speed labels (rendered as rotated point features using cached SVG data URIs via `Utils.getLabelGraphicInfo`).
  - **Batching & Feature Stores:** Queues features in `queuedSegments`, `queuedArrows`, `queuedIcons`, and `queuedLabels` (`Set<SdkFeature>`) and flushes them in batches via `wmeSDK.Map.addFeaturesToLayer`. Tracks rendered feature IDs per segment in `segmentsStore`, `arrowsStore`, `iconsStore`, and `labelsStore` (`Map<number, (string | number)[]>`, grouped in `segmentLayerStores`) for targeted updates and removals via `wmeSDK.Map.removeFeaturesFromLayer`.
- [`WMEEventsController.ts`](./Controllers/WMEEventsController.ts): Dynamically attaches and detaches WME SDK event listeners (`wmeSDK.Events.on` / `wmeSDK.Events.off`) and data model tracking (`trackDataModelEvents` / `stopDataModelEventsTracking`) based on `SVLLayerState` transitions so SVL consumes zero data-model event overhead when disabled. Includes built-in debounce (`deferInMs`) per event handler.
- [`PreferencesController.ts`](./Controllers/PreferencesController.ts): Manages user preferences persisted in `localStorage` under the `"svl"` key, default presets (`PRESETS` in [`svlGlobals.ts`](./svlGlobals.ts)), schema migrations, import/export, and change rollback.
- [`UserInterfaceController.ts`](./Controllers/UserInterfaceController.ts): Registers the sidebar tab (`wmeSDK.Sidebar.registerScriptTab()`), layer switcher checkbox (`wmeSDK.LayerSwitcher.addLayerCheckbox`), keyboard shortcut (`wmeSDK.Shortcuts.createShortcut`), WME topbar status badge (`#svl-status-badge`), and routing-mode overlay. Caches localized road type names via `wmeSDK.DataModel.Segments.getRoadTypes()`.
- [`LocalizationController.ts`](./Controllers/LocalizationController.ts): Fetches localized UI strings (TSV) from Google Sheets via `GM_xmlhttpRequest` with fallback to built-in English strings.
- [`AlertController.ts`](./Controllers/AlertController.ts): Displays toast notifications (`toastr`) and modals/prompts (`sweetalert2`), replacing legacy `WazeWrap.Alerts`.

---

## WME SDK Usage Patterns in SVL

1. **Data Access (`wmeSDK.DataModel`):**
   - Segments: `wmeSDK.DataModel.Segments.getAll()`, `getById({ segmentId })`, `getRoadTypes()`, `getHeadlightsRequired()`, `getNearbyRestrictions()`, `getUnpaved()`, `isRoadClosureAdded({ segmentId })`, `isTollSegment({ segmentId })`.
   - Nodes: `wmeSDK.DataModel.Nodes.getAll()`, `getById({ nodeId })`, `isTurnAllowedByNode({ fromSegmentId, nodeId, toSegmentId })`.
   - Venues: `wmeSDK.DataModel.Venues.getById({ venueId })` (for parking lot roads).
2. **Map & Layers (`wmeSDK.Map`):**
   - Create layer: `wmeSDK.Map.addLayer({ layerName, styleContext, styleRules, zIndexing: true })`.
   - Add features: `wmeSDK.Map.addFeaturesToLayer({ features: Array.from(queuedFeatures), layerName })`.
   - Remove features: `wmeSDK.Map.removeFeaturesFromLayer({ featureIds, layerName })` or `wmeSDK.Map.removeAllFeaturesFromLayer({ layerName })`.
   - Visibility & Z-Index: `wmeSDK.Map.setLayerVisibility({ layerName, visibility })`, `setLayerZIndex({ layerName, zIndex })`, `setLayerOpacity({ layerName, opacity })`.
   - Metrics: `wmeSDK.Map.getZoomLevel()`, `getMapExtent()`, `getMapResolution()`.
3. **Events (`wmeSDK.Events`):**
   - Note the parameter name is `eventHandler` (not `callback`):
     ```typescript
     wmeSDK.Events.on({ eventName: "wme-map-data-loaded", eventHandler: fn });
     wmeSDK.Events.off({ eventName: "wme-map-data-loaded", eventHandler: fn });
     ```
   - Enable/disable tracking for data model and layer events:
     - `wmeSDK.Events.trackDataModelEvents({ dataModelName: "segments" | "nodes" | "roadClosures" })`
     - `wmeSDK.Events.stopDataModelEventsTracking({ dataModelName })`
     - `wmeSDK.Events.trackLayerEvents({ layerName })`

---

## Geometry, Math & Debugging Utilities

- **Turf.js & Geometry Utilities:**
  - `@turf/turf` (`simplify`, `lineOffset`) for simplifying segment geometries at lower zoom levels and offsetting one-way / dual-carriageway / ANR lines.
  - `Utils.simplifyLonLatAsMercator`: Ramer-Douglas-Peucker geometry simplification in Web Mercator (`EPSG:3857`) meters for label placement.
  - `Utils.getLabelGraphicInfo`: Generates and caches multi-line SVG data URIs (with optional triangle arrow symbol) for rotated street and speed labels on `SDK_LAYERS.LABELS`.
  - Coordinates are always `[lon, lat]` (GeoJSON standard).
- **Compile-Time Debug Flag (`__DEBUG__`):**
  - Rollup replaces `__DEBUG__` with `true` in development builds and `false` in production (`NODE_ENV=production`).
  - Use `this.debugLog(...)`, `Utils.debugLog(...)`, or `this.mediator.alertDebug(...)` for diagnostic output so it is automatically stripped in release builds.

---

## Development & Build Commands

- `npm run compile`: Build development bundle (`rollup -c`) into `.out/main.user.js` (`__DEBUG__ = true`, unminified).
- `npm run watch`: Rollup watch mode for iterative development.
- `npm run concat`: Concatenate [`header.js`](./header.js) and `.out/main.user.js` into `releases/release-<version>.user.js`.
- `npm run build`: Full development build (`compile` + `concat`).
- `npm run release`: Update version in [`header.js`](./header.js), build production bundle (`NODE_ENV=production`, `__DEBUG__ = false`, Terser minification), and concatenate into `releases/release-<version>.user.js`.
