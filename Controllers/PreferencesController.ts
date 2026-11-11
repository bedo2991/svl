import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { AlertType } from "./AbstractMediator";
import {
    AcceptedControllerEvents,
    DEFAULT_IMPERIAL_SPEEDS,
    DEFAULT_METRIC_SPEEDS,
    DEFAULT_PREFERENCES,
    PRESETS,
    PresetName,
    SVLPreferences,
    StreetStylePreference,
} from "../svlGlobals";

type PreferenceObject = Record<string, any>;

export default class PreferencesController extends AbstractController {
    // Singleton pattern
    private static instance: PreferencesController | null = null;
    private preferences: PreferenceObject;
    private previousVersion: string | null = null;
    private userRank: number | undefined;
    private constructor({ mediator }: { mediator: SVLMediator }) {
        // Private constructor to prevent direct instantiation
        super(mediator);
        this.preferences = {};
    }
    public static getInstance(): PreferencesController {
        if (!PreferencesController.instance) {
            throw new Error("PreferencesController is not initialized. Call PreferencesController.initialize() first.");
        }
        return PreferencesController.instance;
    }

    public getPreviousVersion(): string | null {
        return this.previousVersion;
    }

    public updateUserRank(rank: number | undefined): void {
        this.userRank = rank;
    }

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<PreferencesController> {
        if (!PreferencesController.instance) {
            PreferencesController.instance = new PreferencesController({ mediator });
            PreferencesController.instance.userRank = (await mediator.wmeSDK.State.getUserInfo())?.rank;
            const oldUser = PreferencesController.instance.loadPreferences();
            if (!oldUser) {
                PreferencesController.instance.mediator.notify(PreferencesController.instance, AcceptedControllerEvents.FIRST_RUN);
            }
            return PreferencesController.instance;
        } else {
            throw new Error("PreferencesController is already initialized.");
        }
    }
    /**
     * 
     * @param key In the format key1.key2
     * @returns 
     */
    public getPreference(key: string): any {
        if (!key.includes('.')) {
            return this.preferences?.[key];
        }
        const keys = key.split('.');
        let value: any = this.preferences;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return undefined;
            }
        }

        return value;
    }

    public setPreference(key: string, value: any): void {
        const keys = key.split('.');
        let obj: PreferenceObject = this.preferences;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!obj[k] || typeof obj[k] !== 'object') {
                obj[k] = {};
            }
            obj = obj[k];
        }

        obj[keys[keys.length - 1]] = value;
    }

    private isPresetName(val: string): val is PresetName {
        return Object.prototype.hasOwnProperty.call(PRESETS, val);
    }

    public loadPreset(val: string): void {
        if (!this.isPresetName(val)) {
            return;
        }
        const preset = PRESETS[val];
        const streets: Array<StreetStylePreference | undefined> = this.preferences['streets'] ?? [];
        this.preferences['streets'] = streets;

        for (let j = 0; j < preset.streets.length; j += 1) {
            const style = preset.streets[j];
            if (style) {
                streets[j] = {
                    strokeColor: style.strokeColor,
                    strokeWidth: style.strokeWidth,
                    strokeDashstyle: style.strokeDashstyle,
                };
            }
        }
    }

    private loadPreferences(overwrite = false, customPreferences: PreferenceObject | null = null): boolean {
        let oldUser = true;
        let loadedPreferences: PreferenceObject | null = null;
        const storage = unsafeWindow?.localStorage ?? localStorage;

        if (overwrite === true) {
            storage.removeItem('svl');
        } else if (customPreferences !== null) {
            loadedPreferences = customPreferences;
        } else {
            const pref = storage.getItem('svl');
            if (pref) {
                try {
                    loadedPreferences = JSON.parse(pref);
                    if (this.previousVersion === null && typeof loadedPreferences?.version === 'string') {
                        this.previousVersion = loadedPreferences.version;
                    }
                } catch (e) {
                    console.error('SVL: Failed to parse stored preferences, resetting to defaults.', e);
                    loadedPreferences = null;
                }
            }
        }

        if (loadedPreferences === null) {
            if (overwrite) {
                this.debugLog('Overwriting existing preferences');
            } else {
                oldUser = false;
                this.debugLog('Creating new preferences for the first time');
            }
        }

        const userLevel = typeof this.userRank === 'number' ? this.userRank + 1 : undefined;

        const loadedShowANs = loadedPreferences?.['showANs'];
        let showANs: number = DEFAULT_PREFERENCES.showANs;
        if (typeof loadedShowANs === 'boolean') {
            showANs = loadedShowANs ? 2 : 0;
        } else if (typeof loadedShowANs === 'number' && !Number.isNaN(loadedShowANs)) {
            showANs = Math.min(4, Math.max(0, Math.round(loadedShowANs)));
        }

        const defaultStreets = PRESETS.svl_standard.streets;
        const streets: Array<StreetStylePreference | undefined> = [];
        for (let i = 0; i < defaultStreets.length; i += 1) {
            const defaultStreet = defaultStreets[i];
            if (defaultStreet) {
                const loadedStreet = loadedPreferences?.['streets']?.[i];
                streets[i] = {
                    strokeColor: loadedStreet?.['strokeColor'] ?? defaultStreet.strokeColor,
                    strokeWidth: loadedStreet?.['strokeWidth'] ?? defaultStreet.strokeWidth,
                    strokeDashstyle: loadedStreet?.['strokeDashstyle'] ?? defaultStreet.strokeDashstyle,
                };
            }
        }

        const loadedMetric = loadedPreferences?.['speeds']?.['metric'];
        const metricSpeeds: Record<number, string> = {
            ...DEFAULT_METRIC_SPEEDS,
            ...(loadedMetric && typeof loadedMetric === 'object' ? loadedMetric : {}),
        };

        const loadedImperial = loadedPreferences?.['speeds']?.['imperial'];
        const imperialSpeeds: Record<number, string> = {
            ...DEFAULT_IMPERIAL_SPEEDS,
            ...(loadedImperial && typeof loadedImperial === 'object' ? loadedImperial : {}),
        };

        const builtPreferences: SVLPreferences = {
            autoReload: {
                interval: loadedPreferences?.['autoReload']?.['interval'] ?? DEFAULT_PREFERENCES.autoReloadInterval,
                enabled: loadedPreferences?.['autoReload']?.['enabled'] ?? DEFAULT_PREFERENCES.autoReloadEnabled,
            },
            showSLSinglecolor: loadedPreferences?.['showSLSinglecolor'] ?? DEFAULT_PREFERENCES.showSLSinglecolor,
            SLColor: loadedPreferences?.['SLColor'] ?? DEFAULT_PREFERENCES.SLColor,
            fakelock: loadedPreferences?.['fakelock'] ?? userLevel ?? DEFAULT_PREFERENCES.fakelock,
            showSLcolor: loadedPreferences?.['showSLcolor'] ?? DEFAULT_PREFERENCES.showSLcolor,
            showSLtext: loadedPreferences?.['showSLtext'] ?? DEFAULT_PREFERENCES.showSLtext,
            disableRoadLayers: loadedPreferences?.['disableRoadLayers'] ?? DEFAULT_PREFERENCES.disableRoadLayers,
            startDisabled: loadedPreferences?.['startDisabled'] ?? DEFAULT_PREFERENCES.startDisabled,
            clutterConstant: loadedPreferences?.['clutterConstant'] ?? DEFAULT_PREFERENCES.clutterConstant,
            labelOutlineWidth: loadedPreferences?.['labelOutlineWidth'] ?? DEFAULT_PREFERENCES.labelOutlineWidth,
            closeZoomLabelSize: loadedPreferences?.['closeZoomLabelSize'] ?? DEFAULT_PREFERENCES.closeZoomLabelSize,
            farZoomLabelSize: loadedPreferences?.['farZoomLabelSize'] ?? DEFAULT_PREFERENCES.farZoomLabelSize,
            useWMERoadLayerAtZoom: loadedPreferences?.['useWMERoadLayerAtZoom'] ?? DEFAULT_PREFERENCES.useWMERoadLayerAtZoom,
            switchZoom: loadedPreferences?.['switchZoom'] ?? DEFAULT_PREFERENCES.switchZoom,
            arrowDeclutter: loadedPreferences?.['arrowDeclutter'] ?? DEFAULT_PREFERENCES.arrowDeclutter,
            segmentsThreshold: loadedPreferences?.['segmentsThreshold'] ?? DEFAULT_PREFERENCES.segmentsThreshold,
            nodesThreshold: loadedPreferences?.['nodesThreshold'] ?? DEFAULT_PREFERENCES.nodesThreshold,
            showUnderGPSPoints: loadedPreferences?.['showUnderGPSPoints'] ?? DEFAULT_PREFERENCES.showUnderGPSPoints,
            routingModeEnabled: loadedPreferences?.['routingModeEnabled'] ?? DEFAULT_PREFERENCES.routingModeEnabled,
            hideRoutingModeBlock: loadedPreferences?.['hideRoutingModeBlock'] ?? DEFAULT_PREFERENCES.hideRoutingModeBlock,
            nodeRadius: loadedPreferences?.['nodeRadius'] ?? DEFAULT_PREFERENCES.nodeRadius,
            nodeColor: loadedPreferences?.['nodeColor'] ?? DEFAULT_PREFERENCES.nodeColor,
            nodeDeadEndColor: loadedPreferences?.['nodeDeadEndColor'] ?? DEFAULT_PREFERENCES.nodeDeadEndColor,
            virtualNodeColor: loadedPreferences?.['virtualNodeColor'] ?? DEFAULT_PREFERENCES.virtualNodeColor,
            realsize: loadedPreferences?.['realsize'] ?? DEFAULT_PREFERENCES.realsize,
            showANs,
            layerOpacity: loadedPreferences?.['layerOpacity'] ?? DEFAULT_PREFERENCES.layerOpacity,
            streets,
            red: {
                strokeColor: loadedPreferences?.['red']?.['strokeColor'] ?? '#FF0000',
                strokeDashstyle: loadedPreferences?.['red']?.['strokeDashstyle'] ?? 'solid',
            },
            lanes: {
                strokeColor: loadedPreferences?.['lanes']?.['strokeColor'] ?? '#454443',
                strokeDashstyle: loadedPreferences?.['lanes']?.['strokeDashstyle'] ?? 'dash',
                strokeOpacity: loadedPreferences?.['lanes']?.['strokeOpacity'] ?? 0.9,
            },
            toll: {
                strokeColor: loadedPreferences?.['toll']?.['strokeColor'] ?? '#00E1FF',
                strokeDashstyle: loadedPreferences?.['toll']?.['strokeDashstyle'] ?? 'solid',
                strokeOpacity: loadedPreferences?.['toll']?.['strokeOpacity'] ?? 1.0,
            },
            closure: {
                strokeColor: loadedPreferences?.['closure']?.['strokeColor'] ?? '#FF00FF',
                strokeOpacity: loadedPreferences?.['closure']?.['strokeOpacity'] ?? 1.0,
                strokeDashstyle: loadedPreferences?.['closure']?.['strokeDashstyle'] ?? 'dash',
            },
            headlights: {
                strokeColor: loadedPreferences?.['headlights']?.['strokeColor'] ?? '#bfff00',
                strokeOpacity: loadedPreferences?.['headlights']?.['strokeOpacity'] ?? 0.9,
                strokeDashstyle: loadedPreferences?.['headlights']?.['strokeDashstyle'] ?? 'dot',
            },
            nearbyHOV: {
                strokeColor: loadedPreferences?.['nearbyHOV']?.['strokeColor'] ?? '#ff66ff',
                strokeOpacity: loadedPreferences?.['nearbyHOV']?.['strokeOpacity'] ?? 1.0,
                strokeDashstyle: loadedPreferences?.['nearbyHOV']?.['strokeDashstyle'] ?? 'dash',
            },
            restriction: {
                strokeColor: loadedPreferences?.['restriction']?.['strokeColor'] ?? '#F2FF00',
                strokeOpacity: loadedPreferences?.['restriction']?.['strokeOpacity'] ?? 1.0,
                strokeDashstyle: loadedPreferences?.['restriction']?.['strokeDashstyle'] ?? 'dash',
            },
            dirty: {
                strokeColor: loadedPreferences?.['dirty']?.['strokeColor'] ?? '#82614A',
                strokeOpacity: loadedPreferences?.['dirty']?.['strokeOpacity'] ?? 0.6,
                strokeDashstyle: loadedPreferences?.['dirty']?.['strokeDashstyle'] ?? 'longdash',
            },
            speeds: {
                default: loadedPreferences?.['speeds']?.['default'] ?? DEFAULT_PREFERENCES.defaultSpeedColor,
                metric: metricSpeeds,
                imperial: imperialSpeeds,
            },
        };

        this.preferences = builtPreferences;
        this.storePreferences(this.preferences);

        return oldUser;
    }

    public savePreferences(silent = false): void {
        this.storePreferences(this.preferences, silent);
    }

    private storePreferences(pref: PreferenceObject, silent = true): void {
        pref.version = this.mediator.SVL_VERSION;
        try {
            (unsafeWindow?.localStorage ?? localStorage).setItem('svl', JSON.stringify(pref));
            if (!silent) {
                this.mediator.alert(AlertType.SUCCESS, this.mediator._('preferences_saved'));
            }
        } catch (e) {
            console.error(e);
            this.mediator.alert(AlertType.ERROR, this.mediator._('preferences_saving_error'));
        }
    }

    public saveDefaultPreferences(): void {
        this.loadPreferences(true);
    }

    public exportPreferences(): void {
        GM_setClipboard(JSON.stringify(this.preferences));
        this.mediator.alert(AlertType.INFO, this.mediator._('export_preferences_message'));
    }

    public rollbackPreferences(): void {
        this.loadPreferences(false);
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UI_REQUIRE_REFRESH);
        this.mediator.notify(this, AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES);
    }

    public resetPreferences(): void {
        this.debugLog('Resetting preferences');
        this.saveDefaultPreferences();
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UI_REQUIRE_REFRESH);
        this.mediator.notify(this, AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES);
        this.mediator.alert(AlertType.SUCCESS, this.mediator._('preferences_reset_message'));
    }

    public importPreferences(): void {
        this.mediator.prompt(
            GM_info.script.name,
            `${this.mediator._('preferences_import_prompt')}\n\n${this.mediator._(
                'preferences_import_prompt_2'
            )}`,
            '',
            (_: unknown, input: string) => {
                try {
                    const importedPreferences = JSON.parse(input);
                    if (!importedPreferences || typeof importedPreferences !== 'object' || Array.isArray(importedPreferences)) {
                        throw new Error('Invalid preferences object');
                    }
                    this.loadPreferences(false, importedPreferences);
                    this.mediator.alert(AlertType.SUCCESS, this.mediator._('preferences_imported'));
                    this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UI_REQUIRE_REFRESH);
                    this.mediator.notify(this, AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES);
                } catch (e) {
                    console.error(e);
                    this.mediator.alert(AlertType.ERROR, this.mediator._('preferences_importing_error'));
                }
            }
        );
    }
}
