import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { Country, Node, SdkFeature, Segment, Street } from "wme-sdk-typings";
import { LineString, Point } from "geojson";
import { AlertType, SVLEvents } from "./AbstractMediator";
import { AcceptedControllerEvents, SDK_LAYERS, SVLLayerState } from "../svlGlobals";
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
    private queuedLabels: Set<SdkFeature<Point>> = new Set();

    private segmentsStore = new Map<Segment['id'], Set<string>>();
    private arrowsStore = new Map<Segment['id'], Set<string>>();
    private iconsStore = new Map<Segment['id'], Set<string>>();
    private labelsStore = new Map<Segment['id'], Set<string>>();
    private nodesStore = new Set<Node['id']>();

    private readonly segmentLayerStores: ReadonlyArray<{
        queue: Set<SdkFeature<any>>;
        store: Map<Segment['id'], Set<string>>;
        layerName: string;
        debugName: string;
    }> = [
            { queue: this.queuedSegments, store: this.segmentsStore, layerName: SDK_LAYERS.SEGMENTS, debugName: 'segments' },
            { queue: this.queuedArrows, store: this.arrowsStore, layerName: SDK_LAYERS.ARROWS, debugName: 'arrows' },
            { queue: this.queuedIcons, store: this.iconsStore, layerName: SDK_LAYERS.ICONS, debugName: 'icons' },
            { queue: this.queuedLabels, store: this.labelsStore, layerName: SDK_LAYERS.LABELS, debugName: 'labels' },
        ];

    private isImperial: boolean = false;
    private cachedUserRank: number | undefined = undefined;
    private speedColorCache = new Map<number | null, string>();
    private superScriptCache = new Map<number, string>();

    private superScript: Array<string> = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

    private streetStyles: StreetStyle[] = [];

    private clutterConstant: number = 7;
    private prefRealSize: boolean = true;
    private prefShowSLColor: boolean = true;
    private prefShowSLSingleColor: boolean = false;
    private prefSLColor: string = '#ffffff';
    private prefShowSLText: boolean = true;
    private prefShowANs: number = 2;
    private prefFakelock: number = 6;
    private prefLabelOutlineWidth: number = 3;
    private prefArrowDeclutter: number = 140;
    private prefSegmentsThreshold: number = 2500;
    private prefNodesThreshold: number = 2000;
    private prefUseWMERoadLayerAtZoom: number = 15;
    private prefRedStyle: { strokeColor: string; strokeDashstyle: string } = { strokeColor: '#ff0000', strokeDashstyle: 'solid' };
    private prefDirtyStyle: { strokeColor: string; strokeOpacity: number; strokeDashstyle: string } = { strokeColor: '#8b4513', strokeOpacity: 0.9, strokeDashstyle: 'solid' };
    private prefClosureStyle: { strokeColor: string; strokeOpacity: number; strokeDashstyle: string } = { strokeColor: '#ff0000', strokeOpacity: 0.8, strokeDashstyle: 'dash' };
    private prefTollStyle: { strokeColor: string; strokeOpacity: number; strokeDashstyle: string } = { strokeColor: '#0000ff', strokeOpacity: 0.7, strokeDashstyle: 'dash' };
    private prefRestrictionStyle: { strokeColor: string; strokeOpacity: number; strokeDashstyle: string } = { strokeColor: '#ffff00', strokeOpacity: 0.8, strokeDashstyle: 'dash' };
    private prefHeadlightsStyle: { strokeColor: string; strokeOpacity: number; strokeDashstyle: string } = { strokeColor: '#00ff00', strokeOpacity: 0.7, strokeDashstyle: 'dot' };
    private prefNearbyHOVStyle: { strokeColor: string; strokeOpacity: number; strokeDashstyle: string } = { strokeColor: '#b300ff', strokeOpacity: 0.8, strokeDashstyle: 'dash' };
    private prefLanesStyle: { strokeColor: string; strokeOpacity: number; strokeDashstyle: string } = { strokeColor: '#ffffff', strokeOpacity: 0.8, strokeDashstyle: 'dash' };
    private prefSpeeds: any = {};

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
            await RenderingController.instance.handleWMESettingsUpdated(false);
            RenderingController.instance.handleSVLSettingsUpdated(false);

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

    private async handleWMESettingsUpdated(shouldRedraw: boolean = true): Promise<void> {
        const newIsImperial = (await this.mediator.wmeSDK.Settings.getUserSettings()).isImperial === true;
        if (this.isImperial !== newIsImperial) {
            this.isImperial = newIsImperial;
            this.speedColorCache.clear();
            this.superScriptCache.clear();
            if (shouldRedraw) {
                this.redrawAll();
            }
        }
    }

    private handleSVLSettingsUpdated(shouldRedraw: boolean = true) {
        this.speedColorCache.clear();
        this.clutterConstant = this.mediator.getPreference('clutterConstant');
        this.prefRealSize = Boolean(this.mediator.getPreference('realsize'));
        this.prefShowSLColor = Boolean(this.mediator.getPreference('showSLcolor'));
        this.prefShowSLSingleColor = Boolean(this.mediator.getPreference('showSLSinglecolor'));
        this.prefSLColor = this.mediator.getPreference('SLColor');
        this.prefShowSLText = Boolean(this.mediator.getPreference('showSLtext'));
        this.prefShowANs = Number(this.mediator.getPreference('showANs')) || 0;
        this.prefFakelock = Number(this.mediator.getPreference('fakelock'));
        this.prefLabelOutlineWidth = Number(this.mediator.getPreference('labelOutlineWidth'));
        this.prefArrowDeclutter = Number(this.mediator.getPreference('arrowDeclutter')) || 140;
        this.prefSegmentsThreshold = Number(this.mediator.getPreference('segmentsThreshold'));
        this.prefNodesThreshold = Number(this.mediator.getPreference('nodesThreshold'));
        this.prefUseWMERoadLayerAtZoom = Number(this.mediator.getPreference('useWMERoadLayerAtZoom'));
        this.prefRedStyle = this.mediator.getPreference('red');
        this.prefDirtyStyle = this.mediator.getPreference('dirty');
        this.prefClosureStyle = this.mediator.getPreference('closure');
        this.prefTollStyle = this.mediator.getPreference('toll');
        this.prefRestrictionStyle = this.mediator.getPreference('restriction');
        this.prefHeadlightsStyle = this.mediator.getPreference('headlights');
        this.prefNearbyHOVStyle = this.mediator.getPreference('nearbyHOV');
        this.prefLanesStyle = this.mediator.getPreference('lanes');
        this.prefSpeeds = this.mediator.getPreference('speeds');

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

    private createAverageSpeedCameraSDK({ id, rev, p0, p1 }:
        { id: number, rev: boolean, p0: number[], p1: number[] }): SdkFeature<Point> {
        const degreesInRadians = this.getAngleRadiansSDK(true, p0, p1);
        const perpendicularAngle = degreesInRadians + Utils.PI_OVER_2;
        const shiftDegrees = 0.0001;
        const cosLat = Math.cos(p0[1] * Utils.PI_OVER_180) || 1;
        return {
            type: 'Feature',
            id: `${id}_cam_${rev ? 'r' : 'f'}`,
            geometry: {
                type: 'Point',
                coordinates: [
                    p0[0] + (Math.sin(perpendicularAngle) * shiftDegrees) / cosLat,
                    p0[1] + Math.cos(perpendicularAngle) * shiftDegrees
                ]
            },
            properties: {
                'isAverageSpeedCamera': 1,
                'closeZoomOnly': 1,
                'degrees': this.convertRadiansToDegrees(degreesInRadians)
            }
        }
    }

    private async handleCountryChanged(data?: { newCountry?: Country }): Promise<void> {
        const topCountry = data?.newCountry ?? await this.mediator.wmeSDK.DataModel.Countries.getTopCountry();
        if (!topCountry) return;

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
        Utils.debugLog('zoomChanged running');
        const currentState = this.mediator.getState();
        if ((await this.mediator.wmeSDK.Map.getZoomLevel()) <= this.prefUseWMERoadLayerAtZoom) {
            // There is nothing to draw, enable road layer
            Utils.debugLog('Road layer automatically enabled because of zoom out');
            if (currentState === SVLLayerState.VISIBLE) {
                this.mediator.notify(this, AcceptedControllerEvents.SVL_SHOULD_AUTOMATICALLY_DISABLE);
                return;
            }
        } else if (currentState === SVLLayerState.AUTOMATICALLY_DISABLED) {
            // Re-enable the SVL
            Utils.debugLog('Re-enabling SVL after zoom in');
            this.mediator.notify(this, AcceptedControllerEvents.SVL_SHOULD_ENABLE_LAYER);
            return;
        } else if (currentState === SVLLayerState.DRAWING_ABORTED) {
            await this.shouldDrawingResumeAfterAbort();
            return;
        }
    }

    private queueFeatureForSegment<G extends Point | LineString>(
        id: Segment['id'],
        feature: SdkFeature<G>,
        queue: Set<SdkFeature<G>>,
        store: Map<Segment['id'], Set<string>>
    ): void {
        queue.add(feature);
        let idSet = store.get(id);
        if (!idSet) {
            idSet = new Set();
            store.set(id, idSet);
        }
        idSet.add(String(feature.id));
    }

    private queueSegmentFeatureForDrawing(id: Segment['id'], feature: SdkFeature<LineString>): void {
        this.queueFeatureForSegment(id, feature, this.queuedSegments, this.segmentsStore);
    }

    private queueArrowFeatureForDrawing(id: Segment['id'], feature: SdkFeature<Point>): void {
        this.queueFeatureForSegment(id, feature, this.queuedArrows, this.arrowsStore);
    }

    private queueIconFeatureForDrawing(id: Segment['id'], feature: SdkFeature<Point>): void {
        this.queueFeatureForSegment(id, feature, this.queuedIcons, this.iconsStore);
    }

    private queueLabelFeatureForDrawing(id: Segment['id'], feature: SdkFeature<Point>): void {
        this.queueFeatureForSegment(id, feature, this.queuedLabels, this.labelsStore);
    }

    private collectAndDeleteStoredFeatureIds(
        segmentIds: readonly Segment['id'][],
        store: Map<Segment['id'], Set<string>>
    ): string[] {
        const featureIds: string[] = [];
        for (let i = 0; i < segmentIds.length; i++) {
            const segId = segmentIds[i];
            const set = store.get(segId);
            if (set) {
                featureIds.push(...set);
                store.delete(segId);
            }
        }
        return featureIds;
    }

    private clearAllSegmentQueues(): void {
        for (const { queue } of this.segmentLayerStores) {
            queue.clear();
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
        labels?: SdkFeature<Point>[]
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

        const effectiveDeclutter = Math.max(40, this.prefArrowDeclutter);
        const minStepMeters = (effectiveDeclutter / 8) * (isInRoundabout ? 1.5 : 1);

        const labelZones: { lon: number; lat: number; radiusMeters: number }[] = [];
        if (labels && labels.length > 0) {
            for (const lf of labels) {
                const labelCoords = lf?.geometry?.coordinates;
                if (labelCoords && labelCoords.length >= 2) {
                    const lon = labelCoords[0];
                    const lat = labelCoords[1];
                    const rawLabel = String(lf.properties?.['label'] ?? '');
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

    private getColorStringFromSpeed(metricspeed: number | null) {
        const cached = this.speedColorCache.get(metricspeed);
        if (cached !== undefined) {
            return cached;
        }
        let color: string;
        if (this.prefShowSLSingleColor) {
            color = this.prefSLColor;
        } else {
            const speedsPref = this.prefSpeeds;
            if (metricspeed === null) {
                color = speedsPref['default'];
            } else {
                const type = this.isImperial ? 'imperial' : 'metric';
                const speed = this.isImperial
                    ? Math.round(metricspeed / 1.609344)
                    : metricspeed;
                color = speedsPref[type]?.[speed] ?? speedsPref['default'];
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
        Utils.debugLog("Redrawing all SVL layers…");
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
        const segmentsThreshold = this.prefSegmentsThreshold;
        const nodesThreshold = this.prefNodesThreshold;
        Utils.debugLog(`Segments: ${segmentsCount}, Nodes: ${nodesCount}`);
        Utils.debugLog(`Limits: Segments: ${segmentsThreshold}, Nodes: ${nodesThreshold}`);
        if (
            segmentsCount < segmentsThreshold &&
            nodesCount < nodesThreshold
        ) {
            this.mediator.notify(this, AcceptedControllerEvents.SVL_SHOULD_ENABLE_LAYER);
        }
    }

    private async addSegmentsByModel(segments: Segment[], generation: number = this.drawGeneration): Promise<void> {
        const currentState = this.mediator.getState();
        if (currentState !== SVLLayerState.VISIBLE || segments.length === 0 || generation !== this.drawGeneration) return;
        if (segments.length > this.prefSegmentsThreshold) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${segments.length} segments. The current limit is set to ${this.prefSegmentsThreshold}.\nYou can change this in the SVL preferences panel.`);
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

        const staleLabelIds = this.collectAndDeleteStoredFeatureIds(
            segments.map(s => s.id),
            this.labelsStore
        );

        await Promise.all(
            segments.map(s => this.drawSegmentSDK(s, streetsMap))
        );
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
            this.clearAllSegmentQueues();
            return;
        }

        if (staleLabelIds.length > 0) {
            await this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                layerName: SDK_LAYERS.LABELS,
                featureIds: staleLabelIds,
            });
            if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
                this.clearAllSegmentQueues();
                return;
            }
        }

        await this.drawAllQueues();
    }

    private async drawAllQueues(): Promise<void> {
        await Promise.all(
            this.segmentLayerStores.map(async ({ queue, layerName, debugName }) => {
                if (queue.size > 0) {
                    this.mediator.debugLog(`Drawing ${queue.size} queued ${debugName}`);
                    const features = Array.from(queue);
                    queue.clear();
                    await this.mediator.wmeSDK.Map.addFeaturesToLayer({ layerName, features });
                }
            })
        );
    }

    private async addNodesByModel(nodes: Node[], generation: number = this.drawGeneration): Promise<void> {
        const currentState = this.mediator.getState();
        if (currentState !== SVLLayerState.VISIBLE || nodes.length === 0 || generation !== this.drawGeneration) return;
        if (nodes.length > this.prefNodesThreshold) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${nodes.length} nodes. The current limit is set to ${this.prefNodesThreshold}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }
        // TODO: this should not happen here. First the events in layerStateController should fire and manage that
        if ((await this.mediator.wmeSDK.Map.getZoomLevel()) <= this.prefUseWMERoadLayerAtZoom) {
            Utils.debugLog('Not adding nodes because of the zoom');
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

        const nodeStatuses = await Promise.all(
            nodesToProcess.map(async (n) => {
                const isDeleted = await this.mediator.wmeSDK.DataModel.isDeleted({
                    dataModelName: "nodes",
                    objectId: n.id
                });
                if (isDeleted) return null;
                try {
                    const isVirtual = await this.mediator.wmeSDK.DataModel.Nodes.isVirtual({ nodeId: n.id });
                    return isVirtual ? 1 : 0;
                } catch {
                    // Node is no longer in the data model (DataModelNotFoundError)
                    return null;
                }
            })
        );
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) return;

        const sdkFeatures: SdkFeature<Point>[] = [];
        for (let i = 0; i < nodesToProcess.length; i++) {
            const n = nodesToProcess[i];
            const isVirtualNode = nodeStatuses[i];
            if (isVirtualNode !== null && !this.nodesStore.has(n.id)) {
                this.nodesStore.add(n.id);
                sdkFeatures.push(
                    {
                        id: n.id,
                        geometry: n.geometry,
                        properties: {
                            "conSegm": n.connectedSegmentIds.length,
                            "isVirtualNode": isVirtualNode
                        },
                        type: "Feature",
                    }
                );
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
        for (const { queue, store } of this.segmentLayerStores) {
            queue.clear();
            store.clear();
        }

        await Promise.all(
            this.segmentLayerStores.map(({ layerName }) =>
                this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({ layerName })
            )
        );
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
        if (this.redrawTimeout !== null || objectIds.length === 0 || this.mediator.getState() !== SVLLayerState.VISIBLE) return;
        const idsToAdd = objectIds.filter(id => !this.segmentsStore.has(id));
        if (idsToAdd.length === 0) return;

        Utils.debugLog(`addSegmentsSDK - Adding ${idsToAdd.length} segments`);
        if (idsToAdd.length > this.prefSegmentsThreshold) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${idsToAdd.length} segments. The current limit is set to ${this.prefSegmentsThreshold}.\nYou can change this in the SVL preferences panel.`);
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
        if (this.redrawTimeout !== null || objectIds.length === 0 || this.mediator.getState() !== SVLLayerState.VISIBLE) return;
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
        const promises: Promise<void>[] = [];
        for (const { store, layerName } of this.segmentLayerStores) {
            const featureIds = this.collectAndDeleteStoredFeatureIds(objectIds, store);
            if (featureIds.length > 0) {
                promises.push(
                    this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                        featureIds,
                        layerName,
                    })
                );
            }
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
        streetsMap: Map<number, Street>,
    ): Promise<void> {
        if (!model || await this.mediator.wmeSDK.DataModel.isDeleted({
            dataModelName: "segments",
            objectId: model.id
        })) {
            // Skip deleted segments (this happens when the user pans away and comes back on a deleted segment)
            return;
        }

        const { id, roadType: initialRoadType, isTwoWay, elevationLevel, fwdSpeedLimit, revSpeedLimit, fromLanesInfo, toLanesInfo, isAtoB, isBtoA, lockRank, flagAttributes, hasClosures, hasRestrictions, toNodeLanesCount, fromNodeLanesCount, primaryStreetId } = model;
        this.mediator.debugLog(`Drawing segment: ${id}`);
        // TODO const hasToBeSk = hasToBeSkipped(attributes.roadType)

        const geometryPointArray = model.geometry.coordinates;
        const baselevel = (elevationLevel ?? 0) * 100;
        const isInRoundabout = model.junctionId !== null;
        let isBridge = false;
        let hasSpeedLimitDrawn = false;
        // eslint-disable-next-line prefer-destructuring
        let roadType = initialRoadType;
        //Compute the segment width
        let segmentWidth: number = 0;
        if (this.prefRealSize) {
            const defaultLaneWidth = this.defaultLaneWidthMeters[initialRoadType] ?? 3.5;
            let segmentWidthFrom = 0;
            let segmentWidthTo = 0;
            if (fromLanesInfo) {
                if (fromLanesInfo.laneWidth) {
                    segmentWidthFrom =
                        (fromLanesInfo.numberOfLanes *
                            (this.isImperial ? Utils.feetToMeters(fromLanesInfo.laneWidth) : fromLanesInfo.laneWidth));
                } else {
                    segmentWidthFrom =
                        fromLanesInfo.numberOfLanes *
                        defaultLaneWidth;
                }
            } else {
                segmentWidthFrom = defaultLaneWidth;
            }

            if (toLanesInfo) {
                if (toLanesInfo.laneWidth) {
                    segmentWidthTo =
                        (toLanesInfo.numberOfLanes *
                            (this.isImperial ? Utils.feetToMeters(toLanesInfo.laneWidth) : toLanesInfo.laneWidth));
                } else {
                    segmentWidthTo =
                        toLanesInfo.numberOfLanes *
                        defaultLaneWidth;
                }
            } else {
                segmentWidthTo = defaultLaneWidth;
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
        // roadWidth: the width of the "inner" segment, without decorations around it. It will be modified later
        let roadWidth = totalSegmentWidth;
        if (primaryStreetId === null) {
            // consoleDebug("RED segment", model);
            const redSegment: SdkFeature<LineString> = {
                type: 'Feature',
                id: `${model.id}_red`,
                geometry: model.geometry,
                properties: {
                    "color": this.prefRedStyle.strokeColor,
                    "width": totalSegmentWidth,
                    "dash": this.prefRedStyle.strokeDashstyle,
                },
            };
            this.queueSegmentFeatureForDrawing(model.id, redSegment);
            return;
        }

        if (
            this.mediator.isRoutingModeActive() &&
            model.routingRoadType !== null
        ) {
            roadType = model.routingRoadType;
        }

        // Compute labels first so one-way arrow placement can avoid colliding with them
        const labels = this.drawLabels(model, streetsMap, roadType);
        for (let i = 0; i < labels.length; i++) {
            this.queueLabelFeatureForDrawing(model.id, labels[i]);
        }

        if (this.streetStyles[roadType] !== undefined) {
            const speed = fwdSpeedLimit ?? revSpeedLimit; // If it remains null it does not have a speed limit
            // consoleDebug("Road Type: ", roadType);
            if (elevationLevel && elevationLevel > 0) {
                // it is a bridge
                // consoleDebug("Bridge");
                isBridge = true;
                const bridge: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_br`,
                    geometry: model.geometry,
                    properties: {
                        'color': '#000000',
                        'zIndex': baselevel + 100,
                        'width': totalSegmentWidth,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, bridge);
            }

            hasSpeedLimitDrawn = Boolean(speed) && this.prefShowSLColor;
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
                    !this.prefShowSLSingleColor &&
                    (fwdSpeedLimit || revSpeedLimit) &&
                    fwdSpeedLimit !== revSpeedLimit &&
                    isTwoWay
                ) {
                    if (this.prefRealSize) {
                        // consoleDebug("The segment has 2 different speed limits");
                        // It has 2 different speeds:
                        const offset = (isBridge
                            ? (totalSegmentWidth * 0.17) // 0,14
                            : (totalSegmentWidth * 0.1915)) / 0.44799999999906703; // 0,22

                        // 'Left' geometry: A positive offset shifts the line to the left of its travel direction.
                        const fwdSpeedFeature = lineOffset(model.geometry, offset, { units: 'meters' });

                        // 'Right' geometry: A negative offset shifts the line to the right of its travel direction.
                        const revSpeedFeature = lineOffset(model.geometry, -offset, { units: 'meters' });


                        const leftSpeedLimit: SdkFeature<LineString> = {
                            type: 'Feature',
                            id: `${model.id}_sl_l`,
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

                        const rightSpeedLimit: SdkFeature<LineString> = {
                            type: 'Feature',
                            id: `${model.id}_sl_r`,
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
                            const speedLimit: SdkFeature<LineString> = {
                                type: 'Feature',
                                id: `${model.id}_sl_f`,
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
                            const speedLimit: SdkFeature<LineString> = {
                                type: 'Feature',
                                id: `${model.id}_sl_rv`,
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
                        const speedLimit: SdkFeature<LineString> = {
                            type: 'Feature',
                            id: `${model.id}_sl`,
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
            const roadFeature: SdkFeature<LineString> = {
                type: 'Feature',
                id: `${model.id}_rd`,
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
                const tunnel: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_tun`,
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
                currentLock > this.prefFakelock ||
                (typeof userRank !== "undefined" && currentLock > (userRank + 1))
            ) {
                const fakelock: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_lk`,
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
                const unpaved: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_unp`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefDirtyStyle.strokeColor,
                        'width': roadWidth * 0.7,
                        'opacity': this.prefDirtyStyle.strokeOpacity,
                        'dash': this.prefDirtyStyle.strokeDashstyle,
                        'zIndex': baselevel + 135,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, unpaved);
            }

            // Check segment properties

            // CLOSE Zoom properties
            if (hasClosures) {
                const closureLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_cl`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefClosureStyle.strokeColor,
                        'width': roadWidth * 0.6,
                        'dash': this.prefClosureStyle.strokeDashstyle,
                        'opacity': this.prefClosureStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 140,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, closureLine);
            }

            try {
                if (await this.mediator.wmeSDK.DataModel.Segments.isTollSegment({ segmentId: model.id })) {
                    // It is a toll road
                    // consoleDebug("Segment is toll");
                    const tollLine: SdkFeature<LineString> = {
                        type: 'Feature',
                        id: `${model.id}_tl`,
                        geometry: model.geometry,
                        properties: {
                            'color': this.prefTollStyle.strokeColor,
                            'width': roadWidth * 0.3, // TODO preferences['toll']['strokeWidth'],
                            'dash': this.prefTollStyle.strokeDashstyle,
                            'opacity': this.prefTollStyle.strokeOpacity,
                            'zIndex': baselevel + 145,
                        },
                    };
                    this.queueSegmentFeatureForDrawing(model.id, tollLine);
                }
            } catch (ignore) { }

            if (isInRoundabout) {
                // It is a roundabout
                // consoleDebug("Segment is a roundabout");
                const roundaboutLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_ra`,
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
                const restrictionLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_res`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefRestrictionStyle.strokeColor,
                        'width': roadWidth * 0.4, // this.mediator.getPreference('restriction.strokeWidth'),
                        'dash': this.prefRestrictionStyle.strokeDashstyle,
                        'opacity': this.prefRestrictionStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 155,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, restrictionLine);
            }

            if (flags.headlights) {
                const headlights: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_hl`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefHeadlightsStyle.strokeColor,
                        'width': roadWidth * 0.2, // this.mediator.getPreference('headlights.strokeWidth'),
                        'dash': this.prefHeadlightsStyle.strokeDashstyle,
                        'opacity': this.prefHeadlightsStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 165,
                    },
                };
                this.queueSegmentFeatureForDrawing(model.id, headlights);
            }
            if (flags.nearbyHOV) {
                const nearbyHOVLine: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_hov`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefNearbyHOVStyle.strokeColor,
                        'width': roadWidth * 0.25,
                        'dash': this.prefNearbyHOVStyle.strokeDashstyle,
                        'opacity': this.prefNearbyHOVStyle.strokeOpacity,
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

                const letToNodeLanes: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_ln_to`,
                    geometry: { type: 'LineString', coordinates: res },
                    properties: {
                        'color': this.prefLanesStyle.strokeColor,
                        'width': roadWidth * 0.3,
                        'dash': this.prefLanesStyle.strokeDashstyle,
                        'opacity': this.prefLanesStyle.strokeOpacity,
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

                const fromNodeLanes: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_ln_fr`,
                    geometry: { type: 'LineString', coordinates: res },
                    properties: {
                        'color': this.prefLanesStyle.strokeColor,
                        'width': roadWidth * 0.3,
                        'dash': this.prefLanesStyle.strokeDashstyle,
                        'opacity': this.prefLanesStyle.strokeOpacity,
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
                    for (let i = 0; i < arrowSamples.length; i++) {
                        const sample = arrowSamples[i];
                        const unknownDir: SdkFeature<Point> = {
                            type: 'Feature',
                            id: `${model.id}_a_${i}`,
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
                    for (let i = 0; i < arrowSamples.length; i++) {
                        const sample = arrowSamples[i];
                        const degrees = this.getAngleDegreesSDK(
                            isAtoB,
                            sample.p0,
                            sample.p1
                        );

                        const arrow: SdkFeature<Point> = {
                            type: 'Feature',
                            id: `${model.id}_a_${i}`,
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
                    p0: model.geometry.coordinates[0],
                    p1: model.geometry.coordinates[1],
                });
                this.queueIconFeatureForDrawing(model.id, avg);
            }

            if (flags.revSpeedCamera && (isBtoA || isTwoWay)) {
                const avg = this.createAverageSpeedCameraSDK({
                    id: model.id,
                    rev: true,
                    p0: model.geometry.coordinates[model.geometry.coordinates.length - 1],
                    p1: model.geometry.coordinates[model.geometry.coordinates.length - 2],
                });
                this.queueIconFeatureForDrawing(model.id, avg);
            }
            // 'End': Close Zoom

            // In any 'Zoom':
            if (flags.tunnel) {
                const tunnelFlag: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_tf1`,
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

                const tunnelFlag2: SdkFeature<LineString> = {
                    type: 'Feature',
                    id: `${model.id}_tf2`,
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
    }

    private drawLabels(
        sdkSegment: Segment,
        streetsMap: Map<number, Street>,
        roadType: number = sdkSegment.roadType
    ): SdkFeature<Point>[] {
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
        } else if (roadType < 10 && sdkSegment.junctionId === null) {
            streetPart = '⚑';
        }

        // add alt street names
        let altStreetPart = '';
        if (this.prefShowANs > 0 && sdkSegment.alternateStreetIds?.length > 0) {
            let ANsShown = 0;
            for (let i = 0; i < sdkSegment.alternateStreetIds.length; i += 1) {
                const altStreet = streetsMap.get(sdkSegment.alternateStreetIds[i]);
                const altStreetName = !altStreet?.isEmpty ? altStreet?.name : undefined;
                if (altStreetName && altStreetName !== streetPart) {
                    if (ANsShown === this.prefShowANs) {
                        // Show maximum prefShowANs alternative names
                        altStreetPart += ' …';
                        break;
                    }
                    ANsShown += 1;
                    altStreetPart += `(${altStreetName})`;
                }
            }

            altStreetPart = altStreetPart.replaceAll(')(', '｜');
            if (altStreetPart !== '') {
                altStreetPart = `\n${altStreetPart}`;
            }
        }

        if (!this.streetStyles[roadType]) {
            streetPart += '\n!! UNSUPPORTED ROAD TYPE !!';
        }

        let speedPart = '';
        const fwdMaxSpeed = sdkSegment.fwdSpeedLimit;
        const revMaxSpeed = sdkSegment.revSpeedLimit;
        const speed = fwdMaxSpeed ?? revMaxSpeed;
        if (speed && this.prefShowSLText) {
            if (fwdMaxSpeed === revMaxSpeed) {
                speedPart = this.getSuperScript(fwdMaxSpeed!);
            } else if (fwdMaxSpeed) {
                speedPart = this.getSuperScript(fwdMaxSpeed);
                if (revMaxSpeed) {
                    speedPart += `'${this.getSuperScript(revMaxSpeed)}`;
                }
            } else if (revMaxSpeed) {
                speedPart = this.getSuperScript(revMaxSpeed);
                if (fwdMaxSpeed) {
                    speedPart += `'${this.getSuperScript(fwdMaxSpeed)}`;
                }
            }
            if (
                !sdkSegment.isFwdSpeedLimitVerified ||
                !sdkSegment.isRevSpeedLimitVerified
            ) {
                speedPart += '?';
            }
        }
        const labelText = `${streetPart} ${speedPart}`;
        if (labelText === ' ') {
            return [];
        }

        const simplified = Utils.simplifyLonLatAsMercator(sdkSegment.geometry.coordinates, 7);
        if (simplified.length < 2) {
            return [];
        }

        const roadTypeStyle = this.streetStyles[roadType];
        const color = roadTypeStyle ? roadTypeStyle['strokeColor'] : '#f00';
        const outlinecolor = roadTypeStyle ? roadTypeStyle['outlineColor'] : '#fff';

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

        const isOneWay = !sdkSegment.isTwoWay && (sdkSegment.isAtoB || sdkSegment.isBtoA);
        const labels: SdkFeature<Point>[] = [];
        for (let i = 0; i < distances.length && labelsToInsert > 0; i += 1) {
            if (
                distances[i].distance < (i > 0 ? requiredSpace : requiredSpace - 30)
            ) {
                break;
            }
            const p = distances[i].index;
            const p0 = simplified[p];
            const pNext = simplified[p + 1];
            const midX = (p0.x + pNext.x) * 0.5;
            const midY = (p0.y + pNext.y) * 0.5;
            const dx = sdkSegment.isAtoB ? midX - p0.x : p0.x - midX;
            const dy = sdkSegment.isAtoB ? midY - p0.y : p0.y - midY;
            const angle = Math.atan2(dx, dy);
            let degrees = 90 + (angle * 180) / Math.PI;
            let directionArrow: string;
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
            if (!isOneWay) {
                directionArrow = ''; // The degree has to be computed anyway
            }

            labels.push({
                type: 'Feature',
                id: `${sdkSegment.id}_lbl_${i}`,
                geometry: {
                    type: 'Point',
                    coordinates: Utils.mercatorToLonLat(midX, midY),
                },
                properties: {
                    'sID': sdkSegment.id,
                    'label': directionArrow + labelText + directionArrow + altStreetPart,
                    'degrees': degrees,
                    'color': color,
                    'outlinecolor': outlinecolor,
                    'outlinewidth': this.prefLabelOutlineWidth,
                    'closeZoomOnly': p % 2 === 1 ? 1 : 0,
                    'showAtzoom': labelsToInsert,
                    'zIndex': 650,
                },
            });
            labelsToInsert -= 1;
        }

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