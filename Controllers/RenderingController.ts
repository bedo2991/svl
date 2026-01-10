import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { Node, SdkFeature, Segment } from "wme-sdk-typings";
import { LineString, Point } from "geojson";
import { AlertType, SVLEvents } from "./AbstractMediator";
import { AcceptedControllerEvents, OL_LAYERS, SDK_LAYERS, SVLLayerState } from "../svlGlobals";
import { simplify } from '@turf/simplify';
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

    private queuedSegments: Set<SdkFeature<LineString>> = new Set();
    private queuedArrows: Set<SdkFeature<Point>> = new Set();
    private queuedIcons: Set<SdkFeature<Point>> = new Set();

    private segmentsStore = new Map<Segment['id'], Set<string>>();
    private arrowsStore = new Map<Segment['id'], Set<string>>();
    private iconsStore = new Map<Segment['id'], Set<string>>();

    private labelsVector = W.map.getLayerByName(OL_LAYERS.LABELS);

    private currentTopCountryId: number | null = null;

    private isImperial: boolean = false;

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
            RenderingController.instance.handleWMESettingsUpdated.call(RenderingController.instance);
            RenderingController.instance.handleSVLSettingsUpdated.call(RenderingController.instance);

            // Event subscriptions
            mediator.subscribe(SVLEvents.COUNTRY_CHANGED, RenderingController.instance.handleCountryChanged.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.SVL_SETTINGS_CHANGED, RenderingController.instance.handleSVLSettingsUpdated.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.WME_SETTINGS_CHANGED, RenderingController.instance.handleWMESettingsUpdated.bind(RenderingController.instance));
            mediator.subscribe(SVLEvents.USER_DISABLED, RenderingController.instance.handleUserDisabledLayer.bind(RenderingController.instance));

            return RenderingController.instance;
        } else {
            throw new Error("RenderingController is already initialized.");
        }
    }

    private handleUserDisabledLayer() {
        this.removeAllSegmentsFromLayer();
    }

    private handleWMESettingsUpdated() {
        const newIsImperial = this.mediator.wmeSDK.Settings.getUserSettings().isImperial === true;
        if (this.isImperial !== newIsImperial) {
            this.isImperial = newIsImperial;
            this.redrawAll();
        }
    }

    private handleSVLSettingsUpdated() {
        let shouldRedraw = false;
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
            geometry: { type: 'Point', coordinates: [p0[0] + Utils.efficientSin(perpendicularAngle) * shiftDegrees, p0[1] + Utils.efficientCos(perpendicularAngle) * shiftDegrees] },
            properties: {
                'isAverageSpeedCamera': 1,
                'closeZoomOnly': 1,
                'degrees': this.convertRadiansToDegrees(degreesInRadians)
            }
        }
    }

    private handleCountryChanged(): void {
        const topCountry = this.mediator.wmeSDK.DataModel.Countries.getTopCountry();
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

    public zoomChanged(): void {
        console.debug('zoomChanged running');
        let currentState = this.mediator.getState();
        if (this.mediator.wmeSDK.Map.getZoomLevel() <= +this.mediator.getPreference('useWMERoadLayerAtZoom')) {
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

    private async queueSegmentFeatureForDrawing(id: Segment['id'], feature: SdkFeature<LineString>) {
        feature.id = `${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        dx = (endP[0] - startP[0]) * Utils.efficientCos(latInRadians);
        dy = endP[1] - startP[1];

        // Math.atan2(dx, dy) returns the bearing from the Y-axis (North)
        return Math.atan2(dx, dy);
    }

    private convertRadiansToDegrees(angle: number): number {
        return (angle * 180) / Math.PI;
    }

    private getCentroid(twoPoints: number[][]): number[] {
        const res = twoPoints.map(point => [point[0], point[1]]);
        return [(res[0][0] + res[1][0]) / 2.0, (res[0][1] + res[1][1]) / 2.0];
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

    // TODO: this function should cache values  instead of accessing preferences and sdk each time
    private getColorStringFromSpeed(metricspeed: number | null) {
        if (this.mediator.getPreference('showSLSinglecolor')) {
            return this.mediator.getPreference('SLColor');
        }
        if (metricspeed === null) {
            return this.mediator.getPreference('speeds')['default'];
        }
        const type = this.isImperial ? 'imperial' : 'metric';
        const speed = this.isImperial
            ? Math.round(metricspeed / 1.609344)
            : metricspeed;
        return (
            this.mediator.getPreference('speeds')[type][speed] ?? this.mediator.getPreference('speeds')['default']
        );
    }

    public redrawAll(): void {
        // Logic to redraw all SVL layers
        console.log("Redrawing all SVL layers…");
        // Clear any pending redraw to avoid multiple rapid redraws
        if (this.redrawTimeout !== null) {
            clearTimeout(this.redrawTimeout);
        }

        // Throttle redraw operations to improve performance
        this.redrawTimeout = window.setTimeout(() => {
            if (this.mediator.getState() === SVLLayerState.VISIBLE) {
                this.destroyAllFeatures();
                this.addAllSegmentsSDK();
                this.addAllNodesSDK();
            }
            this.redrawTimeout = null;
        }, 100); // 100ms throttle
    }

    private destroyAllFeatures(): void {
        this.removeAllSegmentsFromLayer();
        this.labelsVector.destroyFeatures(this.labelsVector.features, { 'silent': true });
        this.removeAllNodesFromLayer();
    }

    private addAllSegmentsSDK(): void {
        this.addSegmentsByModel(this.mediator.wmeSDK.DataModel.Segments.getAll());
    }

    public shouldDrawingResumeAfterAbort() {
        Utils.debugLog(`Segments: ${this.mediator.wmeSDK.DataModel.Segments.getAll().length}, Nodes: ${this.mediator.wmeSDK.DataModel.Nodes.getAll().length}`);
        Utils.debugLog(`Limits: Segments: ${this.mediator.getPreference('segmentsThreshold')}, Nodes: ${this.mediator.getPreference('nodesThreshold')}`);
        if (
            this.mediator.wmeSDK.DataModel.Segments.getAll().length < this.mediator.getPreference('segmentsThreshold') &&
            this.mediator.wmeSDK.DataModel.Nodes.getAll().length < this.mediator.getPreference('nodesThreshold')
        ) {
            this.mediator.notify(this, AcceptedControllerEvents.SVL_LAYER_ENABLED);
        }
    }

    private addSegmentsByModel(segments: Segment[]): void {
        const currentState = this.mediator.getState();
        if (__DEBUG__) {
            if (currentState === SVLLayerState.DRAWING_ABORTED) {
                alert("Drawing aborted state detected in addSegmentsByModel");
            }
        }
        if (segments.length === 0) return;
        if (!(currentState === SVLLayerState.DRAWING_ABORTED) && segments.length > this.mediator.getPreference('segmentsThreshold')) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${segments.length} segments. The current limit is set to ${this.mediator.getPreference('segmentsThreshold')}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }
        //let features: SdkFeature<LineString>[] = [];
        let labels: any[] = [];
        for (let i = 0; i < segments.length; i++) {
            let s = segments[i];
            const res = this.drawSegmentSDK(s);
            if (res) {
                if (res.labels)
                    labels.push(...res.labels);
            }
        }
        this.drawAllQueues();

        if (labels.length > 0) {
            this.labelsVector.addFeatures(labels, { 'silent': true });
        }
    }

    private async queueArrowFeatureForDrawing(id: Segment['id'], feature: SdkFeature<Point>) {
        feature.id = `${id}_a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.queuedArrows.add(feature);
        // TODO: there might be IDs in the list that have not been drawn yet
        this.addIDsToArrowsStore(id, feature.id);
    }
    private async queueIconFeatureForDrawing(id: Segment['id'], feature: SdkFeature<Point>) {
        feature.id = `${id}_i_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.queuedIcons.add(feature);
        // TODO: there might be IDs in the list that have not been drawn yet
        this.addIDsToIconsStore(id, feature.id);
    }

    private drawAllQueues() {
        this.drawQueuedSegments();
        this.drawQueuedArrows();
        this.drawQueuedIcons();
    }

    private drawQueuedSegments() {
        if (this.queuedSegments.size > 0) {
            this.mediator.debugLog(`Drawing ${this.queuedSegments.size} queued segments`);
            // Convert to array once instead of calling Array.from repeatedly
            this.mediator.wmeSDK.Map.addFeaturesToLayer({ layerName: SDK_LAYERS.SEGMENTS, features: Array.from(this.queuedSegments) });
            this.queuedSegments.clear();
        }
    }

    private drawQueuedArrows() {
        if (this.queuedArrows.size > 0) {
            this.mediator.debugLog(`Drawing ${this.queuedArrows.size} queued arrows`);
            this.mediator.wmeSDK.Map.addFeaturesToLayer({ layerName: SDK_LAYERS.ARROWS, features: Array.from(this.queuedArrows) });
            this.queuedArrows.clear();
        }
    }

    private drawQueuedIcons() {
        if (this.queuedIcons.size > 0) {
            this.mediator.debugLog(`Drawing ${this.queuedIcons.size} queued icons`);
            this.mediator.wmeSDK.Map.addFeaturesToLayer({ layerName: SDK_LAYERS.ICONS, features: Array.from(this.queuedIcons) });
            this.queuedIcons.clear();
        }
    }

    private addNodesByModel(nodes: Node[]): void {
        const currentState = this.mediator.getState();
        if (__DEBUG__) {
            if (currentState === SVLLayerState.DRAWING_ABORTED) {
                alert("Drawing aborted state detected in addAllNodesSDK");
            }
        }
        if (nodes.length === 0) return;
        if (!(currentState === SVLLayerState.DRAWING_ABORTED) && nodes.length > this.mediator.getPreference('nodesThreshold')) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${nodes.length} nodes. The current limit is set to ${this.mediator.getPreference('nodesThreshold')}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }
        // TODO: this should not happen here. First the events in layerStateController should fire and manage that
        if (this.mediator.wmeSDK.Map.getZoomLevel() <= this.mediator.getPreference('useWMERoadLayerAtZoom')) {
            console.debug('Not adding nodes them because of the zoom');
            return;
        }

        this.addNodesSDK(nodes);
    }

    private addAllNodesSDK(): void {
        this.addNodesByModel(this.mediator.wmeSDK.DataModel.Nodes.getAll());
    }

    private addNodesSDK(nodes: Node[]) {
        let sdkFeatures: SdkFeature<Point>[] = [];
        for (let i = 0; i < nodes.length; i++) {
            let n = nodes[i];
            if (!this.mediator.wmeSDK.DataModel.isDeleted({
                dataModelName: "nodes",
                objectId: n.id
            })) {
                //consoleDebug(`Adding node ${n.id}`);
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

        this.mediator.wmeSDK.Map.addFeaturesToLayer({
            features: sdkFeatures,
            layerName: SDK_LAYERS.NODES
        })
    }


    private removeAllSegmentsFromLayer() {
        this.queuedSegments.clear();
        this.segmentsStore.clear();

        this.queuedArrows.clear();
        this.arrowsStore.clear();

        this.queuedIcons.clear();
        this.iconsStore.clear();

        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.SEGMENTS
        });

        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.ARROWS
        });

        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.ICONS
        });
    }

    private removeAllNodesFromLayer() {
        this.mediator.wmeSDK.Map.removeAllFeaturesFromLayer({
            layerName: SDK_LAYERS.NODES
        });
    }

    public addSegmentsByIds(objectIds: (number)[]): void {
        Utils.debugLog(`addSegmentsSDK - Adding ${objectIds.length} segments`);
        if (objectIds.length > this.mediator.getPreference('segmentsThreshold')) {
            this.mediator.alert(AlertType.INFO, `Drawing aborted while adding all ${objectIds.length} segments. The current limit is set to ${this.mediator.getPreference('segmentsThreshold')}.\nYou can change this in the SVL preferences panel.`);
            this.mediator.notify(this, AcceptedControllerEvents.SVL_DRAWING_WAS_ABORTED);
            return;
        }
        const segments = objectIds.map(id => this.mediator.wmeSDK.DataModel.Segments.getById({ segmentId: id })).filter(s => s !== null) as Segment[];
        this.addSegmentsByModel(segments);
    }

    public addNodesByIds(objectIds: (number)[]): void {
        Utils.debugLog(`addNodesSDK - Adding ${objectIds.length} nodes`);
        const nodes = objectIds.map(id => this.mediator.wmeSDK.DataModel.Nodes.getById({ nodeId: id })).filter(n => n !== null) as Node[];
        this.addNodesByModel(nodes);
    }

    public removeSegmentsByIds(objectIds: (number)[]): void {
        Utils.debugLog(`Removing ${objectIds.length} segments: ${objectIds.join()}`);
        const segmentsFeatureIds: string[] = [];
        for (let i = 0; i < objectIds.length; i++) {
            let set = this.segmentsStore.get(objectIds[i]);
            if (set) {
                segmentsFeatureIds.push(...Array.from(set));
            }
            this.labelsVector.destroyFeatures(
                this.labelsVector.getFeaturesByAttribute('sID', objectIds[i]),
                { 'silent': true }
            );
        }


        const arrowsFeatureIds: string[] = [];
        for (let i = 0; i < objectIds.length; i++) {
            const set = this.arrowsStore.get(objectIds[i]);
            if (set) {
                arrowsFeatureIds.push(...Array.from(set));
            }
        }

        const iconsFeatureIds: string[] = [];
        for (let i = 0; i < objectIds.length; i++) {
            const set = this.iconsStore.get(objectIds[i]);
            if (set) {
                iconsFeatureIds.push(...Array.from(set));
            }
        }

        this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
            featureIds: segmentsFeatureIds,
            layerName: SDK_LAYERS.SEGMENTS
        });
        this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
            featureIds: arrowsFeatureIds,
            layerName: SDK_LAYERS.ARROWS
        });

        this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
            featureIds: iconsFeatureIds,
            layerName: SDK_LAYERS.ICONS
        });
    }

    public removeNodesByIds(objectIds: (number)[]): void {
        Utils.debugLog(`Removing ${objectIds.length} nodes: ${objectIds.join()}`);
        this.mediator.wmeSDK.Map.removeFeaturesFromLayer({
            featureIds: objectIds,
            layerName: SDK_LAYERS.NODES
        })
    }

    public updateSegmentsByIds(objectIds: (number)[]): void {
        this.removeSegmentsByIds(objectIds);
        this.addSegmentsByIds(objectIds);
    }

    public updateNodesByIds(objectIds: (number)[]): void {
        if (objectIds.length === 0) return;
        let nodes = objectIds.map((nodeId) => {
            return this.mediator.wmeSDK.DataModel.Nodes.getById({ nodeId: nodeId as number });
        }).filter((n) => n !== null) as Node[];
        if (nodes.length == 0) {
            Utils.debugLog("No nodes found to update");
            return;
        }
        this.removeNodesByIds(objectIds);
        this.addNodesSDK(nodes);
    }

    // TODO: refactor (Strategy pattern?)
    private drawSegmentSDK(model: Segment): { labels: any } {
        if (!model || this.mediator.wmeSDK.DataModel.isDeleted({
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
        const simplified = simplify(geometry, { tolerance: 0.00001, highQuality: false, mutate: false });
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
            segmentWidth = this.streetStyles[roadType].strokeWidth;
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
            const userRank = this.mediator.wmeSDK.State.getUserInfo()?.rank;
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
                if (
                    this.mediator.wmeSDK.DataModel.Segments.isTollSegment({ segmentId: model.id })
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
                const res = geometryPointArray.slice(0, 2);
                res[1] = this.getCentroid(res);

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
                // Deep copy the last two points to avoid mutating the original array
                const res = geometryPointArray.slice(-2);
                res[0] = this.getCentroid(res);

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
                // consoleDebug("The segment is oneway or has unknown direction");
                let simplifiedPoints = model.geometry.coordinates;
                // N.B. model.length is the length in meters, not the items in the array (it's an object)
                if (
                    !isInRoundabout &&
                    (length / simplifiedPoints.length) < this.mediator.getPreference('arrowDeclutter')
                ) {
                    simplifiedPoints = simplified.coordinates;
                }

                if ((isAtoB || isBtoA/* || isTwoWay was already checked in the first if*/) === false
                    && this.mediator.wmeSDK.DataModel.Segments.isRoadTypeDrivable({ roadType: model.roadType })) {
                    // Unknown direction
                    for (let p = 0; p < simplifiedPoints.length - 1; p += 1) {
                        // let shape = OpenLayers.Geometry.Polygon.createRegularPolygon(new OpenLayers.Geometry.LineString([simplifiedPoints[p],simplifiedPoints[p+1]]).getCentroid(true), 2, 6, 0); // origin, size, edges, rotation
                        // Unknown direction
                        let unknownDir: SdkFeature<Point> = {
                            type: 'Feature',
                            id: model.id,
                            geometry: {
                                type: 'Point',
                                coordinates: (p + 2) < simplifiedPoints.length ? this.getCentroid(simplifiedPoints.slice(p, p + 2)) : this.getCentroid([simplifiedPoints[p], simplifiedPoints[p + 1]])
                            },
                            properties: {
                                'closeZoomOnly': 1,
                                'isUnknownDirection': 1,
                                'zIndex': baselevel + 180
                            },
                        };
                        this.queueArrowFeatureForDrawing(model.id, unknownDir);
                    }
                } else {
                    // It is one way, draw normal arrows

                    const step = isInRoundabout ? 3 : 1;
                    for (let p = step - 1; p < simplifiedPoints.length - 1; p += step) {
                        const degrees = this.getAngleDegreesSDK(
                            isAtoB,
                            simplifiedPoints[p],
                            simplifiedPoints[p + 1]
                        );

                        let arrow: SdkFeature<Point> = {
                            type: 'Feature',
                            id: model.id,
                            geometry: {
                                type: 'Point',
                                coordinates: (p + 2) < simplifiedPoints.length ? this.getCentroid(simplifiedPoints.slice(p, p + 2)) : this.getCentroid([simplifiedPoints[p], simplifiedPoints[p + 1]])

                            },
                            properties: {
                                'degrees': degrees,
                                'zIndex': baselevel + 180
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

        // Add Label
        const oldModel = W.model.segments.getObjectById(model.id);
        let labels;
        if (oldModel) {
            labels = this.drawLabels(oldModel, oldModel?.getOLGeometry().simplify(7).components);
        }
        return { labels };
    }

    /**
  *
  * @param {Waze.Feature.Vector.Segment} segmentModel
  * @param {Array<OpenLayers.Geometry.Point>} simplified
  */
    private drawLabels(segmentModel: Waze.Feature.Vector.Segment, simplified: Array<OpenLayers.Geometry.Point>) {
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
        const address = this.mediator.wmeSDK.DataModel.Segments.getAddress({ segmentId: attributes.id })
        const hasStreetName = !address.isEmpty && typeof (address.street?.name) == 'string';
        let streetPart = '';
        if (hasStreetName) {
            streetPart = address.street?.name as string;
        } else if (attributes.roadType < 10 && !segmentModel.isInRoundabout()) {
            streetPart = '⚑';
        }
        // consoleDebug(`Streetpart: ${streetPart}`);

        // add alt street names
        let altStreetPart = '';
        if (this.mediator.getPreference('showANs')) {
            let ANsShown = 0;
            for (let i = 0; i < address.altStreets.length; i += 1) {
                const altStreet = address.altStreets[i];
                if (ANsShown === 2) {
                    // Show maximum 2 alternative names
                    altStreetPart += ' …';
                    break;
                }
                const altStreetName = altStreet.street?.name;
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

    // TODO: cache for efficiency
    private getSuperScript(number: number): string {
        let res = '';
        if (number) {
            let numberString: string = number.toString();
            if (this.isImperial) {
                // Convert the speed limit to mph
                numberString = Math.round(number / 1.609344).toString();
            }
            numberString = numberString.toString();
            for (let i = 0; i < numberString.length; i += 1) {
                res += this.superScript[Number(numberString.charAt(i))];
            }
        }
        return res;
    }

}