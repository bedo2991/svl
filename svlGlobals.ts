/// <reference types="tampermonkey" />

declare global {
    const __DEBUG__: boolean;
}

export const enum SVLLayerState {
    UNINITIALIZED,
    INITIALIZED,
    VISIBLE,
    DRAWING_ABORTED,
    AUTOMATICALLY_DISABLED,
    USER_DISABLED
}

// These events are accepted by the mediator from controllers. Then the mediator decides what to do (probably, firing a SVLEvent)
export const enum AcceptedControllerEvents {
    PREFERENCES_EXPORT_REQUEST = 'PREFERENCES_EXPORT_REQUEST',
    PREFERENCES_IMPORT_REQUEST = 'PREFERENCES_IMPORT_REQUEST',
    PREFERENCES_SAVE_REQUEST = 'PREFERENCES_SAVE_REQUEST',
    PREFERENCES_RESET_REQUEST = 'PREFERENCES_RESET_REQUEST',
    PREFERENCES_ROLLBACK_REQUEST = 'PREFERENCES_ROLLBACK_REQUEST',
    REDRAW_ALL_REQUEST = 'REDRAW_ALL_REQUEST',
    PREFERENCES_UI_REQUIRE_REFRESH = 'PREFERENCES_UI_REQUIRE_REFRESH',
    PREFERENCES_UPDATED_REQUIRES_REDRAW = 'PREFERENCES_UPDATED_REQUIRES_REDRAW', // updateStylesFromPreferences
    USER_UPDATED_SVL_PREFERENCES = 'USER_UPDATED_SVL_PREFERENCES',
    WME_SETTINGS_UPDATED = 'WME_SETTINGS_UPDATED',
    SVL_SHOULD_AUTOMATICALLY_DISABLE = 'SVL_SHOULD_AUTOMATICALLY_DISABLE',
    SVL_SHOULD_ENABLE_LAYER = 'SVL_SHOULD_ENABLE_LAYER',
    SVL_DRAWING_WAS_ABORTED = 'SVL_DRAWING_WAS_ABORTED',
    SVL_LAYER_ENABLED = 'SVL_LAYER_ENABLED',
    SVL_LAYER_DISABLED_BY_USER = 'SVL_LAYER_DISABLED_BY_USER',

    FIRST_RUN = 'FIRST_RUN',
    KEYBOARD_SHORTCUT_TRIGGERED = 'KEYBOARD_SHORTCUT_TRIGGERED'
}

export const SDK_LAYERS = {
    SEGMENTS: 'Street Vector Layer (SVL)',
    ARROWS: 'SVL_ARROWS_SDK',
    NODES: 'SVL_NODES_SDK',
    LABELS: 'SVL_LABELS_SDK',
    ICONS: 'SVL_ICONS_SDK', // e.g. average speed cameras
} as const;

export interface ChangedIDsInfo {
    newID: null | string | number;
    oldID: null | string | number;
}

export type DashStyle = 'solid' | 'dash' | 'dashdot' | 'longdash' | 'longdashdot' | 'dot';

export interface StreetStylePreference {
    strokeColor: string;
    strokeWidth: number;
    strokeDashstyle: DashStyle;
}

export interface RedStylePreference {
    strokeColor: string;
    strokeDashstyle: DashStyle;
}

export interface DecorationStylePreference {
    strokeColor: string;
    strokeDashstyle: DashStyle;
    strokeOpacity: number;
}

export interface AutoReloadPreference {
    interval: number;
    enabled: boolean;
}

export interface SpeedsPreference {
    default: string;
    metric: Record<number, string>;
    imperial: Record<number, string>;
}

export interface SVLPreferences {
    version?: string;
    autoReload: AutoReloadPreference;
    showSLSinglecolor: boolean;
    SLColor: string;
    fakelock: number;
    showSLcolor: boolean;
    showSLtext: boolean;
    disableRoadLayers: boolean;
    startDisabled: boolean;
    clutterConstant: number;
    labelOutlineWidth: number;
    closeZoomLabelSize: number;
    farZoomLabelSize: number;
    useWMERoadLayerAtZoom: number;
    switchZoom: number;
    arrowDeclutter: number;
    segmentsThreshold: number;
    nodesThreshold: number;
    showUnderGPSPoints: boolean;
    routingModeEnabled: boolean;
    hideRoutingModeBlock: boolean;
    nodeRadius: number;
    nodeColor: string;
    nodeDeadEndColor: string;
    virtualNodeColor: string;
    realsize: boolean;
    showANs: number;
    layerOpacity: number;
    streets: Array<StreetStylePreference | undefined>;
    red: RedStylePreference;
    lanes: DecorationStylePreference;
    toll: DecorationStylePreference;
    closure: DecorationStylePreference;
    headlights: DecorationStylePreference;
    nearbyHOV: DecorationStylePreference;
    restriction: DecorationStylePreference;
    dirty: DecorationStylePreference;
    speeds: SpeedsPreference;
    [key: string]: unknown;
}

export type PresetName = 'svl_standard' | 'wme_colors';

export const PRESETS: Record<PresetName, { streets: Array<StreetStylePreference | null> }> = {
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
    }
};

export const DEFAULT_METRIC_SPEEDS: Readonly<Record<number, string>> = {
    5: '#542344',
    7: '#ff5714',
    10: '#ffbf00',
    20: '#ee0000',
    30: '#e4ff1a',
    40: '#993300',
    50: '#33ff33',
    60: '#639fab',
    70: '#00ffff',
    80: '#00bfff',
    90: '#0066ff',
    100: '#ff00ff',
    110: '#ff0080',
    120: '#ff0000',
    130: '#ff9000',
    140: '#ff4000',
    150: '#0040ff',
};

export const DEFAULT_IMPERIAL_SPEEDS: Readonly<Record<number, string>> = {
    5: '#ff0000',
    10: '#ff8000',
    15: '#ffb000',
    20: '#bfff00',
    25: '#993300',
    30: '#33ff33',
    35: '#00ff90',
    40: '#00ffff',
    45: '#00bfff',
    50: '#0066ff',
    55: '#ff00ff',
    60: '#ff0050',
    65: '#ff9010',
    70: '#0040ff',
    75: '#10ff10',
    80: '#ff4000',
    85: '#ff0000',
};

export const DEFAULT_PREFERENCES = {
    autoReloadInterval: 60000,
    autoReloadEnabled: false,
    showSLSinglecolor: false,
    SLColor: '#ffdf00',
    fakelock: 6,
    showSLcolor: true,
    showSLtext: true,
    disableRoadLayers: true,
    startDisabled: false,
    clutterConstant: 7,
    labelOutlineWidth: 3,
    closeZoomLabelSize: 14,
    farZoomLabelSize: 12,
    useWMERoadLayerAtZoom: 15,
    switchZoom: 17,
    arrowDeclutter: 140,
    segmentsThreshold: 3000,
    nodesThreshold: 4000,
    showUnderGPSPoints: false,
    routingModeEnabled: false,
    hideRoutingModeBlock: false,
    nodeRadius: 3.0,
    nodeColor: '#0015FF',
    nodeDeadEndColor: '#C31CFF',
    virtualNodeColor: '#045419',
    realsize: true,
    showANs: 2,
    layerOpacity: 0.8,
    defaultSpeedColor: '#cc0000',
} as const;
