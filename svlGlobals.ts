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
    PREFERENCES_UPDATED_REQUIRES_REDRAW = 'PREFERENCES_UPDATED_REQUIRES_REDRAW', //updateStylesFromPreferences
    USER_UPDATED_SVL_PREFERENCES = 'USER_UPDATED_SVL_PREFERENCES',
    WME_SETTINGS_UPDATED = 'WME_SETTINGS_UPDATED',
    SVL_SHOULD_AUTOMATICALLY_DISABLE = 'SVL_SHOULD_AUTOMATICALLY_DISABLE',
    SVL_DRAWING_WAS_ABORTED = 'SVL_DRAWING_WAS_ABORTED',
    SVL_LAYER_ENABLED = 'SVL_LAYER_ENABLED',
    SVL_LAYER_DISABLED_BY_USER = 'SVL_LAYER_DISABLED_BY_USER',
    COUNTRY_CHANGED = 'COUNTRY_CHANGED',
    FIRST_RUN = 'FIRST_RUN',
    KEYBOARD_SHORTCUT_TRIGGERED = 'KEYBOARD_SHORTCUT_TRIGGERED'
}

export const SDK_LAYERS = {
    SEGMENTS: "Street Vector Layer (SVL)",
    ARROWS: "SVL_ARROWS_SDK",
    NODES: "SVL_NODES_SDK",
    //LABELS: "SVL_LABELS_SDK",
    ICONS: "SVL_ICONS_SDK" // e.g. average speed cameras
};

export const OL_LAYERS = {
    LABELS: "vectorLabels"
};

export const PRESETS = {
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