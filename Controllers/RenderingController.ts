import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { Node, SdkFeature, Segment, Street } from "wme-sdk-typings";
import { LineString, Point } from "geojson";
import { AlertType, SVLEvents } from "./AbstractMediator";
import { AcceptedControllerEvents, OL_LAYERS, SDK_LAYERS, SVLLayerState } from "../svlGlobals";
import { lineOffset } from "@turf/line-offset";
import Utils from "../Utils";

interface MeterObject {
    [key: string]: number
}

type StreetStyle = {
    strokeColor: string;
    strokeWidth: number;
    strokeDashstyle: string;
    outlineColor: string;
};

export default class RenderingController extends AbstractController {
    // Singleton pattern
    private static instance: RenderingController | null = null;
    // Add throttling to prevent excessive redraws
    private redrawTimeout: number | null = null;
    private drawGeneration: number = 0;
    private dataModelQueue: Promise<void> = Promise.resolve();

    private queuedSegments: Set<SdkFeature<LineString>> = new Set();
    private queuedArrows: Set<SdkFeature<Point>> = new Set();
    private queuedIcons: Set<SdkFeature<Point>> = new Set();

    private segmentsStore = new Map<Segment['id'], Set<string>>();
    private arrowsStore = new Map<Segment['id'], Set<string>>();
    private iconsStore = new Map<Segment['id'], Set<string>>();
    private labelsStore = new Map<Segment['id'], OpenLayers.Feature.Vector[]>();
    private nodesStore = new Set<Node['id']>();

    private labelsVector = W.map.getLayerByName(OL_LAYERS.LABELS);

    private currentTopCountryId: number | null = null;

    private isImperial: boolean = false;
    private nextFeatureId: number = 0;
    private cachedUserRank: number | undefined = undefined;
    private speedColorCache = new Map<number | null, string>();
    private superScriptCache = new Map<number, string>();

    private superScript: Array<string> = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

    private streetStyles: StreetStyle[] = [];

    private clutterConstant: number = 7;

    private roundaboutStyle = {
        strokeColor: '#111111',
        strokeWidth: 1,
        strokeDashstyle: 'dash',
        strokeOpacity: 0.6,
    };

    private nonEditableStyle = {
        'strokeColor': '#000',
        // 'strokeWidth': 2, 20%
        'strokeDashstyle': 'solid',
    };
    private tunnelFlagStyle2 = {
        strokeColor: '#C90',
        strokeDashstyle: 'longdash',
    };
    private tunnelFlagStyle1 = {
        strokeColor: '#fff',
        strokeOpacity: 0.8,
        strokeDashstyle: 'longdash',
    };

    private defaultLaneWidthMeters: MeterObject = {
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



    private constructor({ mediator }: { mediator: SVLMediator }) {
        super(mediator);
    }

    public static getInstance(): RenderingController {
        if (!RenderingController.instance) {
            throw new Error("RenderingController not initialized. Call initialize() first.");
        }
        return RenderingController.instance;
    }

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<RenderingController> {
        if (!RenderingController.instance) {
            RenderingController.instance = new RenderingController({ mediator });

            // Initialization
            await RenderingController.instance.handleWMESettingsUpdated();
            RenderingController.instance.handleSVLSettingsUpdated.call(RenderingController.instance);

            // Event subscriptions
            mediator.subscribe(SVLEvents.COUNTRY_CHANGED, RenderingController.instance.handleCountryChanged.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.SVL_SETTINGS_CHANGED, RenderingController.instance.handleSVLSettingsUpdated.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.WME_SETTINGS_CHANGED, RenderingController.instance.handleWMESettingsUpdated.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.USER_DISABLED, RenderingController.instance.handleLayerDisabledOrAborted.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.DRAWING_ABORTED, RenderingController.instance.handleLayerDisabledOrAborted.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.AUTOMATICALLY_DISABLED, RenderingController.instance.handleLayerDisabledOrAborted.bind(RenderingController.instance));

            return RenderingController.instance;
        } else {
            throw new Error("RenderingController is already initialized.");
        }
    }

    private async handleLayerDisabledOrAborted(): Promise<void> {
        if (this.redrawTimeout !== null) {
            clearTimeout(this.redrawTimeout);
            this.redrawTimeout = null;
        }
        const generation = ++this.drawGeneration;
        await this.enqueueDataModelOp(async () => {
            if (generation !== this.drawGeneration) return;
            await this.destroyAllFeatures();
        });
    }

    private async handleWMESettingsUpdated(): Promise<void> {
        const newIsImperial = (await this.mediator.wmeSDK.Settings.getUserSettings()).isImperial === true;
        if (this.isImperial !== newIsImperial) {
            this.isImperial = newIsImperial;
            this.speedColorCache.clear();
            this.superScriptCache.clear();
            this.redrawAll();
        }
    }

    private handleSVLSettingsUpdated() {
        let shouldRedraw = true; // TODO: this can be made more efficient
        this.speedColorCache.clear();
        const newClutterConstant = this.mediator.getPreference('clutterConstant');
        if (this.clutterConstant !== newClutterConstant) {
            this.clutterConstant = newClutterConstant;
            shouldRedraw = true;
        }
        const streetStylesPref = this.mediator.getPreference('streets');
        this.streetStyles = [];
        for (let i = 0; i < streetStylesPref.length; i += 1) {
            if (streetStylesPref[i]) {
                this.streetStyles[i] = {
                    'strokeColor': streetStylesPref[i]['strokeColor'],
                    'strokeWidth': streetStylesPref[i]['strokeWidth'],
                    'strokeDashstyle': streetStylesPref[i]['strokeDashstyle'],
                    'outlineColor': Utils.bestBackground(streetStylesPref[i]['strokeColor']),
                };
            }
        }
        if (shouldRedraw) {
            this.redrawAll();
        }
    }

    private createAverageSpeedCameraSDK({ id, rev, isForward, p0, p1 }:
        { id: number, rev: boolean, isForward: boolean, p0: number[], p1: number[] }): SdkFeature<Point> {
        const degreesInRadians = this.getAngleRadiansSDK(isForward, rev ? p1 : p0, rev ? p0 : p1);
        const perpendicularAngle = degreesInRadians + Utils.PI_OVER_2;
        const shiftDegrees = 0.0001;
        return {
            type: 'Feature',
            id: id,
            geometry: { type: 'Point', coordinates: [p0[0] + Math.sin(perpendicularAngle) * shiftDegrees, p0[1] + Math.cos(perpendicularAngle) * shiftDegrees] },
            properties: {
                'isAverageSpeedCamera': 1,
                'closeZoomOnly': 1,
                'degrees': this.convertRadiansToDegrees(degreesInRadians)
            }
        }
    }

    private async handleCountryChanged(): Promise<void> {
        const topCountry = await this.mediator.wmeSDK.DataModel.Countries.getTopCountry();
        if (!topCountry) return;

        if (topCountry.id === this.currentTopCountryId) {
            // Country hasn't changed, no need to update
            return;
        }

        this.currentTopCountryId = topCountry.id;

        const defaultLaneWidth = topCountry.defaultLaneWidthPerRoadType;
        if (defaultLaneWidth) {
            const keys = Object.keys(defaultLaneWidth);
            for (let i = 0; i < keys.length; i++) {
                const e = Number(keys[i]);
                if (!e) continue;
                const defLaneWidth = defaultLaneWidth[e as keyof typeof defaultLaneWidth];
                if (!defLaneWidth) continue;
                this.defaultLaneWidthMeters[e] = defLaneWidth / 100;
            }
        }
    }

    public async zoomChanged(): Promise<void> {
        console.debug('zoomChanged running');
        let currentState = this.mediator.getState();
        if ((await this.mediator.wmeSDK.Map.getZoomLevel()) <= +this.mediator.getPreference('useWMERoadLayerAtZoom')) {
            // There is nothing to draw, enable road layer
            console.debug('Road layer automatically enabled because of zoom out');
            // consoleDebug("Vector visibility: ", streetVector.visibility);
            if (currentState === SVLLayerState.VISIBLE) {
                this.mediator.notify(this, AcceptedControllerEvents.SVL_SHOULD_AUTOMATICALLY_DISABLE);
                return;
            }
        } else if (currentState == SVLLayerState.AUTOMATICALLY_DISABLED) {
            // Re-enable the SVL
            console.debug('Re-enabling SVL after zoom in');
            this.mediator.notify(this, AcceptedControllerEvents.SVL_LAYER_ENABLED);
            return;
        }
    }

    private queueSegmentFeatureForDrawing(id: Segment['id'], feature: SdkFeature<LineString>) {
        feature.id = `${id}_${++this.nextFeatureId}`;
        this.queuedSegments.add(feature);
        // TODO: there might be IDs in the list that have not been drawn yet
        this.addIDsToSegmentsStore(id, feature.id);
    }

    private addIDsToSegmentsStore(id: Segment['id'], ...strings: string[]) {
        if (!this.segmentsStore.has(id)) {
            this.segmentsStore.set(id, new Set());
        }
        const stringSet = <Set<string>>this.segmentsStore.get(id);
        for (const str of strings) {
            stringSet.add(str);
        }
    }
    private addIDsToArrowsStore(id: Segment['id'], ...strings: string[]) {
        if (!this.arrowsStore.has(id)) {
            this.arrowsStore.set(id, new Set());
        }
        const stringSet = <Set<string>>this.arrowsStore.get(id);
        for (const str of strings) {
            stringSet.add(str);
        }
    }

    private getAngleDegreesSDK(isForward: boolean, p0: number[], p1: number[]): number {
        // radians to degrees
        return this.convertRadiansToDegrees(this.getAngleRadiansSDK(isForward, p0, p1));
    }

    private getAngleRadiansSDK(isForward: boolean, p0: number[], p1: number[]): number {
        let dx = 0;
        let dy = 0;

        // Determine the start and end points
        const startP = isForward ? p0 : p1;
        const endP = isForward ? p1 : p0;

        // Longitude difference (dx) is scaled by cos(latitude)
        // The latitude used for scaling is the average of p0 and p1, 
        // or just the starting latitude (startP[1]) for small distances.
        // NOTE: Math.cos expects the angle in RADIANS!
        const latInRadians = startP[1] * Utils.PI_OVER_180;

        // Calculate the difference in the direction of travel
        dx = (endP[0] - startP[0]) * Math.cos(latInRadians);
        dy = endP[1] - startP[1];

        // Math.atan2(dx, dy) returns the bearing from the Y-axis (North)
        return Math.atan2(dx, dy);
    }

    private convertRadiansToDegrees(angle: number): number {
        return (angle * 180) / Math.PI;
    }

    private getCentroid(p0: number[], p1: number[]): [number, number] {
        return [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];
    }

    private sampleArrowPointsAlongSegment(
        coords: number[][],
        isInRoundabout: boolean,
        labels?: OpenLayers.Feature.Vector[]
    ): { coordinates: [number, number]; p0: number[]; p1: number[]; minZoom: number }[] {
        if (coords.length < 2) {
            return [];
        }

        const firstLatRad = coords[0][1] * Utils.PI_OVER_180;
        const cosLat = Math.cos(firstLatRad);
        const metersPerDegLat = 111132.92;
        const metersPerDegLon = 111412.84 * cosLat;

        const cumDist: number[] = [0];
        for (let i = 0; i < coords.length - 1; i++) {
            const dx = (coords[i + 1][0] - coords[i][0]) * metersPerDegLon;
            const dy = (coords[i + 1][1] - coords[i][1]) * metersPerDegLat;
            cumDist.push(cumDist[i] + Math.hypot(dx, dy));
        }

        const totalLength = cumDist[cumDist.length - 1];
        if (totalLength <= 0) {
            return [];
        }

        const rawDeclutter = Number(this.mediator.getPreference('arrowDeclutter')) || 140;
        const effectiveDeclutter = Math.max(40, rawDeclutter);
        const minStepMeters = (effectiveDeclutter / 8) * (isInRoundabout ? 1.5 : 1);

        const labelZones: { lon: number; lat: number; radiusMeters: number }[] = [];
        if (labels && labels.length > 0) {
            const MAX_EXTENT = 20037508.342789244;
            for (const lf of labels) {
                const geom = lf?.geometry as OpenLayers.Geometry.Point | undefined;
                if (geom && typeof geom.x === 'number' && typeof geom.y === 'number') {
                    const lon = (geom.x * 180) / MAX_EXTENT;
                    const lat = (Math.atan(Math.exp((geom.y * Math.PI) / MAX_EXTENT)) * 360) / Math.PI - 90;
                    const rawLabel: string = lf.attributes?.label ?? '';
                    const lines = rawLabel.split('\n');
                    let maxLineChars = 0;
                    for (const line of lines) {
                        if (line.length > maxLineChars) {
                            maxLineChars = line.length;
                        }
                    }
                    const radiusMeters = Math.min(
                        totalLength * 0.15,
                        Math.max(4, Math.min(20, maxLineChars * 1.1))
                    );
                    labelZones.push({ lon, lat, radiusMeters });
                }
            }
        }

        let numIntervals = Math.max(2, Math.round(totalLength / minStepMeters));
        if (numIntervals === 2 && labelZones.length > 0 && totalLength >= 15) {
            numIntervals = 3;
        }

        const step = totalLength / numIntervals;
        const kMid = Math.floor(numIntervals / 2);

        let segIdx = 0;
        const candidates: {
            coordinates: [number, number];
            p0: number[];
            p1: number[];
            minZoom: number;
            collides: boolean;
        }[] = [];

        for (let k = 1; k < numIntervals; k++) {
            const targetDist = k * step;
            while (segIdx < coords.length - 2 && cumDist[segIdx + 1] < targetDist) {
                segIdx++;
            }
            const segStartDist = cumDist[segIdx];
            const segLen = cumDist[segIdx + 1] - segStartDist;
            const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0.5;
            const p0 = coords[segIdx];
            const p1 = coords[segIdx + 1];
            const lon = p0[0] + t * (p1[0] - p0[0]);
            const lat = p0[1] + t * (p1[1] - p0[1]);

            const j = Math.abs(k - kMid);
            const tz = j === 0 ? 5 : 31 - Math.clz32(j & -j);
            const minZoom = tz >= 5 ? 0 : 20 - tz;

            let collides = false;
            for (const lz of labelZones) {
                const dx = (lon - lz.lon) * metersPerDegLon;
                const dy = (lat - lz.lat) * metersPerDegLat;
                if (Math.hypot(dx, dy) < lz.radiusMeters) {
                    collides = true;
                    break;
                }
            }

            candidates.push({
                coordinates: [lon, lat],
                p0,
                p1,
                minZoom,
                collides,
            });
        }

        for (let i = 0; i < candidates.length; i++) {
            if (!candidates[i].collides) continue;
            for (let d = 1; d < candidates.length; d++) {
                let promoted = false;
                if (i - d >= 0 && !candidates[i - d].collides) {
                    candidates[i - d].minZoom = Math.min(candidates[i - d].minZoom, candidates[i].minZoom);
                    promoted = true;
                }
                if (i + d < candidates.length && !candidates[i + d].collides) {
                    candidates[i + d].minZoom = Math.min(candidates[i + d].minZoom, candidates[i].minZoom);
                    promoted = true;
                }
                if (promoted) break;
            }
        }

        const filtered = candidates.filter((c) => !c.collides);
        return filtered.length > 0 ? filtered : candidates;
    }

    private addIDsToIconsStore(id: Segment['id'], ...strings: string[]) {
        if (!this.iconsStore.has(id)) {
            this.iconsStore.set(id, new Set());
        }
        const stringSet = <Set<string>>this.iconsStore.get(id);
        for (const str of strings) {
            stringSet.add(str);
        }
    }

    private getColorStringFromSpeed(metricspeed: number | null) {
        const cached = this.speedColorCache.get(metricspeed);
        if (cached !== undefined) {
            return cached;
        }
        let color: string;
        if (this.mediator.getPreference('showSLSinglecolor')) {
            color = this.mediator.getPreference('SLColor');
        } else {
            const speedsPref = this.mediator.getPreference('speeds');
            if (metricspeed === null) {
                color = speedsPref['default'];
            } else {
                const type = this.isImperial ? 'imperial' : 'metric';
                const speed = this.isImperial
                    ? Math.round(metricspeed / 1.609344)
                    : metricspeed;
                color = speedsPref[type][speed] ?? speedsPref['default'];
            }
        }
        this.speedColorCache.set(metricspeed, color);
        return color;
    }

    private enqueueDataModelOp(op: () => Promise<void>): Promise<void> {
        const next = this.dataModelQueue.then(op, op);
        this.dataModelQueue = next.catch((err) => {
            console.error("SVL: Error in data model operation:", err);
        });
        return next;
    }

    public redrawAll(): void {
        // Logic to redraw all SVL layers
        console.log("Redrawing all SVL layers…");
        this.drawGeneration++;
        // Clear any pending redraw to avoid multiple rapid redraws
        if (this.redrawTimeout !== null) {
            clearTimeout(this.redrawTimeout);
        }

        // Throttle redraw operations to improve performance
        this.redrawTimeout = window.setTimeout(() => {
            this.redrawTimeout = null;
            const generation = ++this.drawGeneration;
            void this.enqueueDataModelOp(async () => {
                if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) return;
                await this.destroyAllFeatures();
                if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) return;
                await this.addAllSegmentsSDK(generation);
                if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) return;
                await this.addAllNodesSDK(generation);
            });
        }, 100); // 100ms throttle
    }

    private async destroyAllFeatures(): Promise<void> {
        await this.removeAllSegmentsFromLayer();
        await this.removeAllNodesFromLayer();
    }

    private async addAllSegmentsSDK(generation: number = this.drawGeneration): Promise<void> {
        const segments = await this.mediator.wmeSDK.DataModel.Segments.getAll();
        if (generation !== this.drawGeneration) return;
        await this.addSegmentsByModel(segments, generation);
    }

    public async shouldDrawingResumeAfterAbort(): Promise<void> {
        const [segments, nodes] = await Promise.all([
            this.mediator.wmeSDK.DataModel.Segments.getAll(),
            this.mediator.wmeSDK.DataModel.Nodes.getAll()
        ]);
        const segmentsCount = segments.length;
        const nodesCount = nodes.length;
        const segmentsThreshold = this.mediator.getPreference('segmentsThreshold');
        const nodesThreshold = this.mediator.getPreference('nodesThreshold');
        Utils.debugLog(`Segments: ${segmentsCount}, Nodes: ${nodesCount}`);
        Utils.debugLog(`Limits: Segments: ${segmentsThreshold}, Nodes: ${nodesThreshold}`);
        if (
            segmentsCount < segmentsThreshold &&
            nodesCount < nodesThreshold
        ) {
            this.mediator.notify(this, AcceptedControllerEvents.SVL_LAYER_ENABLED);
        }
    }

    private async addSegmentsByModel(segments: Segment[], generation: number = this.drawGeneration): Promise<void> {
        const currentState = this.mediator.getState();
        if (__DEBUG__) {
            if (currentState === SVLLayerState.DRAWING_ABORTED) {
                alert("Drawing aborted state detected in addSegmentsByModel");
            }
        }
        if (segments.length === 0 || generation !== this.drawGeneration) return;
        if (!(currentState === SVLLayerState.DRAWING_ABORTED) && segments.length > this.mediator.getPreference('segmentsThreshold')) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${segments.length} segments. The current limit is set to ${this.mediator.getPreference('segmentsThreshold')}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }

        const [userInfo, streets] = await Promise.all([
            this.mediator.wmeSDK.State.getUserInfo(),
            this.mediator.wmeSDK.DataModel.Streets.getAll(),
        ]);
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) return;

        this.cachedUserRank = userInfo?.rank;
        const streetsMap = new Map<number, Street>();
        for (let i = 0; i < streets.length; i++) {
            streetsMap.set(streets[i].id, streets[i]);
        }

        const results = await Promise.all(
            segments.map(s => this.drawSegmentSDK(s, streetsMap))
        );
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
            this.queuedSegments.clear();
            this.queuedArrows.clear();
            this.queuedIcons.clear();
            return;
        }

        const labels: OpenLayers.Feature.Vector[] = [];
        const staleLabels: OpenLayers.Feature.Vector[] = [];
        for (let i = 0; i < segments.length; i++) {
            const s = segments[i];
            const existing = this.labelsStore.get(s.id);
            if (existing) {
                staleLabels.push(...existing);
                this.labelsStore.delete(s.id);
            }
            const res = results[i];
            if (res && res.labels && res.labels.length > 0) {
                this.labelsStore.set(s.id, res.labels);
                labels.push(...res.labels);
            }
        }
        if (staleLabels.length > 0) {
            this.labelsVector.destroyFeatures(staleLabels, { 'silent': true });
        }
        await this.drawAllQueues();

        if (labels.length > 0 && generation === this.drawGeneration && this.mediator.getState() === SVLLayerState.VISIBLE) {
            this.labelsVector.addFeatures(labels, { 'silent': true });
        }
    }

    private queueArrowFeatureForDrawing(id: Segment['id'], feature: SdkFeature<Point>) {
        feature.id = `${id}_a_${++this.nextFeatureId}`;
        this.queuedArrows.add(feature);
        // TODO: there might be IDs in the list that have not been drawn yet
        this.addIDsToArrowsStore(id, feature.id);
    }
    private queueIconFeatureForDrawing(id: Segment['id'], feature: SdkFeature<Point>) {
        feature.id = `${id}_i_${++this.nextFeatureId}`;
        this.queuedIcons.add(feature);
        // TODO: there might be IDs in the list that have not been drawn yet
        this.addIDsToIconsStore(id, feature.id);
    }

    private async drawAllQueues(): Promise<void> {
        await Promise.all([
            this.drawQueuedSegments(),
            this.drawQueuedArrows(),
            this.drawQueuedIcons()
        ]);
    }

    private async drawQueuedSegments(): Promise<void> {
        if (this.queuedSegments.size > 0) {
            this.mediator.debugLog(`Drawing ${this.queuedSegments.size} queued segments`);
            // Convert to array once instead of calling Array.from repeatedly
            const features = Array.from(this.queuedSegments);
            this.queuedSegments.clear();
            await this.mediator.wmeSDK.Map.addFeaturesToLayer({ layerName: SDK_LAYERS.SEGMENTS, features });
        }
    }

    private async drawQueuedArrows(): Promise<void> {
        if (this.queuedArrows.size > 0) {
            this.mediator.debugLog(`Drawing ${this.queuedArrows.size} queued arrows`);
            const features = Array.from(this.queuedArrows);
            this.queuedArrows.clear();
            await this.mediator.wmeSDK.Map.addFeaturesToLayer({ layerName: SDK_LAYERS.ARROWS, features });
        }
    }

    private async drawQueuedIcons(): Promise<void> {
        if (this.queuedIcons.size > 0) {
            this.mediator.debugLog(`Drawing ${this.queuedIcons.size} queued icons`);
            const features = Array.from(this.queuedIcons);
            this.queuedIcons.clear();
            await this.mediator.wmeSDK.Map.addFeaturesToLayer({ layerName: SDK_LAYERS.ICONS, features });
        }
    }

    private async addNodesByModel(nodes: Node[], generation: number = this.drawGeneration): Promise<void> {
        const currentState = this.mediator.getState();
        if (__DEBUG__) {
            if (currentState === SVLLayerState.DRAWING_ABORTED) {
                alert("Drawing aborted state detected in addAllNodesSDK");
            }
        }
        if (nodes.length === 0 || generation !== this.drawGeneration) return;
        if (!(currentState === SVLLayerState.DRAWING_ABORTED) && nodes.length > this.mediator.getPreference('nodesThreshold')) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${nodes.length} nodes. The current limit is set to ${this.mediator.getPreference('nodesThreshold')}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }
        // TODO: this should not happen here. First the events in layerStateController should fire and manage that
        if ((await this.mediator.wmeSDK.Map.getZoomLevel()) <= this.mediator.getPreference('useWMERoadLayerAtZoom')) {
            console.debug('Not adding nodes them because of the zoom');
            return;
        }
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) return;

        await this.addNodesSDK(nodes, generation);
    }

    private async addAllNodesSDK(generation: number = this.drawGeneration): Promise<void> {
        const nodes = await this.mediator.wmeSDK.DataModel.Nodes.getAll();
        if (generation !== this.drawGeneration) return;
        await this.addNodesByModel(nodes, generation);
    }

    private async addNodesSDK(nodes: Node[], generation: number = this.drawGeneration): Promise<void> {
        const nodesToProcess = nodes.filter(n => !this.nodesStore.has(n.id));
        if (nodesToProcess.length === 0) return;

        const deletedFlags = await Promise.all(
            nodesToProcess.map(n => this.mediator.wmeSDK.DataModel.isDeleted({
                dataModelName: "nodes",
                objectId: n.id
            }))
        );
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) return;

        let sdkFeatures: SdkFeature<Point>[] = [];
        for (let i = 0; i < nodesToProcess.length; i++) {
            let n = nodesToProcess[i];
            if (!deletedFlags[i] && !this.nodesStore.has(n.id)) {
                //consoleDebug(`Adding node ${n.id}`);
                this.nodesStore.add(n.id);
                sdkFeatures.push(
                    {
                        id: n.id,
                        geometry: n.geometry,
                        properties: {
                            "conSegm": n.connectedSegmentIds.length
                        },
                        type: "Feature",
                    }
                );
            } else {
                // Adding a node that was deleted. This can happen if the map gets moved / zoomed while editing
            }
        }

        if (sdkFeatures.length > 0) {
            await this.mediator.wmeSDK.Map.addFeaturesToLayer({
                features: sdkFeatures,
                layerName: SDK_LAYERS.NODES
            });
        }
    }


    private async removeAllSegmentsFromLayer(): Promise<void> {
        this.queuedSegments.clear();
        this.segmentsStore.clear();

        this.queuedArrows.clear();
        this.arrowsStore.clear();

        this.queuedIcons.clear();
        this.iconsStore.clear();

        this.labelsStore.clear();
        this.labelsVector?.destroyFeatures(this.labelsVector.features, { 'silent': true });

        await Promise.all([
            this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
                layerName: SDK_LAYERS.SEGMENTS
            }),
            this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
                layerName: SDK_LAYERS.ARROWS
            }),
            this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
                layerName: SDK_LAYERS.ICONS
            })
        ]);
    }

    private async removeAllNodesFromLayer(): Promise<void> {
        this.nodesStore.clear();
        await this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.NODES
        });
    }

    public async addSegmentsByIds(objectIds: (number)[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.addSegmentsByIdsInternal(objectIds));
    }

    private async addSegmentsByIdsInternal(objectIds: (number)[]): Promise<void> {
        if (this.redrawTimeout !== null || objectIds.length === 0) return;
        const idsToAdd = objectIds.filter(id => !this.segmentsStore.has(id));
        if (idsToAdd.length === 0) return;

        Utils.debugLog(`addSegmentsSDK - Adding ${idsToAdd.length} segments`);
        if (idsToAdd.length > this.mediator.getPreference('segmentsThreshold')) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${idsToAdd.length} segments. The current limit is set to ${this.mediator.getPreference('segmentsThreshold')}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }
        const generation = this.drawGeneration;
        let segments: Segment[];
        if (idsToAdd.length > 50) {
            const idSet = new Set(idsToAdd);
            const allSegments = await this.mediator.wmeSDK.DataModel.Segments.getAll();
            segments = allSegments.filter((s: Segment) => idSet.has(s.id));
        } else {
            segments = (await Promise.all(
                idsToAdd.map(id => this.mediator.wmeSDK.DataModel.Segments.getById({ segmentId: id }))
            )).filter((s: Segment | null): s is Segment => s !== null);
        }
        if (generation !== this.drawGeneration) return;
        await this.addSegmentsByModel(segments, generation);
    }

    public async addNodesByIds(objectIds: (number)[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.addNodesByIdsInternal(objectIds));
    }

    private async addNodesByIdsInternal(objectIds: (number)[]): Promise<void> {
        if (this.redrawTimeout !== null || objectIds.length === 0) return;
        const idsToAdd = objectIds.filter(id => !this.nodesStore.has(id));
        if (idsToAdd.length === 0) return;

        Utils.debugLog(`addNodesSDK - Adding ${idsToAdd.length} nodes`);
        const generation = this.drawGeneration;
        let nodes: Node[];
        if (idsToAdd.length > 50) {
            const idSet = new Set(idsToAdd);
            const allNodes = await this.mediator.wmeSDK.DataModel.Nodes.getAll();
            nodes = allNodes.filter((n: Node) => idSet.has(n.id));
        } else {
            nodes = (await Promise.all(
                idsToAdd.map(id => this.mediator.wmeSDK.DataModel.Nodes.getById({ nodeId: id }))
            )).filter((n: Node | null): n is Node => n !== null);
        }
        if (generation !== this.drawGeneration) return;
        await this.addNodesByModel(nodes, generation);
    }

    public async removeSegmentsByIds(objectIds: (number)[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.removeSegmentsByIdsInternal(objectIds));
    }

    private async removeSegmentsByIdsInternal(objectIds: (number)[]): Promise<void> {
        Utils.debugLog(`Removing ${objectIds.length} segments: ${objectIds.join()}`);
        const segmentsFeatureIds: string[] = [];
        const labelsToDestroy: OpenLayers.Feature.Vector[] = [];
        for (let i = 0; i < objectIds.length; i++) {
            const segId = objectIds[i];
            const set = this.segmentsStore.get(segId);
            if (set) {
                segmentsFeatureIds.push(...Array.from(set));
                this.segmentsStore.delete(segId);
            }
            const segLabels = this.labelsStore.get(segId);
            if (segLabels) {
                labelsToDestroy.push(...segLabels);
                this.labelsStore.delete(segId);
            }
        }
        if (labelsToDestroy.length > 0) {
            this.labelsVector.destroyFeatures(labelsToDestroy, { 'silent': true });
        }


        const arrowsFeatureIds: string[] = [];
        for (let i = 0; i < objectIds.length; i++) {
            const set = this.arrowsStore.get(objectIds[i]);
            if (set) {
                arrowsFeatureIds.push(...Array.from(set));
                this.arrowsStore.delete(objectIds[i]);
            }
        }

        const iconsFeatureIds: string[] = [];
        for (let i = 0; i < objectIds.length; i++) {
            const set = this.iconsStore.get(objectIds[i]);
            if (set) {
                iconsFeatureIds.push(...Array.from(set));
                this.iconsStore.delete(objectIds[i]);
            }
        }

        const promises: Promise<void>[] = [];
        if (segmentsFeatureIds.length > 0) {
            promises.push(this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                featureIds: segmentsFeatureIds,
                layerName: SDK_LAYERS.SEGMENTS
            }));
        }
        if (arrowsFeatureIds.length > 0) {
            promises.push(this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                featureIds: arrowsFeatureIds,
                layerName: SDK_LAYERS.ARROWS
            }));
        }

        if (iconsFeatureIds.length > 0) {
            promises.push(this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                featureIds: iconsFeatureIds,
                layerName: SDK_LAYERS.ICONS
            }));
        }
        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    public async removeNodesByIds(objectIds: (number)[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.removeNodesByIdsInternal(objectIds));
    }

    private async removeNodesByIdsInternal(objectIds: (number)[]): Promise<void> {
        Utils.debugLog(`Removing ${objectIds.length} nodes: ${objectIds.join()}`);
        for (let i = 0; i < objectIds.length; i++) {
            this.nodesStore.delete(objectIds[i]);
        }
        if (objectIds.length > 0) {
            await this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                featureIds: objectIds,
                layerName: SDK_LAYERS.NODES
            });
        }
    }

    public async updateSegmentsByIds(objectIds: (number)[]): Promise<void> {
        return this.enqueueDataModelOp(async () => {
            if (this.redrawTimeout !== null || objectIds.length === 0) return;
            await this.removeSegmentsByIdsInternal(objectIds);
            await this.addSegmentsByIdsInternal(objectIds);
        });
    }

    public async updateNodesByIds(objectIds: (number)[]): Promise<void> {
        return this.enqueueDataModelOp(async () => {
            if (this.redrawTimeout !== null || objectIds.length === 0) return;
            await this.removeNodesByIdsInternal(objectIds);
            await this.addNodesByIdsInternal(objectIds);
        });
    }

    // TODO: refactor (Strategy pattern?)
    private async drawSegmentSDK(
        model: Segment,
        streetsMap: Map<number, Street>
    ): Promise<{ labels: OpenLayers.Feature.Vector[] | undefined }> {
        if (!model || await this.mediator.wmeSDK.DataModel.isDeleted({
            dataModelName: "segments",
            objectId: model.id
        })) {
            // Skip deleted segments (this happens when the user pans away and comes back on a deleted segment)
            return { labels: [] };
        }

        const { id, geometry, roadType: initialRoadType, isTwoWay, elevationLevel, fwdSpeedLimit, revSpeedLimit, fromLanesInfo, toLanesInfo, isAtoB, isBtoA, lockRank, flagAttributes, hasClosures, hasRestrictions, toNodeLanesCount, fromNodeLanesCount, length, primaryStreetId } = model;
        this.mediator.debugLog(`Drawing segment: ${id}`);
        // TODO const hasToBeSk = hasToBeSkipped(attributes.roadType)

        //const segmentFeatures: SdkFeature<LineString>[] = [];

        /*
        const geoPoints = model.getGeometry().coordinates; // array of coordinates
        const olPointArray = geoPoints.map(geoPoint => new OpenLayers.Geometry.Point(geoPoint[0], geoPoint[1]).transform(gmapsProjection, OLMap.projection));
        const simplified = new OpenLayers.Geometry.LineString(olPointArray).simplify(
          1.5
        ).components;
        */
        const geometryPointArray = model.geometry.coordinates;
        /* Visualize simplified, for testing
        let redSegment: SdkFeature<LineString> = {
          type: 'Feature',
          id: model.id,
          geometry: simplified,
          properties: {
            "color": preferences['red']['strokeColor'],
            "width": 10,
            "dash": preferences['red']['strokeDashstyle'],
            'zIndex': 100
          },
        };
        queueSegmentFeatureForDrawing(model.id, redSegment);
        */
        const baselevel = (elevationLevel ?? 0) * 100;
        const isInRoundabout = model.junctionId !== null;
        let isBridge = false;
        let hasSpeedLimitDrawn = false;
        // eslint-disable-next-line prefer-destructuring
        let roadType = initialRoadType;
        //Compute the segment width
        let segmentWidth: number = 0;
        if (this.mediator.getPreference('realsize')) {
            let segmentWidthFrom = 0;
            let segmentWidthTo = 0;
            if (fromLanesInfo) {
                if (fromLanesInfo.laneWidth) {
                    segmentWidthFrom =
                        (fromLanesInfo.numberOfLanes *
                            (this.isImperial ? Utils.feetToMeters(fromLanesInfo.laneWidth) : fromLanesInfo.laneWidth))
                } else {
                    segmentWidthFrom =
                        fromLanesInfo.numberOfLanes *
                        this.defaultLaneWidthMeters[initialRoadType];
                }
            } else {
                segmentWidthFrom = this.defaultLaneWidthMeters[initialRoadType];
            }

            if (toLanesInfo) {
                if (toLanesInfo.laneWidth) {
                    segmentWidthTo =
                        (toLanesInfo.numberOfLanes *
                            (this.isImperial ? Utils.feetToMeters(toLanesInfo.laneWidth) : toLanesInfo.laneWidth));
                } else {
                    segmentWidthTo =
                        toLanesInfo.numberOfLanes *
                        this.defaultLaneWidthMeters[initialRoadType];
                }
            } else {
                segmentWidthTo = this.defaultLaneWidthMeters[initialRoadType];
            }

            if (!isTwoWay) {
                segmentWidth = isAtoB
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
            segmentWidth = this.streetStyles[roadType]?.strokeWidth ?? 0;
        }

        const totalSegmentWidth = segmentWidth; // ?? getWidth(roadType, isTwoWay);
        //console.log("TOTAL WIDTH: " + totalSegmentWidth);
        // roadWidth: the width of the "inner" segment, without decorations around it. It will be modified later
        let roadWidth = totalSegmentWidth;
        if (primaryStreetId === null) {
            // consoleDebug("RED segment", model);
            let redSegment: SdkFeature<LineString> = {
                type: 'Feature',
                id: model.id,
                geometry: model.geometry,
                properties: {
                    "color": this.mediator.getPreference('red.strokeColor'),
                    "width": totalSegmentWidth,
                    "dash": this.mediator.getPreference('red.strokeDashstyle'),
                },
            };
            this.queueSegmentFeatureForDrawing(model.id, redSegment);
            return { labels: [] };
        }

        // consoleDebug(width);
        if (
            this.mediator.getPreference('routingModeEnabled') &&
            model.routingRoadType !== null
        ) {
            roadType = model.routingRoadType;
        }

        // Compute labels first so one-way arrow placement can avoid colliding with them
        const oldModel = W.model.segments.getObjectById(model.id);
        let labels: OpenLayers.Feature.Vector[] | undefined;
        if (oldModel) {
            labels = this.drawLabels(oldModel, oldModel?.getOLGeometry().simplify(7).components, model, streetsMap);
        }

        if (this.streetStyles[roadType] !== undefined) {
            const speed = fwdSpeedLimit ?? revSpeedLimit; // If it remains null it does not have a speed limit
            // consoleDebug("Road Type: ", roadType);
            if (elevationLevel && elevationLevel > 0) {
                // it is a bridge
                // consoleDebug("Bridge");
                isBridge = true;
                let bridge: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': '#000000',
                        'zIndex': baselevel + 100,
                        'width': totalSegmentWidth,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, bridge);
            }

            hasSpeedLimitDrawn = speed && this.mediator.getPreference('showSLcolor');
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

                if (
                    !this.mediator.getPreference('showSLSinglecolor') &&
                    (fwdSpeedLimit || revSpeedLimit) &&
                    fwdSpeedLimit !== revSpeedLimit &&
                    isTwoWay
                ) {
                    if (this.mediator.getPreference('realsize')) {
                        // consoleDebug("The segment has 2 different speed limits");
                        // It has 2 different speeds:
                        const offset = (isBridge
                            ? (totalSegmentWidth * 0.17) // 0,14
                            : (totalSegmentWidth * 0.1915)) / 0.44799999999906703; // 0,22

                        // 'Left' geometry: A positive offset shifts the line to the left of its travel direction.
                        const fwdSpeedFeature = lineOffset(model.geometry, offset, { units: 'meters' });

                        // 'Right' geometry: A negative offset shifts the line to the right of its travel direction.
                        const revSpeedFeature = lineOffset(model.geometry, -offset, { units: 'meters' });


                        let leftSpeedLimit: SdkFeature<LineString> = {
                            type: 'Feature',
                            id: model.id,
                            geometry: fwdSpeedFeature.geometry,
                            properties: {
                                'color': this.getColorStringFromSpeed(fwdSpeedLimit),
                                'width': isBridge ? totalSegmentWidth * 0.1 : totalSegmentWidth * 0.2, // 0,8
                                'dash': 'solid',
                                'closeZoomOnly': 1,
                                'zIndex': baselevel + 115,
                            },
                        };
                        this.queueSegmentFeatureForDrawing(model.id, leftSpeedLimit);

                        let rightSpeedLimit: SdkFeature<LineString> = {
                            type: 'Feature',
                            id: model.id,
                            geometry: revSpeedFeature.geometry,
                            properties: {
                                'color': this.getColorStringFromSpeed(revSpeedLimit),
                                'width': isBridge ? totalSegmentWidth * 0.1 : totalSegmentWidth * 0.2, // 0,8
                                'dash': 'solid',
                                'closeZoomOnly': 1,
                                'zIndex': baselevel + 115,
                            },
                        };
                        this.queueSegmentFeatureForDrawing(model.id, rightSpeedLimit);
                    } else {
                        // realsize is disabled, we cannot draw 2 separate lines.
                        let speedValue = fwdSpeedLimit; // If the segment is two way, take any speed, they are equal.
                        if (speedValue) {
                            let speedLimit: SdkFeature<LineString> = {
                                type: 'Feature',
                                id: model.id,
                                geometry: model.geometry,
                                properties: {
                                    'color': this.getColorStringFromSpeed(speedValue),
                                    'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                                    'dash': 'solid',
                                    'closeZoomOnly': 1,
                                    'zIndex': baselevel + 115,
                                },
                            };
                            this.queueSegmentFeatureForDrawing(model.id, speedLimit);
                        }
                        speedValue = revSpeedLimit; // If the segment is two way, take any speed, they are equal.
                        if (speedValue) {
                            let speedLimit: SdkFeature<LineString> = {
                                type: 'Feature',
                                id: model.id,
                                geometry: model.geometry,
                                properties: {
                                    'color': this.getColorStringFromSpeed(speedValue),
                                    'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                                    'dash': 'dash',
                                    'closeZoomOnly': 1,
                                    'zIndex': baselevel + 116,
                                },
                            };
                            this.queueSegmentFeatureForDrawing(model.id, speedLimit);
                        }
                    }
                } else {
                    // The segment is two way street with the same speed limit on both sides or one way street
                    let speedValue = fwdSpeedLimit; // If the segment is two way, take any speed, they are equal.

                    // If it is one way and the direction is the reverse one, take the other speed
                    if (!isTwoWay && isBtoA) {
                        speedValue = revSpeedLimit;
                    }
                    if (speedValue) {
                        let speedLimit: SdkFeature<LineString> = {
                            type: 'Feature',
                            id: model.id,
                            geometry: model.geometry,
                            properties: {
                                'color': this.getColorStringFromSpeed(speedValue),
                                'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                                'dash': 'solid',
                                'closeZoomOnly': 1,
                                'zIndex': baselevel + 115,
                            },
                        };
                        this.queueSegmentFeatureForDrawing(model.id, speedLimit);
                    }
                }
            }

            // Draw the road
            let roadFeature: SdkFeature<LineString> = {
                type: 'Feature',
                id: model.id,
                geometry: model.geometry,
                properties: {
                    'color': this.streetStyles[roadType]['strokeColor'],
                    'width': roadWidth,
                    'dash': this.streetStyles[roadType]['strokeDashstyle'],
                    'zIndex': baselevel + 120,
                },
            };
            this.queueSegmentFeatureForDrawing(model.id, roadFeature);

            if (elevationLevel && elevationLevel < 0) {
                // Tunnel
                let tunnel: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': '#000000',
                        'width': roadWidth,
                        'opacity': 0.3,
                        'zIndex': baselevel + 125,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, tunnel);
            }

            const currentLock = lockRank + 1;
            const userRank = this.cachedUserRank ?? (await this.mediator.wmeSDK.State.getUserInfo())?.rank;
            if (
                currentLock > this.mediator.getPreference('fakelock') ||
                (typeof userRank !== "undefined" && currentLock > (userRank + 1))
            ) {
                let fakelock: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.nonEditableStyle.strokeColor,
                        'width': roadWidth * 0.1,
                        'dash': this.nonEditableStyle.strokeDashstyle,
                        'zIndex': baselevel + 147,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, fakelock);
            }

            const flags = flagAttributes;

            if (flags.unpaved) {

                let unpaved: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.mediator.getPreference('dirty.strokeColor'),
                        'width': roadWidth * 0.7,
                        'opacity': this.mediator.getPreference('dirty.strokeOpacity'),
                        'dash': this.mediator.getPreference('dirty.strokeDashstyle'),
                        'zIndex': baselevel + 135,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, unpaved);
            }

            // Check segment properties

            // CLOSE Zoom properties
            if (hasClosures) {
                let closureLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.mediator.getPreference('closure.strokeColor'),
                        'width': roadWidth * 0.6,
                        'dash': this.mediator.getPreference('closure.strokeDashstyle'),
                        'opacity': this.mediator.getPreference('closure.strokeOpacity'),
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 140,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, closureLine);
            }

            try {
                const mightBeToll = !oldModel
                    || Boolean(oldModel.attributes.fwdToll || oldModel.attributes.revToll)
                    || (hasRestrictions && model.restrictions.some((r: any) => r.defaultType === 'TOLL'));
                if (
                    mightBeToll &&
                    await this.mediator.wmeSDK.DataModel.Segments.isTollSegment({ segmentId: model.id })
                ) {
                    // It is a toll road
                    // consoleDebug("Segment is toll");
                    let tollLine: SdkFeature<LineString> = {
                        type: 'Feature',
                        id: model.id,
                        geometry: model.geometry,
                        properties: {
                            'color': this.mediator.getPreference('toll.strokeColor'),
                            'width': roadWidth * 0.3, // TODO preferences['toll']['strokeWidth'],
                            'dash': this.mediator.getPreference('toll.strokeDashstyle'),
                            'opacity': this.mediator.getPreference('toll.strokeOpacity'),
                            'zIndex': baselevel + 145,
                        },
                    };
                    this.queueSegmentFeatureForDrawing(model.id, tollLine);
                }
            } catch (ignore) { }

            if (isInRoundabout) {
                // It is a roundabout
                // consoleDebug("Segment is a roundabout");
                let roundaboutLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.roundaboutStyle.strokeColor,
                        'width': roadWidth * 0.15,
                        'dash': this.roundaboutStyle.strokeDashstyle,
                        'opacity': this.roundaboutStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 150,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, roundaboutLine);
            }

            if (hasRestrictions) {
                // It has restrictions
                // consoleDebug("Segment has restrictions");
                let restrictionLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.mediator.getPreference('restriction.strokeColor'),
                        'width': roadWidth * 0.4, // this.mediator.getPreference('restriction.strokeWidth'),
                        'dash': this.mediator.getPreference('restriction.strokeDashstyle'),
                        'opacity': this.mediator.getPreference('restriction.strokeOpacity'),
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 155,
                    },
                }
                this.queueSegmentFeatureForDrawing(model.id, restrictionLine);
            }

            /*
            // TODO: not supported by SDK
            if (model.validated === false) {
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
            */

            if (flags.headlights) {
                let headlights: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.mediator.getPreference('headlights.strokeColor'),
                        'width': roadWidth * 0.2, // this.mediator.getPreference('headlights.strokeWidth'),
                        'dash': this.mediator.getPreference('headlights.strokeDashstyle'),
                        'opacity': this.mediator.getPreference('headlights.strokeOpacity'),
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 165,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, headlights);
            }
            if (flags.nearbyHOV) {
                let nearbyHOVLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.mediator.getPreference('nearbyHOV.strokeColor'),
                        'width': roadWidth * 0.25,
                        'dash': this.mediator.getPreference('nearbyHOV.strokeDashstyle'),
                        'opacity': this.mediator.getPreference('nearbyHOV.strokeOpacity'),
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 166,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, nearbyHOVLine);
            }

            if (toNodeLanesCount > 0) {
                // console.log("LANE fwd");
                const res = [
                    geometryPointArray[0],
                    this.getCentroid(geometryPointArray[0], geometryPointArray[1]),
                ];

                let letToNodeLanes: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: { type: 'LineString', coordinates: res },
                    properties: {
                        'color': this.mediator.getPreference('lanes.strokeColor'),
                        'width': roadWidth * 0.3,
                        'dash': this.mediator.getPreference('lanes.strokeDashstyle'),
                        'opacity': this.mediator.getPreference('lanes.strokeOpacity'),
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 170,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, letToNodeLanes);
            }
            if (fromNodeLanesCount > 0) {
                // was: revLaneCount
                // console.log("LANE rev");
                const len = geometryPointArray.length;
                const res = [
                    this.getCentroid(geometryPointArray[len - 2], geometryPointArray[len - 1]),
                    geometryPointArray[len - 1],
                ];

                let fromNodeLanes: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: { type: 'LineString', coordinates: res },
                    properties: {
                        'color': this.mediator.getPreference('lanes.strokeColor'),
                        'width': roadWidth * 0.3,
                        'dash': this.mediator.getPreference('lanes.strokeDashstyle'),
                        'opacity': this.mediator.getPreference('lanes.strokeOpacity'),
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 175,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, fromNodeLanes);
            }

            if (
                !isTwoWay
            ) {
                const arrowSamples = this.sampleArrowPointsAlongSegment(
                    model.geometry.coordinates,
                    isInRoundabout,
                    labels
                );

                if (
                    (isAtoB || isBtoA) === false &&
                    model.isDrivable
                ) {
                    // Unknown direction
                    for (const sample of arrowSamples) {
                        const unknownDir: SdkFeature<Point> = {
                            type: 'Feature',
                            id: model.id,
                            geometry: {
                                type: 'Point',
                                coordinates: sample.coordinates,
                            },
                            properties: {
                                'closeZoomOnly': 1,
                                'isUnknownDirection': 1,
                                'minZoom': sample.minZoom,
                                'zIndex': baselevel + 180,
                            },
                        };
                        this.queueArrowFeatureForDrawing(model.id, unknownDir);
                    }
                } else {
                    // It is one way, draw normal arrows
                    for (const sample of arrowSamples) {
                        const degrees = this.getAngleDegreesSDK(
                            isAtoB,
                            sample.p0,
                            sample.p1
                        );

                        const arrow: SdkFeature<Point> = {
                            type: 'Feature',
                            id: model.id,
                            geometry: {
                                type: 'Point',
                                coordinates: sample.coordinates,
                            },
                            properties: {
                                'degrees': degrees,
                                'minZoom': sample.minZoom,
                                'zIndex': baselevel + 180,
                            },
                        };
                        this.queueArrowFeatureForDrawing(model.id, arrow);
                    }
                }
            }

            if (flags.fwdSpeedCamera && (isAtoB || isTwoWay)) {
                const avg = this.createAverageSpeedCameraSDK({
                    id: model.id,
                    rev: false,
                    isForward: isAtoB || isTwoWay,
                    p0: model.geometry.coordinates[0],
                    p1: model.geometry.coordinates[1],
                });
                this.queueIconFeatureForDrawing(model.id, avg);
            }

            if (flags.revSpeedCamera && (isBtoA || isTwoWay)) {
                const avg = this.createAverageSpeedCameraSDK({
                    id: model.id,
                    rev: true,
                    isForward: isAtoB,
                    p0: model.geometry.coordinates[model.geometry.coordinates.length - 1],
                    p1: model.geometry.coordinates[model.geometry.coordinates.length - 2],
                });
                this.queueIconFeatureForDrawing(model.id, avg);
            }
            // 'End': Close Zoom

            // In any 'Zoom':
            if (flags.tunnel) {
                let tunnelFlag: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.tunnelFlagStyle1.strokeColor,
                        'opacity': this.tunnelFlagStyle1.strokeOpacity,
                        'width': roadWidth * 0.3,
                        'dash': this.tunnelFlagStyle1.strokeDashstyle,
                        'zIndex': baselevel + 177,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, tunnelFlag);

                let tunnelFlag2: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: model.id,
                    geometry: model.geometry,
                    properties: {
                        'color': this.tunnelFlagStyle2.strokeColor,
                        'width': roadWidth * 0.1,
                        'dash': this.tunnelFlagStyle2.strokeDashstyle,
                        'zIndex': baselevel + 177,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, tunnelFlag2);
            } // 'else': road type is not supported, just add the label
        }

        return { labels };
    }

    /**
  *
  * @param {Waze.Feature.Vector.Segment} segmentModel
  * @param {Array<OpenLayers.Geometry.Point>} simplified
  */
    private drawLabels(
        segmentModel: Waze.Feature.Vector.Segment,
        simplified: Array<OpenLayers.Geometry.Point>,
        sdkSegment: Segment,
        streetsMap: Map<number, Street>
    ): OpenLayers.Feature.Vector[] {
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
        const primaryStreet = sdkSegment.primaryStreetId !== null ? streetsMap.get(sdkSegment.primaryStreetId) : undefined;
        const hasStreetName = Boolean(
            primaryStreet &&
            !primaryStreet.isEmpty &&
            typeof primaryStreet.name === 'string' &&
            primaryStreet.name.length > 0
        );
        let streetPart = '';
        if (hasStreetName) {
            streetPart = primaryStreet!.name as string;
        } else if (attributes.roadType < 10 && !segmentModel.isInRoundabout()) {
            streetPart = '⚑';
        }
        // consoleDebug(`Streetpart: ${streetPart}`);

        // add alt street names
        let altStreetPart = '';
        if (this.mediator.getPreference('showANs') && sdkSegment.alternateStreetIds?.length > 0) {
            let ANsShown = 0;
            for (let i = 0; i < sdkSegment.alternateStreetIds.length; i += 1) {
                const altStreet = streetsMap.get(sdkSegment.alternateStreetIds[i]);
                if (ANsShown === 2) {
                    // Show maximum 2 alternative names
                    altStreetPart += ' …';
                    break;
                }
                const altStreetName = !altStreet?.isEmpty ? altStreet?.name : undefined;
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

        if (!this.streetStyles[attributes.roadType]) {
            streetPart += '\n!! UNSUPPORTED ROAD TYPE !!';
        }

        let speedPart = '';
        const speed = attributes.fwdMaxSpeed ?? attributes.revMaxSpeed;
        if (speed && this.mediator.getPreference('showSLtext')) {
            if (attributes.fwdMaxSpeed === attributes.revMaxSpeed) {
                speedPart = this.getSuperScript(attributes.fwdMaxSpeed);
            } else if (attributes.fwdMaxSpeed) {
                speedPart = this.getSuperScript(attributes.fwdMaxSpeed);
                if (attributes.revMaxSpeed) {
                    speedPart += `'${this.getSuperScript(attributes.revMaxSpeed)}`;
                }
            } else {
                speedPart = this.getSuperScript(attributes.revMaxSpeed);
                if (attributes.fwdMaxSpeed) {
                    speedPart += `'${this.getSuperScript(attributes.fwdMaxSpeed)}`;
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
            'color': this.streetStyles[roadTypeID]
                ? this.streetStyles[roadTypeID]['strokeColor']
                : '#f00',
            'outlinecolor': this.streetStyles[roadTypeID]
                ? this.streetStyles[roadTypeID]['outlineColor']
                : '#fff',
            'outlinewidth': this.mediator.getPreference('labelOutlineWidth'),
        });

        const distances: { index: number, distance: number }[] = [];
        for (let p = 0; p < simplified.length - 1; p += 1) {
            const ptA = simplified[p];
            const ptB = simplified[p + 1];
            const distance = Math.hypot(ptA.x - ptB.x, ptA.y - ptB.y);
            distances.push({ index: p, distance });
        }
        // sort them by distance, descending
        distances.sort((a, b) =>
            a.distance > b.distance ? -1 : a.distance < b.distance ? 1 : 0
        );
        let labelsToInsert = streetPart === '' ? 1 : distances.length;
        const requiredSpace = this.clutterConstant * Math.max(labelText.length, altStreetPart.length);
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
            p0 = simplified[p];
            const pNext = simplified[p + 1];
            p1 = new OpenLayers.Geometry.Point(
                (p0.x + pNext.x) * 0.5,
                (p0.y + pNext.y) * 0.5
            );
            labelFeature = sampleLabel.clone();
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
                directionArrow = ' ▶ '; // for debugging, ▷ is an alternative.
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

    private getSuperScript(number: number): string {
        if (!number) return '';
        const cached = this.superScriptCache.get(number);
        if (cached !== undefined) {
            return cached;
        }
        const numberString = (this.isImperial ? Math.round(number / 1.609344) : number).toString();
        let res = '';
        for (let i = 0; i < numberString.length; i += 1) {
            res += this.superScript[Number(numberString.charAt(i))];
        }
        this.superScriptCache.set(number, res);
        return res;
    }

}