import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { Country, Node, SdkFeature, Segment, Street } from "wme-sdk-typings";
import { LineString, Point } from "geojson";
import { AlertType, SVLEvents } from "./AbstractMediator";
import {
    AcceptedControllerEvents,
    DEFAULT_PREFERENCES,
    DecorationStylePreference,
    RedStylePreference,
    SDK_LAYERS,
    SVLLayerState,
    SpeedsPreference,
    StreetStylePreference,
} from "../svlGlobals";
import { lineOffset } from "@turf/line-offset";
import Utils, { MercatorPoint } from "../Utils";

type MeterObject = Record<string, number>;

type StreetStyle = {
    strokeColor: string;
    strokeWidth: number;
    strokeDashstyle: string;
    outlineColor: string;
};

type SegmentRenderResult = {
    segmentId: Segment['id'];
    hasClosures: boolean;
    segments: SdkFeature<LineString>[];
    arrows: SdkFeature<Point>[];
    icons: SdkFeature<Point>[];
    labels: SdkFeature<Point>[];
};

type SegmentLabelDescriptor = {
    segment: Segment;
    roadType: number;
    streetPart: string;
    altStreetPart: string;
    labelText: string;
    hasDirectionArrow: boolean;
    groupKey: string;
};

type ChainEdge = {
    segment: Segment;
    roadType: number;
    startNodeKey: string;
    endNodeKey: string;
    mercatorPoints: MercatorPoint[];
    lengthMeters: number;
    startTangent: MercatorPoint;
    endTangent: MercatorPoint;
};

type OrientedChainItem = {
    edgeIdx: number;
    reversed: boolean;
};

type PlacedLabelBox = {
    x: number;
    y: number;
    ux: number;
    uy: number;
    halfLen: number;
    halfHeight: number;
    groupKey: string;
    lastQueryId: number;
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
    private closedSegmentIds = new Set<Segment['id']>();
    private labelChainPeers = new Map<Segment['id'], number[]>();
    private placedLabelBoxesBySegment = new Map<Segment['id'], PlacedLabelBox[]>();

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

    private readonly superScript: ReadonlyArray<string> = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

    private streetStyles: StreetStyle[] = [];

    private clutterConstant: number = DEFAULT_PREFERENCES.clutterConstant;
    private prefMergeConnectedLabels: boolean = DEFAULT_PREFERENCES.mergeConnectedLabels;
    private prefRealSize: boolean = DEFAULT_PREFERENCES.realsize;
    private prefShowSLColor: boolean = DEFAULT_PREFERENCES.showSLcolor;
    private prefShowSLSingleColor: boolean = DEFAULT_PREFERENCES.showSLSinglecolor;
    private prefSLColor: string = DEFAULT_PREFERENCES.SLColor;
    private prefShowSLText: boolean = DEFAULT_PREFERENCES.showSLtext;
    private prefShowANs: number = DEFAULT_PREFERENCES.showANs;
    private prefFakelock: number = DEFAULT_PREFERENCES.fakelock;
    private prefLabelOutlineWidth: number = DEFAULT_PREFERENCES.labelOutlineWidth;
    private prefCloseZoomLabelSize: number = DEFAULT_PREFERENCES.closeZoomLabelSize;
    private prefArrowDeclutter: number = DEFAULT_PREFERENCES.arrowDeclutter;
    private prefSegmentsThreshold: number = DEFAULT_PREFERENCES.segmentsThreshold;
    private prefNodesThreshold: number = DEFAULT_PREFERENCES.nodesThreshold;
    private prefUseWMERoadLayerAtZoom: number = DEFAULT_PREFERENCES.useWMERoadLayerAtZoom;
    private prefRedStyle: RedStylePreference = { strokeColor: '#FF0000', strokeDashstyle: 'solid' };
    private prefDirtyStyle: DecorationStylePreference = { strokeColor: '#82614A', strokeOpacity: 0.6, strokeDashstyle: 'longdash' };
    private prefClosureStyle: DecorationStylePreference = { strokeColor: '#FF00FF', strokeOpacity: 1.0, strokeDashstyle: 'dash' };
    private prefTollStyle: DecorationStylePreference = { strokeColor: '#00E1FF', strokeOpacity: 1.0, strokeDashstyle: 'solid' };
    private prefRestrictionStyle: DecorationStylePreference = { strokeColor: '#F2FF00', strokeOpacity: 1.0, strokeDashstyle: 'dash' };
    private prefHeadlightsStyle: DecorationStylePreference = { strokeColor: '#bfff00', strokeOpacity: 0.9, strokeDashstyle: 'dot' };
    private prefNearbyHOVStyle: DecorationStylePreference = { strokeColor: '#ff66ff', strokeOpacity: 1.0, strokeDashstyle: 'dash' };
    private prefLanesStyle: DecorationStylePreference = { strokeColor: '#454443', strokeOpacity: 0.9, strokeDashstyle: 'dash' };
    private prefSpeeds: SpeedsPreference = {
        default: DEFAULT_PREFERENCES.defaultSpeedColor,
        metric: {},
        imperial: {},
    };

    private readonly roundaboutStyle = {
        strokeColor: '#111111',
        strokeWidth: 1,
        strokeDashstyle: 'dash',
        strokeOpacity: 0.6,
    } as const;

    private readonly nonEditableStyle = {
        strokeColor: '#000',
        strokeDashstyle: 'solid',
    } as const;

    private readonly tunnelFlagStyle2 = {
        strokeColor: '#C90',
        strokeDashstyle: 'longdash',
    } as const;

    private readonly tunnelFlagStyle1 = {
        strokeColor: '#fff',
        strokeOpacity: 0.8,
        strokeDashstyle: 'longdash',
    } as const;

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

    private async isObjectDeletedSafe(dataModelName: "segments" | "nodes", objectId: number | string): Promise<boolean> {
        try {
            return await this.mediator.wmeSDK.DataModel.isDeleted({
                dataModelName,
                objectId,
            });
        } catch {
            // DataModelNotFoundError when an object was already purged from WME's local model
            return true;
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

    private handleSVLSettingsUpdated(shouldRedraw: boolean = true): void {
        this.speedColorCache.clear();
        this.clutterConstant = Number(this.mediator.getPreference('clutterConstant') ?? DEFAULT_PREFERENCES.clutterConstant);
        this.prefMergeConnectedLabels = Boolean(this.mediator.getPreference('mergeConnectedLabels') ?? DEFAULT_PREFERENCES.mergeConnectedLabels);
        this.prefRealSize = Boolean(this.mediator.getPreference('realsize') ?? DEFAULT_PREFERENCES.realsize);
        this.prefShowSLColor = Boolean(this.mediator.getPreference('showSLcolor') ?? DEFAULT_PREFERENCES.showSLcolor);
        this.prefShowSLSingleColor = Boolean(this.mediator.getPreference('showSLSinglecolor') ?? DEFAULT_PREFERENCES.showSLSinglecolor);
        this.prefSLColor = this.mediator.getPreference('SLColor') || DEFAULT_PREFERENCES.SLColor;
        this.prefShowSLText = Boolean(this.mediator.getPreference('showSLtext') ?? DEFAULT_PREFERENCES.showSLtext);
        this.prefShowANs = Number(this.mediator.getPreference('showANs') ?? DEFAULT_PREFERENCES.showANs) || 0;
        this.prefFakelock = Number(this.mediator.getPreference('fakelock') ?? DEFAULT_PREFERENCES.fakelock);
        this.prefLabelOutlineWidth = Number(this.mediator.getPreference('labelOutlineWidth') ?? DEFAULT_PREFERENCES.labelOutlineWidth);
        this.prefCloseZoomLabelSize = Number(this.mediator.getPreference('closeZoomLabelSize') ?? DEFAULT_PREFERENCES.closeZoomLabelSize);
        this.prefArrowDeclutter = Number(this.mediator.getPreference('arrowDeclutter')) || DEFAULT_PREFERENCES.arrowDeclutter;
        this.prefSegmentsThreshold = Number(this.mediator.getPreference('segmentsThreshold') ?? DEFAULT_PREFERENCES.segmentsThreshold);
        this.prefNodesThreshold = Number(this.mediator.getPreference('nodesThreshold') ?? DEFAULT_PREFERENCES.nodesThreshold);
        this.prefUseWMERoadLayerAtZoom = Number(this.mediator.getPreference('useWMERoadLayerAtZoom') ?? DEFAULT_PREFERENCES.useWMERoadLayerAtZoom);
        this.prefRedStyle = this.mediator.getPreference('red') ?? this.prefRedStyle;
        this.prefDirtyStyle = this.mediator.getPreference('dirty') ?? this.prefDirtyStyle;
        this.prefClosureStyle = this.mediator.getPreference('closure') ?? this.prefClosureStyle;
        this.prefTollStyle = this.mediator.getPreference('toll') ?? this.prefTollStyle;
        this.prefRestrictionStyle = this.mediator.getPreference('restriction') ?? this.prefRestrictionStyle;
        this.prefHeadlightsStyle = this.mediator.getPreference('headlights') ?? this.prefHeadlightsStyle;
        this.prefNearbyHOVStyle = this.mediator.getPreference('nearbyHOV') ?? this.prefNearbyHOVStyle;
        this.prefLanesStyle = this.mediator.getPreference('lanes') ?? this.prefLanesStyle;
        this.prefSpeeds = this.mediator.getPreference('speeds') ?? this.prefSpeeds;

        const streetStylesPref: Array<StreetStylePreference | undefined> = this.mediator.getPreference('streets') ?? [];
        this.streetStyles = [];
        for (let i = 0; i < streetStylesPref.length; i += 1) {
            const pref = streetStylesPref[i];
            if (pref) {
                this.streetStyles[i] = {
                    strokeColor: pref.strokeColor,
                    strokeWidth: pref.strokeWidth,
                    strokeDashstyle: pref.strokeDashstyle,
                    outlineColor: Utils.bestBackground(pref.strokeColor),
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
        };
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

    private registerRenderedFeaturesForSegment<G extends Point | LineString>(
        id: Segment['id'],
        features: readonly SdkFeature<G>[],
        queue: Set<SdkFeature<G>>,
        store: Map<Segment['id'], Set<string>>
    ): void {
        if (features.length === 0) return;
        let idSet = store.get(id);
        if (!idSet) {
            idSet = new Set();
            store.set(id, idSet);
        }
        for (let i = 0; i < features.length; i++) {
            const feature = features[i];
            queue.add(feature);
            idSet.add(String(feature.id));
        }
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
        return this.convertRadiansToDegrees(this.getAngleRadiansSDK(isForward, p0, p1));
    }

    private getAngleRadiansSDK(isForward: boolean, p0: number[], p1: number[]): number {
        const startP = isForward ? p0 : p1;
        const endP = isForward ? p1 : p0;

        // Longitude difference (dx) is scaled by cos(latitude in radians)
        const latInRadians = startP[1] * Utils.PI_OVER_180;
        const dx = (endP[0] - startP[0]) * Math.cos(latInRadians);
        const dy = endP[1] - startP[1];

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
        let minLon = coords[0][0];
        let maxLon = coords[0][0];
        let minLat = coords[0][1];
        let maxLat = coords[0][1];
        for (let i = 0; i < coords.length - 1; i++) {
            const nextLon = coords[i + 1][0];
            const nextLat = coords[i + 1][1];
            if (nextLon < minLon) minLon = nextLon;
            if (nextLon > maxLon) maxLon = nextLon;
            if (nextLat < minLat) minLat = nextLat;
            if (nextLat > maxLat) maxLat = nextLat;
            const dx = (nextLon - coords[i][0]) * metersPerDegLon;
            const dy = (nextLat - coords[i][1]) * metersPerDegLat;
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
                    const padLon = metersPerDegLon > 0 ? radiusMeters / metersPerDegLon : 0.001;
                    const padLat = radiusMeters / metersPerDegLat;
                    if (
                        lon >= minLon - padLon &&
                        lon <= maxLon + padLon &&
                        lat >= minLat - padLat &&
                        lat <= maxLat + padLat
                    ) {
                        labelZones.push({ lon, lat, radiusMeters });
                    }
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

    private getColorStringFromSpeed(metricspeed: number | null): string {
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
                color = speedsPref.default;
            } else {
                const type = this.isImperial ? 'imperial' : 'metric';
                const speed = this.isImperial
                    ? Math.round(metricspeed / 1.609344)
                    : metricspeed;
                color = speedsPref[type]?.[speed] ?? speedsPref.default;
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

        await this.renderSegmentBatch(segments, streetsMap, this.cachedUserRank, generation);
    }

    private async renderSegmentBatch(
        segments: Segment[],
        streetsMap: Map<number, Street>,
        userRank: number | undefined,
        generation: number,
        allContextSegments?: Segment[]
    ): Promise<void> {
        if (segments.length === 0 || generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
            return;
        }

        const deletedFlags = await Promise.all(
            segments.map(s => !s ? Promise.resolve(true) : this.isObjectDeletedSafe("segments", s.id))
        );
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
            return;
        }

        const validSegments: Segment[] = [];
        for (let i = 0; i < segments.length; i++) {
            if (!deletedFlags[i]) {
                validSegments.push(segments[i]);
            }
        }
        if (validSegments.length === 0) {
            return;
        }

        const {
            ownedLabelsBySegment,
            chainLabelsBySegment,
            placedBoxesBySegment,
            chainPeersBySegment,
        } = this.drawLabels(validSegments, streetsMap, allContextSegments ?? validSegments);

        const validResults = await Promise.all(
            validSegments.map(s =>
                this.buildSegmentRenderResult(
                    s,
                    userRank,
                    ownedLabelsBySegment.get(s.id) ?? [],
                    chainLabelsBySegment.get(s.id) ?? []
                )
            )
        );
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
            return;
        }

        const renderedSegmentIds = validResults.map(r => r.segmentId);

        // Remove any previously rendered features across all segment layers before committing new ones
        const staleRemovals: Promise<void>[] = [];
        for (const { store, layerName } of this.segmentLayerStores) {
            const staleIds = this.collectAndDeleteStoredFeatureIds(renderedSegmentIds, store);
            if (staleIds.length > 0) {
                staleRemovals.push(
                    this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                        layerName,
                        featureIds: staleIds,
                    })
                );
            }
        }
        if (staleRemovals.length > 0) {
            await Promise.all(staleRemovals);
            if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
                return;
            }
        }

        this.clearAllSegmentQueues();
        for (let i = 0; i < validResults.length; i++) {
            const res = validResults[i];
            const segId = res.segmentId;
            if (res.hasClosures) {
                this.closedSegmentIds.add(segId);
            } else {
                this.closedSegmentIds.delete(segId);
            }
            const peers = chainPeersBySegment.get(segId);
            if (peers) {
                this.labelChainPeers.set(segId, peers);
            } else {
                this.labelChainPeers.delete(segId);
            }
            const boxes = placedBoxesBySegment.get(segId);
            if (boxes && boxes.length > 0) {
                this.placedLabelBoxesBySegment.set(segId, boxes);
            } else {
                this.placedLabelBoxesBySegment.delete(segId);
            }
            this.registerRenderedFeaturesForSegment(segId, res.segments, this.queuedSegments, this.segmentsStore);
            this.registerRenderedFeaturesForSegment(segId, res.arrows, this.queuedArrows, this.arrowsStore);
            this.registerRenderedFeaturesForSegment(segId, res.icons, this.queuedIcons, this.iconsStore);
            this.registerRenderedFeaturesForSegment(segId, res.labels, this.queuedLabels, this.labelsStore);
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
                if (await this.isObjectDeletedSafe("nodes", n.id)) {
                    return null;
                }
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
                sdkFeatures.push({
                    id: n.id,
                    geometry: n.geometry,
                    properties: {
                        "conSegm": n.connectedSegmentIds.length,
                        "isVirtualNode": isVirtualNode
                    },
                    type: "Feature",
                });
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
        this.closedSegmentIds.clear();
        this.labelChainPeers.clear();
        this.placedLabelBoxesBySegment.clear();

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

    private collectTrackedLabelPeers(segmentIds: Iterable<number>): number[] {
        const exclude = new Set<number>(segmentIds);
        const peers = new Set<number>();
        for (const id of exclude) {
            const chainIds = this.labelChainPeers.get(id);
            if (!chainIds) continue;
            for (let i = 0; i < chainIds.length; i++) {
                const peerId = chainIds[i];
                if (!exclude.has(peerId) && this.segmentsStore.has(peerId)) {
                    peers.add(peerId);
                }
            }
        }
        return Array.from(peers);
    }

    private async renderSegmentsWithConnectedPeers(seedSegmentIds: number[]): Promise<void> {
        if (this.redrawTimeout !== null || seedSegmentIds.length === 0 || this.mediator.getState() !== SVLLayerState.VISIBLE) {
            return;
        }
        if (seedSegmentIds.length > this.prefSegmentsThreshold) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${seedSegmentIds.length} segments. The current limit is set to ${this.prefSegmentsThreshold}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }

        const generation = this.drawGeneration;
        const [allSegments, userInfo, streets] = await Promise.all([
            this.mediator.wmeSDK.DataModel.Segments.getAll(),
            this.mediator.wmeSDK.State.getUserInfo(),
            this.mediator.wmeSDK.DataModel.Streets.getAll(),
        ]);
        if (generation !== this.drawGeneration || this.mediator.getState() !== SVLLayerState.VISIBLE) {
            return;
        }

        this.cachedUserRank = userInfo?.rank;
        const streetsMap = new Map<number, Street>();
        for (let i = 0; i < streets.length; i++) {
            streetsMap.set(streets[i].id, streets[i]);
        }

        const expandedSegments = this.expandConnectedLabelPeers(seedSegmentIds, allSegments, streetsMap);
        if (expandedSegments.length === 0) {
            return;
        }
        if (expandedSegments.length > this.prefSegmentsThreshold) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${expandedSegments.length} segments. The current limit is set to ${this.prefSegmentsThreshold}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }

        await this.renderSegmentBatch(expandedSegments, streetsMap, this.cachedUserRank, generation, allSegments);
    }

    private expandConnectedLabelPeers(
        seedSegmentIds: number[],
        allSegments: Segment[],
        streetsMap: Map<number, Street>
    ): Segment[] {
        const seedSet = new Set<number>(seedSegmentIds);
        if (!this.prefMergeConnectedLabels) {
            const direct: Segment[] = [];
            for (let i = 0; i < allSegments.length; i++) {
                if (seedSet.has(allSegments[i].id)) {
                    direct.push(allSegments[i]);
                }
            }
            return direct;
        }
        const byId = new Map<number, Segment>();
        const targetGroupKeys = new Set<string>();
        const descriptors: SegmentLabelDescriptor[] = [];

        for (let i = 0; i < allSegments.length; i++) {
            const seg = allSegments[i];
            const isSeed = seedSet.has(seg.id);
            if (!isSeed && !this.segmentsStore.has(seg.id)) {
                continue;
            }
            byId.set(seg.id, seg);
            const desc = this.computeSegmentLabelDescriptor(seg, streetsMap, this.getEffectiveRoadType(seg));
            if (desc) {
                descriptors.push(desc);
                if (isSeed) {
                    targetGroupKeys.add(desc.groupKey);
                }
            }
        }

        if (targetGroupKeys.size > 0) {
            // Build node adjacency per target groupKey and BFS from seed segments across shared endpoints
            const nodeToSegmentIds = new Map<string, number[]>();
            const segEndpoints = new Map<number, [string, string]>();

            for (let i = 0; i < descriptors.length; i++) {
                const desc = descriptors[i];
                if (!targetGroupKeys.has(desc.groupKey)) continue;
                const seg = desc.segment;
                const [rawStart, rawEnd] = this.getRawSegmentNodeKeys(seg);
                const n0 = `${desc.groupKey}\0${rawStart}`;
                const n1 = `${desc.groupKey}\0${rawEnd}`;

                segEndpoints.set(seg.id, [n0, n1]);
                let list0 = nodeToSegmentIds.get(n0);
                if (!list0) {
                    list0 = [];
                    nodeToSegmentIds.set(n0, list0);
                }
                list0.push(seg.id);

                if (n1 !== n0) {
                    let list1 = nodeToSegmentIds.get(n1);
                    if (!list1) {
                        list1 = [];
                        nodeToSegmentIds.set(n1, list1);
                    }
                    list1.push(seg.id);
                }
            }

            const queue: number[] = [];
            for (const id of seedSet) {
                if (segEndpoints.has(id)) {
                    queue.push(id);
                }
            }

            let head = 0;
            while (head < queue.length) {
                const currentId = queue[head++];
                const endpoints = segEndpoints.get(currentId);
                if (!endpoints) continue;
                for (let e = 0; e < 2; e++) {
                    const neighbors = nodeToSegmentIds.get(endpoints[e]);
                    if (!neighbors) continue;
                    for (let j = 0; j < neighbors.length; j++) {
                        const neighborId = neighbors[j];
                        if (!seedSet.has(neighborId)) {
                            seedSet.add(neighborId);
                            queue.push(neighborId);
                        }
                    }
                }
            }
        }

        const result: Segment[] = [];
        for (const id of seedSet) {
            const seg = byId.get(id);
            if (seg) {
                result.push(seg);
            }
        }
        return result;
    }

    public async addSegmentsByIds(objectIds: number[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.addSegmentsByIdsInternal(objectIds));
    }

    private async addSegmentsByIdsInternal(objectIds: number[]): Promise<void> {
        if (this.redrawTimeout !== null || objectIds.length === 0 || this.mediator.getState() !== SVLLayerState.VISIBLE) return;
        const idsToAdd = objectIds.filter(id => !this.segmentsStore.has(id));
        if (idsToAdd.length === 0) return;

        Utils.debugLog(`addSegmentsSDK - Adding ${idsToAdd.length} segments`);
        await this.renderSegmentsWithConnectedPeers(idsToAdd);
    }

    public async addNodesByIds(objectIds: number[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.addNodesByIdsInternal(objectIds));
    }

    private async addNodesByIdsInternal(objectIds: number[]): Promise<void> {
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

    public async removeSegmentsByIds(objectIds: number[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.removeSegmentsByIdsInternal(objectIds, true));
    }

    private async removeSegmentsByIdsInternal(objectIds: number[], refreshSurvivingPeers: boolean = true): Promise<void> {
        if (objectIds.length === 0) return;
        Utils.debugLog(`Removing ${objectIds.length} segments: ${objectIds.join()}`);
        const survivingPeers = refreshSurvivingPeers ? this.collectTrackedLabelPeers(objectIds) : [];
        for (let i = 0; i < objectIds.length; i++) {
            this.closedSegmentIds.delete(objectIds[i]);
            this.labelChainPeers.delete(objectIds[i]);
            this.placedLabelBoxesBySegment.delete(objectIds[i]);
        }
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
        if (survivingPeers.length > 0 && this.redrawTimeout === null && this.mediator.getState() === SVLLayerState.VISIBLE) {
            await this.renderSegmentsWithConnectedPeers(survivingPeers);
        }
    }

    public async removeNodesByIds(objectIds: number[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.removeNodesByIdsInternal(objectIds));
    }

    private async removeNodesByIdsInternal(objectIds: number[]): Promise<void> {
        if (objectIds.length === 0) return;
        const removedIds: number[] = [];
        for (let i = 0; i < objectIds.length; i++) {
            const nodeId = objectIds[i];
            if (this.nodesStore.delete(nodeId)) {
                removedIds.push(nodeId);
            }
        }
        if (removedIds.length > 0) {
            Utils.debugLog(`Removing ${removedIds.length} nodes: ${removedIds.join()}`);
            await this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
                featureIds: removedIds,
                layerName: SDK_LAYERS.NODES
            });
        }
    }

    public async updateSegmentsByIds(objectIds: number[]): Promise<void> {
        return this.enqueueDataModelOp(() => this.updateSegmentsByIdsInternal(objectIds));
    }

    private async updateSegmentsByIdsInternal(objectIds: number[]): Promise<void> {
        if (this.redrawTimeout !== null || objectIds.length === 0) return;
        const oldPeers = this.collectTrackedLabelPeers(objectIds);
        await this.removeSegmentsByIdsInternal(objectIds, false);
        const idsToRender = oldPeers.length > 0
            ? Array.from(new Set([...objectIds, ...oldPeers]))
            : objectIds;
        await this.renderSegmentsWithConnectedPeers(idsToRender);
    }

    public async updateNodesByIds(objectIds: number[]): Promise<void> {
        return this.enqueueDataModelOp(async () => {
            if (this.redrawTimeout !== null || objectIds.length === 0) return;
            await this.removeNodesByIdsInternal(objectIds);
            await this.addNodesByIdsInternal(objectIds);
        });
    }

    public async handleSegmentIdChanged(oldId: number, newId: number): Promise<void> {
        return this.enqueueDataModelOp(async () => {
            if (this.redrawTimeout !== null) return;
            const oldPeers = this.collectTrackedLabelPeers([oldId]);
            await this.removeSegmentsByIdsInternal([oldId], false);
            await this.renderSegmentsWithConnectedPeers([newId, ...oldPeers]);
        });
    }

    public async handleNodeIdChanged(oldId: number, newId: number): Promise<void> {
        return this.enqueueDataModelOp(async () => {
            if (this.redrawTimeout !== null) return;
            await this.removeNodesByIdsInternal([oldId]);
            await this.addNodesByIdsInternal([newId]);
        });
    }

    public async refreshRoadClosureSegments(closureIds?: Array<string | number>): Promise<void> {
        return this.enqueueDataModelOp(async () => {
            if (this.redrawTimeout !== null || this.mediator.getState() !== SVLLayerState.VISIBLE) return;
            const affectedSegmentIds = new Set<number>();

            if (closureIds && closureIds.length > 0) {
                const closures = await Promise.all(
                    closureIds.map((id) =>
                        this.mediator.wmeSDK.DataModel.RoadClosures.getById({ roadClosureId: String(id) }).catch(() => null)
                    )
                );
                for (let i = 0; i < closures.length; i++) {
                    const segId = closures[i]?.segmentId;
                    if (typeof segId === 'number') {
                        affectedSegmentIds.add(segId);
                    }
                }
            }

            // Check any segment we previously drew with a closure in case its closure was removed
            if (this.closedSegmentIds.size > 0) {
                const trackedClosedIds = Array.from(this.closedSegmentIds);
                const segments = await Promise.all(
                    trackedClosedIds.map((segmentId) =>
                        this.mediator.wmeSDK.DataModel.Segments.getById({ segmentId }).catch(() => null)
                    )
                );
                for (let i = 0; i < trackedClosedIds.length; i++) {
                    const seg = segments[i];
                    if (!seg || !seg.hasClosures) {
                        affectedSegmentIds.add(trackedClosedIds[i]);
                    }
                }
            }

            if (affectedSegmentIds.size > 0) {
                await this.updateSegmentsByIdsInternal(Array.from(affectedSegmentIds));
            }
        });
    }

    private computeSegmentWidth(model: Segment, effectiveRoadType: number): number {
        const { roadType: initialRoadType, isTwoWay, fromLanesInfo, toLanesInfo, isAtoB } = model;
        if (!this.prefRealSize) {
            return this.streetStyles[effectiveRoadType]?.strokeWidth ?? 0;
        }

        const defaultLaneWidth = this.defaultLaneWidthMeters[initialRoadType] ?? 3.5;
        let segmentWidthFrom = defaultLaneWidth;
        if (fromLanesInfo) {
            segmentWidthFrom = fromLanesInfo.laneWidth
                ? fromLanesInfo.numberOfLanes * (this.isImperial ? Utils.feetToMeters(fromLanesInfo.laneWidth) : fromLanesInfo.laneWidth)
                : fromLanesInfo.numberOfLanes * defaultLaneWidth;
        }

        let segmentWidthTo = defaultLaneWidth;
        if (toLanesInfo) {
            segmentWidthTo = toLanesInfo.laneWidth
                ? toLanesInfo.numberOfLanes * (this.isImperial ? Utils.feetToMeters(toLanesInfo.laneWidth) : toLanesInfo.laneWidth)
                : toLanesInfo.numberOfLanes * defaultLaneWidth;
        }

        if (!isTwoWay) {
            return isAtoB ? segmentWidthFrom : segmentWidthTo;
        }
        if (segmentWidthTo !== segmentWidthFrom) {
            return segmentWidthFrom + segmentWidthTo;
        }
        return segmentWidthFrom ? segmentWidthFrom * 2.0 : 0;
    }

    private buildSpeedLimitFeatures(
        model: Segment,
        totalSegmentWidth: number,
        isBridge: boolean,
        baselevel: number
    ): SdkFeature<LineString>[] {
        const { id, fwdSpeedLimit, revSpeedLimit, isTwoWay, isBtoA } = model;
        const features: SdkFeature<LineString>[] = [];

        if (
            !this.prefShowSLSingleColor &&
            (fwdSpeedLimit || revSpeedLimit) &&
            fwdSpeedLimit !== revSpeedLimit &&
            isTwoWay
        ) {
            if (this.prefRealSize) {
                const offset = (isBridge
                    ? (totalSegmentWidth * 0.17)
                    : (totalSegmentWidth * 0.1915)) / 0.44799999999906703;

                // Positive offset shifts left of travel direction; negative shifts right
                const fwdSpeedFeature = lineOffset(model.geometry, offset, { units: 'meters' });
                const revSpeedFeature = lineOffset(model.geometry, -offset, { units: 'meters' });

                features.push({
                    type: 'Feature',
                    id: `${id}_sl_l`,
                    geometry: fwdSpeedFeature.geometry,
                    properties: {
                        'color': this.getColorStringFromSpeed(fwdSpeedLimit),
                        'width': isBridge ? totalSegmentWidth * 0.1 : totalSegmentWidth * 0.2,
                        'dash': 'solid',
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 115,
                    },
                });

                features.push({
                    type: 'Feature',
                    id: `${id}_sl_r`,
                    geometry: revSpeedFeature.geometry,
                    properties: {
                        'color': this.getColorStringFromSpeed(revSpeedLimit),
                        'width': isBridge ? totalSegmentWidth * 0.1 : totalSegmentWidth * 0.2,
                        'dash': 'solid',
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 115,
                    },
                });
            } else {
                if (fwdSpeedLimit) {
                    features.push({
                        type: 'Feature',
                        id: `${id}_sl_f`,
                        geometry: model.geometry,
                        properties: {
                            'color': this.getColorStringFromSpeed(fwdSpeedLimit),
                            'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                            'dash': 'solid',
                            'closeZoomOnly': 1,
                            'zIndex': baselevel + 115,
                        },
                    });
                }
                if (revSpeedLimit) {
                    features.push({
                        type: 'Feature',
                        id: `${id}_sl_rv`,
                        geometry: model.geometry,
                        properties: {
                            'color': this.getColorStringFromSpeed(revSpeedLimit),
                            'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                            'dash': 'dash',
                            'closeZoomOnly': 1,
                            'zIndex': baselevel + 116,
                        },
                    });
                }
            }
        } else {
            const speedValue = !isTwoWay && isBtoA ? revSpeedLimit : fwdSpeedLimit;
            if (speedValue) {
                features.push({
                    type: 'Feature',
                    id: `${id}_sl`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.getColorStringFromSpeed(speedValue),
                        'width': isBridge ? totalSegmentWidth * 0.8 : totalSegmentWidth,
                        'dash': 'solid',
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 115,
                    },
                });
            }
        }

        return features;
    }

    private buildArrowFeatures(
        model: Segment,
        isInRoundabout: boolean,
        baselevel: number,
        labels: SdkFeature<Point>[]
    ): SdkFeature<Point>[] {
        const arrows: SdkFeature<Point>[] = [];
        if (model.isTwoWay) {
            return arrows;
        }

        const arrowSamples = this.sampleArrowPointsAlongSegment(
            model.geometry.coordinates,
            isInRoundabout,
            labels
        );

        if (!model.isAtoB && !model.isBtoA && model.isDrivable) {
            for (let i = 0; i < arrowSamples.length; i++) {
                const sample = arrowSamples[i];
                arrows.push({
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
                });
            }
        } else {
            for (let i = 0; i < arrowSamples.length; i++) {
                const sample = arrowSamples[i];
                const degrees = this.getAngleDegreesSDK(
                    model.isAtoB,
                    sample.p0,
                    sample.p1
                );

                arrows.push({
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
                });
            }
        }

        return arrows;
    }

    private getEffectiveRoadType(model: Segment): number {
        if (
            model.primaryStreetId !== null &&
            this.mediator.isRoutingModeActive() &&
            model.routingRoadType !== null
        ) {
            return model.routingRoadType;
        }
        return model.roadType;
    }

    private async buildSegmentRenderResult(
        model: Segment,
        userRank: number | undefined,
        ownedLabels: SdkFeature<Point>[],
        chainLabelsForArrowAvoidance: SdkFeature<Point>[],
    ): Promise<SegmentRenderResult> {
        const {
            id,
            elevationLevel,
            fwdSpeedLimit,
            revSpeedLimit,
            isTwoWay,
            isAtoB,
            isBtoA,
            lockRank,
            flagAttributes,
            hasClosures,
            hasRestrictions,
            toNodeLanesCount,
            fromNodeLanesCount,
            primaryStreetId,
        } = model;

        this.mediator.debugLog(`Drawing segment: ${id}`);

        const roadType = this.getEffectiveRoadType(model);
        const totalSegmentWidth = this.computeSegmentWidth(model, roadType);

        if (primaryStreetId === null) {
            return {
                segmentId: id,
                hasClosures: false,
                segments: [{
                    type: 'Feature',
                    id: `${id}_red`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefRedStyle.strokeColor,
                        'width': totalSegmentWidth,
                        'dash': this.prefRedStyle.strokeDashstyle,
                    },
                }],
                arrows: [],
                icons: [],
                labels: [],
            };
        }

        const segmentFeatures: SdkFeature<LineString>[] = [];
        const iconFeatures: SdkFeature<Point>[] = [];
        let arrowFeatures: SdkFeature<Point>[] = [];

        if (this.streetStyles[roadType] !== undefined) {
            const geometryPointArray = model.geometry.coordinates;
            const baselevel = (elevationLevel ?? 0) * 100;
            const isInRoundabout = model.junctionId !== null;
            const speed = fwdSpeedLimit ?? revSpeedLimit;
            let isBridge = false;
            let roadWidth = totalSegmentWidth;

            if (elevationLevel && elevationLevel > 0) {
                isBridge = true;
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_br`,
                    geometry: model.geometry,
                    properties: {
                        'color': '#000000',
                        'zIndex': baselevel + 100,
                        'width': totalSegmentWidth,
                    },
                });
            }

            const hasSpeedLimitDrawn = Boolean(speed) && this.prefShowSLColor;
            if (hasSpeedLimitDrawn && isBridge) {
                roadWidth = totalSegmentWidth * 0.56;
            } else if (isBridge || hasSpeedLimitDrawn) {
                roadWidth = totalSegmentWidth * 0.68;
            }

            if (hasSpeedLimitDrawn) {
                segmentFeatures.push(
                    ...this.buildSpeedLimitFeatures(model, totalSegmentWidth, isBridge, baselevel)
                );
            }

            // Base road stroke
            segmentFeatures.push({
                type: 'Feature',
                id: `${id}_rd`,
                geometry: model.geometry,
                properties: {
                    'color': this.streetStyles[roadType].strokeColor,
                    'width': roadWidth,
                    'dash': this.streetStyles[roadType].strokeDashstyle,
                    'zIndex': baselevel + 120,
                },
            });

            if (elevationLevel && elevationLevel < 0) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_tun`,
                    geometry: model.geometry,
                    properties: {
                        'color': '#000000',
                        'width': roadWidth,
                        'opacity': 0.3,
                        'zIndex': baselevel + 125,
                    },
                });
            }

            const currentLock = (lockRank ?? 0) + 1;
            if (
                currentLock > this.prefFakelock ||
                (typeof userRank === 'number' && currentLock > userRank + 1)
            ) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_lk`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.nonEditableStyle.strokeColor,
                        'width': roadWidth * 0.1,
                        'dash': this.nonEditableStyle.strokeDashstyle,
                        'zIndex': baselevel + 147,
                    },
                });
            }

            if (flagAttributes.unpaved) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_unp`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefDirtyStyle.strokeColor,
                        'width': roadWidth * 0.7,
                        'opacity': this.prefDirtyStyle.strokeOpacity,
                        'dash': this.prefDirtyStyle.strokeDashstyle,
                        'zIndex': baselevel + 135,
                    },
                });
            }

            if (hasClosures) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_cl`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefClosureStyle.strokeColor,
                        'width': roadWidth * 0.6,
                        'dash': this.prefClosureStyle.strokeDashstyle,
                        'opacity': this.prefClosureStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 140,
                    },
                });
            }

            if (model.isDrivable) {
                try {
                    if (await this.mediator.wmeSDK.DataModel.Segments.isTollSegment({ segmentId: id })) {
                        segmentFeatures.push({
                            type: 'Feature',
                            id: `${id}_tl`,
                            geometry: model.geometry,
                            properties: {
                                'color': this.prefTollStyle.strokeColor,
                                'width': roadWidth * 0.3,
                                'dash': this.prefTollStyle.strokeDashstyle,
                                'opacity': this.prefTollStyle.strokeOpacity,
                                'zIndex': baselevel + 145,
                            },
                        });
                    }
                } catch {
                    // Ignore DataModelNotFoundError if segment disappeared mid-render
                }
            }

            if (isInRoundabout) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_ra`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.roundaboutStyle.strokeColor,
                        'width': roadWidth * 0.15,
                        'dash': this.roundaboutStyle.strokeDashstyle,
                        'opacity': this.roundaboutStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 150,
                    },
                });
            }

            if (hasRestrictions) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_res`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefRestrictionStyle.strokeColor,
                        'width': roadWidth * 0.4,
                        'dash': this.prefRestrictionStyle.strokeDashstyle,
                        'opacity': this.prefRestrictionStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 155,
                    },
                });
            }

            if (flagAttributes.headlights) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_hl`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefHeadlightsStyle.strokeColor,
                        'width': roadWidth * 0.2,
                        'dash': this.prefHeadlightsStyle.strokeDashstyle,
                        'opacity': this.prefHeadlightsStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 165,
                    },
                });
            }

            if (flagAttributes.nearbyHOV) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_hov`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.prefNearbyHOVStyle.strokeColor,
                        'width': roadWidth * 0.25,
                        'dash': this.prefNearbyHOVStyle.strokeDashstyle,
                        'opacity': this.prefNearbyHOVStyle.strokeOpacity,
                        'closeZoomOnly': 1,
                        'zIndex': baselevel + 166,
                    },
                });
            }

            // In WME SDK, `fromNodeLanesCount` is traffic originating from `fromNode` (A -> B, approaching `coordinates[len - 1]`),
            // while `toNodeLanesCount` is traffic originating from `toNode` (B -> A, approaching `coordinates[0]`).
            if (geometryPointArray.length >= 2) {
                const len = geometryPointArray.length;
                if (toNodeLanesCount > 0) {
                    const res = [
                        geometryPointArray[0],
                        this.getCentroid(geometryPointArray[0], geometryPointArray[1]),
                    ];
                    segmentFeatures.push({
                        type: 'Feature',
                        id: `${id}_ln_to`,
                        geometry: { type: 'LineString', coordinates: res },
                        properties: {
                            'color': this.prefLanesStyle.strokeColor,
                            'width': roadWidth * 0.3,
                            'dash': this.prefLanesStyle.strokeDashstyle,
                            'opacity': this.prefLanesStyle.strokeOpacity,
                            'closeZoomOnly': 1,
                            'zIndex': baselevel + 170,
                        },
                    });
                }

                if (fromNodeLanesCount > 0) {
                    const res = [
                        this.getCentroid(geometryPointArray[len - 2], geometryPointArray[len - 1]),
                        geometryPointArray[len - 1],
                    ];
                    segmentFeatures.push({
                        type: 'Feature',
                        id: `${id}_ln_fr`,
                        geometry: { type: 'LineString', coordinates: res },
                        properties: {
                            'color': this.prefLanesStyle.strokeColor,
                            'width': roadWidth * 0.3,
                            'dash': this.prefLanesStyle.strokeDashstyle,
                            'opacity': this.prefLanesStyle.strokeOpacity,
                            'closeZoomOnly': 1,
                            'zIndex': baselevel + 175,
                        },
                    });
                }

                if (flagAttributes.fwdSpeedCamera && (isAtoB || isTwoWay)) {
                    iconFeatures.push(
                        this.createAverageSpeedCameraSDK({
                            id,
                            rev: false,
                            p0: geometryPointArray[0],
                            p1: geometryPointArray[1],
                        })
                    );
                }

                if (flagAttributes.revSpeedCamera && (isBtoA || isTwoWay)) {
                    iconFeatures.push(
                        this.createAverageSpeedCameraSDK({
                            id,
                            rev: true,
                            p0: geometryPointArray[len - 1],
                            p1: geometryPointArray[len - 2],
                        })
                    );
                }
            }

            arrowFeatures = this.buildArrowFeatures(model, isInRoundabout, baselevel, chainLabelsForArrowAvoidance);

            if (flagAttributes.tunnel) {
                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_tf1`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.tunnelFlagStyle1.strokeColor,
                        'opacity': this.tunnelFlagStyle1.strokeOpacity,
                        'width': roadWidth * 0.3,
                        'dash': this.tunnelFlagStyle1.strokeDashstyle,
                        'zIndex': baselevel + 177,
                    },
                });

                segmentFeatures.push({
                    type: 'Feature',
                    id: `${id}_tf2`,
                    geometry: model.geometry,
                    properties: {
                        'color': this.tunnelFlagStyle2.strokeColor,
                        'width': roadWidth * 0.1,
                        'dash': this.tunnelFlagStyle2.strokeDashstyle,
                        'zIndex': baselevel + 177,
                    },
                });
            }
        }

        return {
            segmentId: id,
            hasClosures: Boolean(hasClosures),
            segments: segmentFeatures,
            arrows: arrowFeatures,
            icons: iconFeatures,
            labels: ownedLabels,
        };
    }

    private computeSegmentLabelDescriptor(
        sdkSegment: Segment,
        streetsMap: Map<number, Street>,
        roadType: number = sdkSegment.roadType
    ): SegmentLabelDescriptor | null {
        if (sdkSegment.primaryStreetId === null || sdkSegment.geometry.coordinates.length < 2) {
            return null;
        }

        const primaryStreet = streetsMap.get(sdkSegment.primaryStreetId);
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

        // Add alternative street names
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
            }
        }

        const labelText = `${streetPart} ${speedPart}`;
        if (labelText === ' ') {
            return null;
        }

        const isOneWay = !sdkSegment.isTwoWay && (sdkSegment.isAtoB || sdkSegment.isBtoA);
        const hasDirectionArrow = isOneWay && streetPart !== '';
        const groupKey = `${hasDirectionArrow ? 1 : 0}\0${labelText}\0${altStreetPart}`;

        return {
            segment: sdkSegment,
            roadType,
            streetPart,
            altStreetPart,
            labelText,
            hasDirectionArrow,
            groupKey,
        };
    }

    private computeUnitTangent(from: MercatorPoint, to: MercatorPoint): MercatorPoint {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        if (len <= 0) {
            return { x: 1, y: 0 };
        }
        return { x: dx / len, y: dy / len };
    }

    private buildChainEdge(desc: SegmentLabelDescriptor): ChainEdge {
        const { segment, roadType, hasDirectionArrow } = desc;
        const coords = segment.geometry.coordinates;
        const n = coords.length;
        const reverseForOneWayFlow = hasDirectionArrow && segment.isBtoA && !segment.isAtoB;

        const mercatorPoints: MercatorPoint[] = new Array(n);
        if (reverseForOneWayFlow) {
            for (let i = 0; i < n; i++) {
                const c = coords[n - 1 - i];
                mercatorPoints[i] = Utils.lonLatToMercator(c[0], c[1]);
            }
        } else {
            for (let i = 0; i < n; i++) {
                const c = coords[i];
                mercatorPoints[i] = Utils.lonLatToMercator(c[0], c[1]);
            }
        }

        let lengthMeters = 0;
        for (let i = 0; i < n - 1; i++) {
            lengthMeters += Math.hypot(
                mercatorPoints[i + 1].x - mercatorPoints[i].x,
                mercatorPoints[i + 1].y - mercatorPoints[i].y
            );
        }

        let startRefIdx = 1;
        while (
            startRefIdx < n - 1 &&
            Math.hypot(
                mercatorPoints[startRefIdx].x - mercatorPoints[0].x,
                mercatorPoints[startRefIdx].y - mercatorPoints[0].y
            ) < 1e-3
        ) {
            startRefIdx++;
        }
        const startTangent = this.computeUnitTangent(mercatorPoints[0], mercatorPoints[startRefIdx]);

        let endRefIdx = n - 2;
        while (
            endRefIdx > 0 &&
            Math.hypot(
                mercatorPoints[n - 1].x - mercatorPoints[endRefIdx].x,
                mercatorPoints[n - 1].y - mercatorPoints[endRefIdx].y
            ) < 1e-3
        ) {
            endRefIdx--;
        }
        const endTangent = this.computeUnitTangent(mercatorPoints[endRefIdx], mercatorPoints[n - 1]);

        const [rawStartNodeKey, rawEndNodeKey] = this.getRawSegmentNodeKeys(segment);

        return {
            segment,
            roadType,
            startNodeKey: reverseForOneWayFlow ? rawEndNodeKey : rawStartNodeKey,
            endNodeKey: reverseForOneWayFlow ? rawStartNodeKey : rawEndNodeKey,
            mercatorPoints,
            lengthMeters,
            startTangent,
            endTangent,
        };
    }

    private buildLabelChains(edges: ChainEdge[], directedFlow: boolean): OrientedChainItem[][] {
        const m = edges.length;
        if (m === 0) return [];
        if (m === 1) return [[{ edgeIdx: 0, reversed: false }]];

        const edgesByStartNode = new Map<string, number[]>();
        const edgesByEndNode = new Map<string, number[]>();

        for (let i = 0; i < m; i++) {
            const e = edges[i];
            let sList = edgesByStartNode.get(e.startNodeKey);
            if (!sList) {
                sList = [];
                edgesByStartNode.set(e.startNodeKey, sList);
            }
            sList.push(i);

            let eList = edgesByEndNode.get(e.endNodeKey);
            if (!eList) {
                eList = [];
                edgesByEndNode.set(e.endNodeKey, eList);
            }
            eList.push(i);
        }

        const getStartNode = (item: OrientedChainItem): string =>
            item.reversed ? edges[item.edgeIdx].endNodeKey : edges[item.edgeIdx].startNodeKey;
        const getEndNode = (item: OrientedChainItem): string =>
            item.reversed ? edges[item.edgeIdx].startNodeKey : edges[item.edgeIdx].endNodeKey;
        const getStartTangent = (edgeIdx: number, reversed: boolean): MercatorPoint => {
            const e = edges[edgeIdx];
            return reversed
                ? { x: -e.endTangent.x, y: -e.endTangent.y }
                : e.startTangent;
        };
        const getEndTangent = (edgeIdx: number, reversed: boolean): MercatorPoint => {
            const e = edges[edgeIdx];
            return reversed
                ? { x: -e.startTangent.x, y: -e.startTangent.y }
                : e.endTangent;
        };

        // Seed chains from longest segments first so main road trunks assemble cleanly across branches
        const seedOrder = Array.from({ length: m }, (_, i) => i).sort(
            (a, b) => edges[b].lengthMeters - edges[a].lengthMeters
        );

        const visited = new Uint8Array(m);
        const chains: OrientedChainItem[][] = [];
        // Minimum dot product (-0.5 = 120° max turn) avoids folding a label across opposite dual-carriageways at a U-turn node
        const MIN_CONTINUATION_COS = -0.5;

        for (let s = 0; s < m; s++) {
            const seedIdx = seedOrder[s];
            if (visited[seedIdx]) continue;
            visited[seedIdx] = 1;

            const chain: OrientedChainItem[] = [{ edgeIdx: seedIdx, reversed: false }];

            // Extend forward from tail
            while (true) {
                const tailItem = chain[chain.length - 1];
                const tailNode = getEndNode(tailItem);
                const inDir = getEndTangent(tailItem.edgeIdx, tailItem.reversed);
                const tailRoadType = edges[tailItem.edgeIdx].roadType;

                let bestCandidate: OrientedChainItem | null = null;
                let bestCos = MIN_CONTINUATION_COS;
                let bestSameRoadType = false;
                let bestLen = -1;

                const considerForward = (candIdx: number, reversed: boolean) => {
                    if (visited[candIdx]) return;
                    const outDir = getStartTangent(candIdx, reversed);
                    const cos = inDir.x * outDir.x + inDir.y * outDir.y;
                    if (cos < MIN_CONTINUATION_COS) return;
                    const sameRoadType = edges[candIdx].roadType === tailRoadType;
                    const candLen = edges[candIdx].lengthMeters;
                    if (
                        bestCandidate === null ||
                        cos > bestCos + 1e-4 ||
                        (Math.abs(cos - bestCos) <= 1e-4 &&
                            ((sameRoadType && !bestSameRoadType) ||
                                (sameRoadType === bestSameRoadType && candLen > bestLen)))
                    ) {
                        bestCandidate = { edgeIdx: candIdx, reversed };
                        bestCos = cos;
                        bestSameRoadType = sameRoadType;
                        bestLen = candLen;
                    }
                };

                const forwardStarts = edgesByStartNode.get(tailNode);
                if (forwardStarts) {
                    for (let i = 0; i < forwardStarts.length; i++) {
                        considerForward(forwardStarts[i], false);
                    }
                }
                if (!directedFlow) {
                    const reverseEnds = edgesByEndNode.get(tailNode);
                    if (reverseEnds) {
                        for (let i = 0; i < reverseEnds.length; i++) {
                            const idx = reverseEnds[i];
                            if (edges[idx].startNodeKey !== edges[idx].endNodeKey) {
                                considerForward(idx, true);
                            }
                        }
                    }
                }

                if (!bestCandidate) break;
                const chosen: OrientedChainItem = bestCandidate;
                visited[chosen.edgeIdx] = 1;
                chain.push(chosen);
            }

            // Extend backward from head
            while (true) {
                const headItem = chain[0];
                const headNode = getStartNode(headItem);
                const outDir = getStartTangent(headItem.edgeIdx, headItem.reversed);
                const headRoadType = edges[headItem.edgeIdx].roadType;

                let bestCandidate: OrientedChainItem | null = null;
                let bestCos = MIN_CONTINUATION_COS;
                let bestSameRoadType = false;
                let bestLen = -1;

                const considerBackward = (candIdx: number, reversed: boolean) => {
                    if (visited[candIdx]) return;
                    const inDir = getEndTangent(candIdx, reversed);
                    const cos = inDir.x * outDir.x + inDir.y * outDir.y;
                    if (cos < MIN_CONTINUATION_COS) return;
                    const sameRoadType = edges[candIdx].roadType === headRoadType;
                    const candLen = edges[candIdx].lengthMeters;
                    if (
                        bestCandidate === null ||
                        cos > bestCos + 1e-4 ||
                        (Math.abs(cos - bestCos) <= 1e-4 &&
                            ((sameRoadType && !bestSameRoadType) ||
                                (sameRoadType === bestSameRoadType && candLen > bestLen)))
                    ) {
                        bestCandidate = { edgeIdx: candIdx, reversed };
                        bestCos = cos;
                        bestSameRoadType = sameRoadType;
                        bestLen = candLen;
                    }
                };

                const backwardEnds = edgesByEndNode.get(headNode);
                if (backwardEnds) {
                    for (let i = 0; i < backwardEnds.length; i++) {
                        considerBackward(backwardEnds[i], false);
                    }
                }
                if (!directedFlow) {
                    const reverseStarts = edgesByStartNode.get(headNode);
                    if (reverseStarts) {
                        for (let i = 0; i < reverseStarts.length; i++) {
                            const idx = reverseStarts[i];
                            if (edges[idx].startNodeKey !== edges[idx].endNodeKey) {
                                considerBackward(idx, true);
                            }
                        }
                    }
                }

                if (!bestCandidate) break;
                const chosen: OrientedChainItem = bestCandidate;
                visited[chosen.edgeIdx] = 1;
                chain.unshift(chosen);
            }

            chains.push(chain);
        }

        return chains;
    }

    private pointToPolylineSqDist(px: number, py: number, pts: MercatorPoint[]): number {
        let minSqDist = Infinity;
        for (let i = 0; i < pts.length - 1; i++) {
            const ax = pts[i].x;
            const ay = pts[i].y;
            const bx = pts[i + 1].x;
            const by = pts[i + 1].y;
            const dx = bx - ax;
            const dy = by - ay;
            const lenSq = dx * dx + dy * dy;
            let cx = ax;
            let cy = ay;
            if (lenSq > 0) {
                const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
                cx += dx * t;
                cy += dy * t;
            }
            const ddx = px - cx;
            const ddy = py - cy;
            const sqDist = ddx * ddx + ddy * ddy;
            if (sqDist < minSqDist) {
                minSqDist = sqDist;
            }
        }
        return minSqDist;
    }

    private getRawSegmentNodeKeys(segment: Segment): [string, string] {
        const coords = segment.geometry.coordinates;
        const n = coords.length;
        const startKey = segment.fromNodeId !== null
            ? `n:${segment.fromNodeId}`
            : `c:${coords[0][0].toFixed(6)},${coords[0][1].toFixed(6)}`;
        const endKey = segment.toNodeId !== null
            ? `n:${segment.toNodeId}`
            : `c:${coords[n - 1][0].toFixed(6)},${coords[n - 1][1].toFixed(6)}`;
        return [startKey, endKey];
    }

    /**
     * 2D Separating Axis Theorem (SAT) overlap score between two oriented label boxes in EPSG:3857 units.
     * Returns 0 when disjoint, or the geometric-mean penetration depth (> 0) when overlapping.
     */
    private computeLabelObbPenetration(a: PlacedLabelBox, b: PlacedLabelBox): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const maxR = a.halfLen + a.halfHeight + b.halfLen + b.halfHeight;
        if (Math.abs(dx) > maxR || Math.abs(dy) > maxR) {
            return 0;
        }

        const dotUU = Math.abs(a.ux * b.ux + a.uy * b.uy);
        const dotUV = Math.abs(a.ux * b.uy - a.uy * b.ux);

        const ov1 = a.halfLen + b.halfLen * dotUU + b.halfHeight * dotUV - Math.abs(dx * a.ux + dy * a.uy);
        if (ov1 <= 0) return 0;

        const ov2 = a.halfHeight + b.halfLen * dotUV + b.halfHeight * dotUU - Math.abs(-dx * a.uy + dy * a.ux);
        if (ov2 <= 0) return 0;

        const ov3 = b.halfLen + a.halfLen * dotUU + a.halfHeight * dotUV - Math.abs(dx * b.ux + dy * b.uy);
        if (ov3 <= 0) return 0;

        const ov4 = b.halfHeight + a.halfLen * dotUV + a.halfHeight * dotUU - Math.abs(-dx * b.uy + dy * b.ux);
        if (ov4 <= 0) return 0;

        return Math.sqrt(Math.min(ov1 * ov2, ov3 * ov4));
    }

    /**
     * Computes street & speed labels across `segments` by merging connected segments
     * (regardless of turn permissions) that share the same label text into continuous
     * geometric polylines, then resolving multi-segment crossing overlaps via
     * intersection-aware sliding and 2D Oriented Bounding Box (OBB) de-confliction.
     */
    private drawLabels(
        segments: Segment[],
        streetsMap: Map<number, Street>,
        allContextSegments: Segment[] = segments
    ): {
        ownedLabelsBySegment: Map<number, SdkFeature<Point>[]>;
        chainLabelsBySegment: Map<number, SdkFeature<Point>[]>;
        placedBoxesBySegment: Map<number, PlacedLabelBox[]>;
        chainPeersBySegment: Map<number, number[]>;
    } {
        const ownedLabelsBySegment = new Map<number, SdkFeature<Point>[]>();
        const chainLabelsBySegment = new Map<number, SdkFeature<Point>[]>();
        const placedBoxesBySegment = new Map<number, PlacedLabelBox[]>();
        const chainPeersBySegment = new Map<number, number[]>();
        const groups = new Map<string, SegmentLabelDescriptor[]>();

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const desc = this.computeSegmentLabelDescriptor(seg, streetsMap, this.getEffectiveRoadType(seg));
            if (!desc) continue;

            let group = groups.get(desc.groupKey);
            if (!group) {
                group = [];
                groups.set(desc.groupKey, group);
            }
            group.push(desc);
        }

        const mergeConnected = this.prefMergeConnectedLabels;
        const nodeDegree = new Map<string, number>();
        if (mergeConnected) {
            for (let i = 0; i < allContextSegments.length; i++) {
                const seg = allContextSegments[i];
                if (!seg || seg.geometry.coordinates.length < 2) continue;
                const [k0, k1] = this.getRawSegmentNodeKeys(seg);
                nodeDegree.set(k0, (nodeDegree.get(k0) ?? 0) + 1);
                nodeDegree.set(k1, (nodeDegree.get(k1) ?? 0) + 1);
            }
        }

        type ChainContext = {
            edges: ChainEdge[];
            chain: OrientedChainItem[];
            groupKey: string;
            streetPart: string;
            altStreetPart: string;
            labelText: string;
            hasDirectionArrow: boolean;
            maxLabels: number;
            maxZoomRank: number;
            acceptedCount: number;
            singleEdge: ChainEdge | null;
            singleFlowForward: boolean;
            chainLabels: SdkFeature<Point>[];
        };

        type PendingLabelSpan = {
            chainCtx: ChainContext;
            rankInChain: number;
            p0: MercatorPoint;
            pNext: MercatorPoint;
            distance: number;
            ux: number;
            uy: number;
            seqIndex: number;
            visualHalfLen: number;
            visualHalfHeight: number;
            closeHalfLen: number;
            slack: number;
            crossings: { offset: number; nodeKey: string }[];
            isUnnamed: boolean;
        };

        const pendingSpans: PendingLabelSpan[] = [];
        const joinNodeSpanCount = new Map<string, number>();
        const fontSize = this.prefCloseZoomLabelSize;
        const outlineWidth = this.prefLabelOutlineWidth;
        const lineHeightPx = Math.ceil(fontSize * 1.2);
        // EPSG:3857 Mercator units per pixel at zoom ~18.4 (0.45) and zoom 19 (0.30)
        const OBB_MERCATOR_PER_PX = 0.45;
        const CLOSE_MERCATOR_PER_PX = 0.30;

        for (const groupDescriptors of groups.values()) {
            const { groupKey, streetPart, altStreetPart, labelText, hasDirectionArrow } = groupDescriptors[0];
            const isUnnamed = streetPart === '' || streetPart === '⚑';
            const edges = groupDescriptors.map(d => this.buildChainEdge(d));
            const chains: OrientedChainItem[][] = mergeConnected
                ? this.buildLabelChains(edges, hasDirectionArrow)
                : edges.map((_, idx) => [{ edgeIdx: idx, reversed: false }]);
            const requiredSpace = this.clutterConstant * Math.max(labelText.length, altStreetPart.length);
            const minSubSpan = Math.max(requiredSpace * 1.25, 220);

            // Compute exact SVG pixel dimensions for this group's label text
            const sampleText = (hasDirectionArrow ? ` ▶ ${labelText} ▶ ` : labelText) + altStreetPart;
            const textLines = sampleText.split('\n');
            let maxLineChars = 0;
            for (let l = 0; l < textLines.length; l++) {
                if (textLines[l].length > maxLineChars) {
                    maxLineChars = textLines[l].length;
                }
            }
            const widthPx = Math.ceil(maxLineChars * fontSize * 0.8 + outlineWidth * 2 + 12);
            const heightPx = Math.ceil(textLines.length * lineHeightPx + outlineWidth * 2 + 8);
            const rawHalfLen = widthPx * 0.5 * OBB_MERCATOR_PER_PX;
            const closeHalfLen = widthPx * 0.5 * CLOSE_MERCATOR_PER_PX;
            const visualHalfHeight = heightPx * 0.5 * OBB_MERCATOR_PER_PX + 2.5;

            for (let c = 0; c < chains.length; c++) {
                const chain = chains[c];
                if (chain.length > 1) {
                    const chainSegmentIds = chain.map(item => edges[item.edgeIdx].segment.id);
                    for (let j = 0; j < chainSegmentIds.length; j++) {
                        chainPeersBySegment.set(chainSegmentIds[j], chainSegmentIds);
                    }
                }

                const mergedMercator: MercatorPoint[] = [];
                const chainCrossings: { nodeKey: string; pt: MercatorPoint }[] = [];

                for (let j = 0; j < chain.length; j++) {
                    const { edgeIdx, reversed } = chain[j];
                    const edge = edges[edgeIdx];
                    const pts = edge.mercatorPoints;
                    if (!reversed) {
                        for (let k = 0; k < pts.length; k++) {
                            const pt = pts[k];
                            const prev = mergedMercator[mergedMercator.length - 1];
                            if (!prev || Math.abs(pt.x - prev.x) > 1e-3 || Math.abs(pt.y - prev.y) > 1e-3) {
                                mergedMercator.push(pt);
                            }
                        }
                    } else {
                        for (let k = pts.length - 1; k >= 0; k--) {
                            const pt = pts[k];
                            const prev = mergedMercator[mergedMercator.length - 1];
                            if (!prev || Math.abs(pt.x - prev.x) > 1e-3 || Math.abs(pt.y - prev.y) > 1e-3) {
                                mergedMercator.push(pt);
                            }
                        }
                    }

                    if (mergeConnected && j < chain.length - 1) {
                        const joinNodeKey = reversed ? edge.startNodeKey : edge.endNodeKey;
                        if ((nodeDegree.get(joinNodeKey) ?? 0) >= 3) {
                            const joinPt = reversed ? pts[0] : pts[pts.length - 1];
                            chainCrossings.push({ nodeKey: joinNodeKey, pt: joinPt });
                        }
                    }
                }

                const simplified = Utils.simplifyMercatorPoints(mergedMercator, 7);
                if (simplified.length < 2) {
                    continue;
                }

                let totalSimplifiedLen = 0;
                const rawSpanLengths = new Array<number>(simplified.length - 1);
                for (let p = 0; p < simplified.length - 1; p++) {
                    const ptA = simplified[p];
                    const ptB = simplified[p + 1];
                    const d = Math.hypot(ptA.x - ptB.x, ptA.y - ptB.y);
                    rawSpanLengths[p] = d;
                    totalSimplifiedLen += d;
                }
                const halfChainLen = totalSimplifiedLen * 0.5;

                const spans: {
                    p0: MercatorPoint;
                    pNext: MercatorPoint;
                    distance: number;
                    seqIndex: number;
                    distFromCenter: number;
                }[] = [];

                let seqIndex = 0;
                let cumLen = 0;
                for (let p = 0; p < simplified.length - 1; p++) {
                    const ptA = simplified[p];
                    const ptB = simplified[p + 1];
                    const segDist = rawSpanLengths[p];
                    const chunks = (!mergeConnected || streetPart === '')
                        ? 1
                        : Math.max(1, Math.floor(segDist / minSubSpan));
                    if (chunks === 1) {
                        spans.push({
                            p0: ptA,
                            pNext: ptB,
                            distance: segDist,
                            seqIndex: seqIndex++,
                            distFromCenter: Math.abs(cumLen + segDist * 0.5 - halfChainLen),
                        });
                    } else {
                        const subDist = segDist / chunks;
                        for (let k = 0; k < chunks; k++) {
                            const t0 = k / chunks;
                            const t1 = (k + 1) / chunks;
                            spans.push({
                                p0: {
                                    x: ptA.x + (ptB.x - ptA.x) * t0,
                                    y: ptA.y + (ptB.y - ptA.y) * t0,
                                },
                                pNext: {
                                    x: ptA.x + (ptB.x - ptA.x) * t1,
                                    y: ptA.y + (ptB.y - ptA.y) * t1,
                                },
                                distance: subDist,
                                seqIndex: seqIndex++,
                                distFromCenter: Math.abs(cumLen + (k + 0.5) * subDist - halfChainLen),
                            });
                        }
                    }
                    cumLen += segDist;
                }

                // Sort spans by length descending, breaking equal-length ties from the chain's center outward
                spans.sort((a, b) => {
                    if (Math.abs(a.distance - b.distance) > 1e-6) {
                        return b.distance - a.distance;
                    }
                    return a.distFromCenter - b.distFromCenter;
                });

                const maxLabels = streetPart === '' ? 1 : spans.length;
                const acceptedSpans: typeof spans = [];
                for (let i = 0; i < spans.length && acceptedSpans.length < maxLabels; i++) {
                    if (spans[i].distance < (i > 0 ? requiredSpace : requiredSpace - 30) || spans[i].distance < 1) {
                        break;
                    }
                    acceptedSpans.push(spans[i]);
                }

                if (acceptedSpans.length === 0) {
                    continue;
                }

                const maxZoomRank = streetPart === ''
                    ? 1
                    : Math.min(4, Math.max(spans.length, Math.floor(totalSimplifiedLen / 150)));
                const chainLabels: SdkFeature<Point>[] = [];
                const singleEdge = chain.length === 1 ? edges[chain[0].edgeIdx] : null;
                const singleFlowForward = singleEdge
                    ? (hasDirectionArrow ? true : singleEdge.segment.isAtoB)
                    : true;

                const chainCtx: ChainContext = {
                    edges,
                    chain,
                    groupKey,
                    streetPart,
                    altStreetPart,
                    labelText,
                    hasDirectionArrow,
                    maxLabels,
                    maxZoomRank,
                    acceptedCount: acceptedSpans.length,
                    singleEdge,
                    singleFlowForward,
                    chainLabels,
                };

                for (let j = 0; j < chain.length; j++) {
                    chainLabelsBySegment.set(edges[chain[j].edgeIdx].segment.id, chainLabels);
                }

                for (let i = 0; i < acceptedSpans.length; i++) {
                    const { p0, pNext, distance, seqIndex: spanSeqIdx } = acceptedSpans[i];
                    const ux = (pNext.x - p0.x) / distance;
                    const uy = (pNext.y - p0.y) / distance;
                    const visualHalfLen = Math.min(distance * 0.46, Math.max(10, rawHalfLen));

                    const crossings: { offset: number; nodeKey: string }[] = [];
                    if (chainCrossings.length > 0) {
                        for (let k = 0; k < chainCrossings.length; k++) {
                            const { nodeKey, pt } = chainCrossings[k];
                            const proj = (pt.x - p0.x) * ux + (pt.y - p0.y) * uy;
                            if (proj <= 1 || proj >= distance - 1) continue;
                            const perp = Math.abs(-(pt.x - p0.x) * uy + (pt.y - p0.y) * ux);
                            if (perp <= 12) {
                                crossings.push({ offset: proj, nodeKey });
                            }
                        }
                        if (crossings.length > 1) {
                            crossings.sort((a, b) => a.offset - b.offset);
                        }
                        for (let k = 0; k < crossings.length; k++) {
                            const key = crossings[k].nodeKey;
                            joinNodeSpanCount.set(key, (joinNodeSpanCount.get(key) ?? 0) + 1);
                        }
                    }

                    pendingSpans.push({
                        chainCtx,
                        rankInChain: i,
                        p0,
                        pNext,
                        distance,
                        ux,
                        uy,
                        seqIndex: spanSeqIdx,
                        visualHalfLen,
                        visualHalfHeight,
                        closeHalfLen,
                        slack: distance - 2 * visualHalfLen,
                        crossings,
                        isUnnamed,
                    });
                }
            }
        }

        if (mergeConnected && pendingSpans.length > 1) {
            pendingSpans.sort((a, b) => {
                if (a.isUnnamed !== b.isUnnamed) {
                    return a.isUnnamed ? 1 : -1;
                }
                const aPrimary = a.rankInChain === 0 ? 0 : 1;
                const bPrimary = b.rankInChain === 0 ? 0 : 1;
                if (aPrimary !== bPrimary) {
                    return aPrimary - bPrimary;
                }
                if (Math.abs(a.slack - b.slack) > 1) {
                    return a.slack - b.slack;
                }
                return b.distance - a.distance;
            });
        }

        // 160m Web Mercator spatial hash grid for O(1) 2D OBB label queries
        const GRID_CELL_SIZE = 160;
        const GRID_OFFSET = 262144;
        const GRID_STRIDE = 1048576;
        const spatialGrid = new Map<number, PlacedLabelBox[]>();
        let queryId = 0;

        const insertBoxIntoGrid = (box: PlacedLabelBox): void => {
            const rx = Math.abs(box.ux) * box.halfLen + Math.abs(box.uy) * box.halfHeight;
            const ry = Math.abs(box.uy) * box.halfLen + Math.abs(box.ux) * box.halfHeight;
            const minCX = Math.floor((box.x - rx) / GRID_CELL_SIZE);
            const maxCX = Math.floor((box.x + rx) / GRID_CELL_SIZE);
            const minCY = Math.floor((box.y - ry) / GRID_CELL_SIZE);
            const maxCY = Math.floor((box.y + ry) / GRID_CELL_SIZE);
            for (let cx = minCX; cx <= maxCX; cx++) {
                const rowBase = (cx + GRID_OFFSET) * GRID_STRIDE;
                for (let cy = minCY; cy <= maxCY; cy++) {
                    const cellKey = rowBase + (cy + GRID_OFFSET);
                    let bucket = spatialGrid.get(cellKey);
                    if (!bucket) {
                        bucket = [];
                        spatialGrid.set(cellKey, bucket);
                    }
                    bucket.push(box);
                }
            }
        };

        if (mergeConnected && this.placedLabelBoxesBySegment.size > 0) {
            const batchIds = new Set<number>();
            for (let i = 0; i < segments.length; i++) {
                batchIds.add(segments[i].id);
            }
            for (const [segId, boxes] of this.placedLabelBoxesBySegment.entries()) {
                if (batchIds.has(segId)) continue;
                for (let i = 0; i < boxes.length; i++) {
                    const b = boxes[i];
                    b.lastQueryId = 0;
                    insertBoxIntoGrid(b);
                }
            }
        }

        const scratchBox: PlacedLabelBox = {
            x: 0,
            y: 0,
            ux: 1,
            uy: 0,
            halfLen: 0,
            halfHeight: 0,
            groupKey: '',
            lastQueryId: 0,
        };

        for (let idx = 0; idx < pendingSpans.length; idx++) {
            const span = pendingSpans[idx];
            const {
                chainCtx,
                rankInChain,
                p0,
                pNext,
                distance,
                ux,
                uy,
                seqIndex: spanSeqIdx,
                visualHalfLen,
                visualHalfHeight,
                closeHalfLen,
                crossings,
            } = span;
            const {
                edges,
                chain,
                groupKey,
                streetPart,
                altStreetPart,
                labelText,
                hasDirectionArrow,
                maxLabels,
                maxZoomRank,
                acceptedCount,
                singleEdge,
                singleFlowForward,
                chainLabels,
            } = chainCtx;

            const midS = distance * 0.5;
            let bestS = midS;
            let forceCloseZoomOnly = false;

            if (mergeConnected) {
                const endMargin = Math.min(distance * 0.40, Math.max(distance * 0.14, closeHalfLen));
                const sMin = endMargin;
                const sMax = distance - endMargin;

                let hasRoomySubArm = false;
                if (crossings.length > 0) {
                    let prev = 0;
                    for (let k = 0; k <= crossings.length; k++) {
                        const next = k < crossings.length ? crossings[k].offset : distance;
                        if (next - prev >= visualHalfLen * 2 + 4) {
                            hasRoomySubArm = true;
                            break;
                        }
                        prev = next;
                    }
                }

                const candidateOffsets: number[] = [];
                const addCandidate = (rawS: number): void => {
                    const clamped = Math.max(sMin, Math.min(sMax, rawS));
                    for (let k = 0; k < candidateOffsets.length; k++) {
                        if (Math.abs(candidateOffsets[k] - clamped) < 0.5) {
                            return;
                        }
                    }
                    candidateOffsets.push(clamped);
                };

                addCandidate(midS);
                if (crossings.length > 0) {
                    let prevOffset = 0;
                    for (let k = 0; k <= crossings.length; k++) {
                        const nextOffset = k < crossings.length ? crossings[k].offset : distance;
                        addCandidate((prevOffset + nextOffset) * 0.5);
                        prevOffset = nextOffset;
                    }
                    const corridorClear = visualHalfLen + visualHalfHeight + 3;
                    const nodeClear = visualHalfLen + 3;
                    const closeClear = closeHalfLen + 4;
                    for (let k = 0; k < crossings.length; k++) {
                        const cOff = crossings[k].offset;
                        addCandidate(cOff - corridorClear);
                        addCandidate(cOff + corridorClear);
                        addCandidate(cOff - nodeClear);
                        addCandidate(cOff + nodeClear);
                        addCandidate(cOff - closeClear);
                        addCandidate(cOff + closeClear);
                    }
                }
                if (sMax - sMin > 1) {
                    for (let step = 0; step <= 8; step++) {
                        addCandidate(sMin + (step / 8) * (sMax - sMin));
                    }
                }

                let bestMaxPen = Infinity;
                let bestTotalPen = Infinity;
                let bestSameGroupPen = Infinity;
                let bestNodePen = Infinity;
                let bestDistFromMid = Infinity;

                scratchBox.ux = ux;
                scratchBox.uy = uy;
                scratchBox.halfLen = visualHalfLen;
                scratchBox.halfHeight = visualHalfHeight;
                scratchBox.groupKey = groupKey;

                const rx = Math.abs(ux) * visualHalfLen + Math.abs(uy) * visualHalfHeight;
                const ry = Math.abs(uy) * visualHalfLen + Math.abs(ux) * visualHalfHeight;

                for (let cIdx = 0; cIdx < candidateOffsets.length; cIdx++) {
                    const candS = candidateOffsets[cIdx];
                    const cx = p0.x + ux * candS;
                    const cy = p0.y + uy * candS;
                    scratchBox.x = cx;
                    scratchBox.y = cy;

                    let maxPen = 0;
                    let totalPen = 0;
                    let sameGroupPen = 0;

                    if (spatialGrid.size > 0) {
                        const qid = ++queryId;
                        const minCX = Math.floor((cx - rx) / GRID_CELL_SIZE);
                        const maxCX = Math.floor((cx + rx) / GRID_CELL_SIZE);
                        const minCY = Math.floor((cy - ry) / GRID_CELL_SIZE);
                        const maxCY = Math.floor((cy + ry) / GRID_CELL_SIZE);

                        for (let gx = minCX; gx <= maxCX; gx++) {
                            const rowBase = (gx + GRID_OFFSET) * GRID_STRIDE;
                            for (let gy = minCY; gy <= maxCY; gy++) {
                                const bucket = spatialGrid.get(rowBase + (gy + GRID_OFFSET));
                                if (!bucket) continue;
                                for (let bIdx = 0; bIdx < bucket.length; bIdx++) {
                                    const other = bucket[bIdx];
                                    if (other.lastQueryId === qid) continue;
                                    other.lastQueryId = qid;
                                    const pen = this.computeLabelObbPenetration(scratchBox, other);
                                    if (pen > 0) {
                                        totalPen += pen;
                                        if (pen > maxPen) {
                                            maxPen = pen;
                                        }
                                        if (other.groupKey === groupKey && pen > sameGroupPen) {
                                            sameGroupPen = pen;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    let nodePen = 0;
                    if (crossings.length > 0) {
                        if (hasRoomySubArm) {
                            for (let k = 0; k < crossings.length; k++) {
                                nodePen += Math.max(0, (visualHalfLen + 2) - Math.abs(candS - crossings[k].offset));
                            }
                            nodePen += Math.max(0, visualHalfLen - candS) + Math.max(0, candS - (distance - visualHalfLen));
                        } else {
                            for (let k = 0; k < crossings.length; k++) {
                                const cr = crossings[k];
                                if ((joinNodeSpanCount.get(cr.nodeKey) ?? 0) >= 2) {
                                    nodePen += Math.max(0, (closeHalfLen + 4) - Math.abs(candS - cr.offset));
                                }
                            }
                        }
                    }

                    const distFromMid = Math.abs(candS - midS);
                    const candIsFree = maxPen <= 0.01;
                    const bestIsFree = bestMaxPen <= 0.01;

                    let isBetter = false;
                    if (bestMaxPen === Infinity) {
                        isBetter = true;
                    } else if (candIsFree !== bestIsFree) {
                        isBetter = candIsFree;
                    } else if (Math.abs(maxPen - bestMaxPen) > 0.5) {
                        isBetter = maxPen < bestMaxPen;
                    } else if (Math.abs(totalPen - bestTotalPen) > 0.5) {
                        isBetter = totalPen < bestTotalPen;
                    } else if (Math.abs(nodePen - bestNodePen) > 0.5) {
                        isBetter = nodePen < bestNodePen;
                    } else if (distFromMid < bestDistFromMid) {
                        isBetter = true;
                    }

                    if (isBetter) {
                        bestS = candS;
                        bestMaxPen = maxPen;
                        bestTotalPen = totalPen;
                        bestSameGroupPen = sameGroupPen;
                        bestNodePen = nodePen;
                        bestDistFromMid = distFromMid;
                    }
                }

                if (bestMaxPen > visualHalfHeight * 1.4) {
                    if (bestSameGroupPen > visualHalfHeight * 1.1 || chainLabels.length > 0) {
                        // Suppress redundant colliding duplicate of the same label or secondary repeat span
                        continue;
                    }
                    forceCloseZoomOnly = true;
                }
            }

            const labelX = p0.x + ux * bestS;
            const labelY = p0.y + uy * bestS;

            let ownerEdge: ChainEdge;
            if (singleEdge) {
                ownerEdge = singleEdge;
            } else {
                ownerEdge = edges[chain[0].edgeIdx];
                let bestSqDist = Infinity;
                for (let j = 0; j < chain.length; j++) {
                    const candEdge = edges[chain[j].edgeIdx];
                    const sqDist = this.pointToPolylineSqDist(labelX, labelY, candEdge.mercatorPoints);
                    if (sqDist < bestSqDist) {
                        bestSqDist = sqDist;
                        ownerEdge = candEdge;
                    }
                }
            }

            const flowForward = hasDirectionArrow ? true : singleFlowForward;
            const dx = flowForward ? pNext.x - p0.x : p0.x - pNext.x;
            const dy = flowForward ? pNext.y - p0.y : p0.y - pNext.y;
            const angle = Math.atan2(dx, dy);
            let degrees = 90 + (angle * 180) / Math.PI;
            let directionArrow: string;
            if (streetPart !== '') {
                directionArrow = ' ▶ ';
                if (degrees > 90 && degrees < 270) {
                    degrees -= 180;
                } else {
                    directionArrow = ' ◀ ';
                }
            } else {
                directionArrow = '';
            }
            if (!hasDirectionArrow) {
                directionArrow = ''; // The degree still has to be computed so text stays upright
            }

            const roadTypeStyle = this.streetStyles[ownerEdge.roadType];
            const color = roadTypeStyle ? roadTypeStyle.strokeColor : '#f00';
            const outlinecolor = roadTypeStyle ? roadTypeStyle.outlineColor : '#fff';

            const ownerId = ownerEdge.segment.id;
            let ownerLabels = ownedLabelsBySegment.get(ownerId);
            if (!ownerLabels) {
                ownerLabels = [];
                ownedLabelsBySegment.set(ownerId, ownerLabels);
            }

            const showAtZoom = forceCloseZoomOnly
                ? 1
                : mergeConnected
                    ? Math.max(
                        1,
                        Math.ceil(((acceptedCount - rankInChain) / acceptedCount) * maxZoomRank)
                    )
                    : maxLabels - rankInChain;

            const labelFeature: SdkFeature<Point> = {
                type: 'Feature',
                id: `${ownerId}_lbl_${ownerLabels.length}`,
                geometry: {
                    type: 'Point',
                    coordinates: Utils.mercatorToLonLat(labelX, labelY),
                },
                properties: {
                    'sID': ownerId,
                    'label': directionArrow + labelText + directionArrow + altStreetPart,
                    'degrees': degrees,
                    'color': color,
                    'outlinecolor': outlinecolor,
                    'outlinewidth': this.prefLabelOutlineWidth,
                    'closeZoomOnly': (forceCloseZoomOnly || spanSeqIdx % 2 === 1) ? 1 : 0,
                    'showAtzoom': showAtZoom,
                    'zIndex': 650,
                },
            };

            ownerLabels.push(labelFeature);
            chainLabels.push(labelFeature);

            const placedBox: PlacedLabelBox = {
                x: labelX,
                y: labelY,
                ux,
                uy,
                halfLen: visualHalfLen,
                halfHeight: visualHalfHeight,
                groupKey,
                lastQueryId: 0,
            };
            let segBoxes = placedBoxesBySegment.get(ownerId);
            if (!segBoxes) {
                segBoxes = [];
                placedBoxesBySegment.set(ownerId, segBoxes);
            }
            segBoxes.push(placedBox);
            if (mergeConnected) {
                insertBoxIntoGrid(placedBox);
            }
        }

        return {
            ownedLabelsBySegment,
            chainLabelsBySegment,
            placedBoxesBySegment,
            chainPeersBySegment,
        };
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
            res += this.superScript[Number(numberString.charAt(i))] ?? '';
        }
        this.superScriptCache.set(number, res);
        return res;
    }
}
