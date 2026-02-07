import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";
import { AlertType } from "./AbstractMediator";
import { AcceptedControllerEvents, PRESETS } from "../svlGlobals";

interface PreferenceObject {
    [key: string]: any
}
export default class PreferencesController extends AbstractController {
    // Singleton pattern
    private static instance: PreferencesController | null = null;
    private preferences: PreferenceObject;
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

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<PreferencesController> {
        if (!PreferencesController.instance) {
            PreferencesController.instance = new PreferencesController({ mediator });
            let oldUser = PreferencesController.instance.loadPreferences();
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
        const keys = key.split('.');
        let value = this.preferences;

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
        let obj = this.preferences;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!obj[k] || typeof obj[k] !== 'object') {
                obj[k] = {};
            }
            obj = obj[k];
        }

        obj[keys[keys.length - 1]] = value;
    }

    public loadPreset(val: string) {
        // @ts-ignore
        const preset = PRESETS[val];
        if (preset) {
            const keys = Object.keys(preset);
            for (let i = 0; i < keys.length; i += 1) {
                if (keys[i] === 'streets') {
                    for (let j = 0; j < preset['streets'].length; j += 1) {
                        const style = preset['streets'][j];
                        if (style) {
                            if (!this.preferences['streets'][j]) {
                                this.preferences['streets'][j] = {};
                            }
                            this.preferences['streets'][j].strokeColor = style.strokeColor;
                            this.preferences['streets'][j].strokeWidth = style.strokeWidth;
                            this.preferences['streets'][j].strokeDashstyle =
                                style.strokeDashstyle;
                        }
                    }
                } else {
                    // @ts-ignore
                    this.preferences[keys[i]] = preset[keys[i]];
                }
            }
            this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UI_REQUIRE_REFRESH);
            this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UPDATED_REQUIRES_REDRAW);
        }
    }

    private loadPreferences(overwrite = false) {
        let oldUser = true;
        let loadedPreferences = null;

        if (overwrite === true) {
            unsafeWindow.localStorage.removeItem('svl');
        } else {
            const pref = unsafeWindow.localStorage.getItem('svl');
            if (pref) {
                loadedPreferences = JSON.parse(pref);
            }
        }

        // consoleDebug("Loading preferences");
        if (loadedPreferences === null) {
            if (overwrite) {
                console.debug('Overwriting existing preferences');
            } else {
                oldUser = false;
                console.debug('Creating new preferences for the first time');
            }
        }
        // else: preference read from localstorage

        this.preferences = {};
        this.preferences['autoReload'] = {};
        // jshint ignore: start
        this.preferences['autoReload']['interval'] =
            loadedPreferences?.['autoReload']?.['interval'] ?? 60000;
        this.preferences['autoReload']['enabled'] =
            loadedPreferences?.['autoReload']?.['enabled'] ?? false;

        this.preferences['showSLSinglecolor'] =
            loadedPreferences?.['showSLSinglecolor'] ?? false;
        this.preferences['SLColor'] = loadedPreferences?.['SLColor'] ?? '#ffdf00';

        let userLevel = this.mediator.wmeSDK.State.getUserInfo()?.rank;
        if (typeof userLevel !== 'undefined') {
            userLevel += 1;
        }
        this.preferences['fakelock'] =
            loadedPreferences?.['fakelock'] ?? userLevel ?? 6;
        this.preferences['showSLcolor'] = loadedPreferences?.['showSLcolor'] ?? true;
        this.preferences['showSLtext'] = loadedPreferences?.['showSLtext'] ?? true;
        // this.preferences['version'] = SVL_VERSION; Automatically added by savePreferences
        this.preferences['disableRoadLayers'] =
            loadedPreferences?.['disableRoadLayers'] ?? true;
        this.preferences['startDisabled'] =
            loadedPreferences?.['startDisabled'] ?? false;
        this.preferences['clutterConstant'] =
            loadedPreferences?.['clutterConstant'] ?? 7;
        this.preferences['labelOutlineWidth'] =
            loadedPreferences?.['labelOutlineWidth'] ?? 3;
        this.preferences['closeZoomLabelSize'] =
            loadedPreferences?.['closeZoomLabelSize'] ?? 14;
        this.preferences['farZoomLabelSize'] =
            loadedPreferences?.['farZoomLabelSize'] ?? 12;
        this.preferences['useWMERoadLayerAtZoom'] =
            loadedPreferences?.['useWMERoadLayerAtZoom'] ?? 15;
        this.preferences['switchZoom'] = loadedPreferences?.['switchZoom'] ?? 17;

        this.preferences['arrowDeclutter'] =
            loadedPreferences?.['arrowDeclutter'] ?? 140;

        this.preferences['segmentsThreshold'] =
            loadedPreferences?.['segmentsThreshold'] ?? 3000;

        this.preferences['nodesThreshold'] =
            loadedPreferences?.['nodesThreshold'] ?? 4000;

        this.preferences['showUnderGPSPoints'] =
            loadedPreferences?.['showUnderGPSPoints'] ?? false;

        this.preferences['routingModeEnabled'] =
            loadedPreferences?.['routingModeEnabled'] ?? false;

        this.preferences['hideRoutingModeBlock'] =
            loadedPreferences?.['hideRoutingModeBlock'] ?? false;

        this.preferences['nodeRadius'] = loadedPreferences?.['nodeRadius'] ?? 3.0;
        this.preferences['nodeColor'] = loadedPreferences?.['nodeColor'] ?? '#0015FF';
        this.preferences['nodeDeadEndColor'] = loadedPreferences?.['nodeDeadEndColor'] ?? '#C31CFF';
        this.preferences['virtualNodeColor'] = loadedPreferences?.['virtualNodeColor'] ?? '#033a12';

        this.preferences['realsize'] = loadedPreferences?.['realsize'] ?? true;
        this.preferences['showANs'] = loadedPreferences?.['showANs'] ?? false;

        this.preferences['layerOpacity'] = loadedPreferences?.['layerOpacity'] ?? 0.8;

        this.preferences['streets'] = [];
        // Street: 1
        this.preferences['streets'][1] = {
            'strokeColor':
                loadedPreferences?.['streets'][1]?.['strokeColor'] ?? '#FFFFFF',
            'strokeWidth': loadedPreferences?.['streets'][1]?.['strokeWidth'] ?? 10,
            'strokeDashstyle':
                loadedPreferences?.['streets'][1]?.['strokeDashstyle'] ?? 'solid',
        };
        // Parking: 20
        this.preferences['streets'][20] = {
            'strokeColor':
                loadedPreferences?.['streets'][20]?.['strokeColor'] ?? '#2282AB',
            'strokeWidth': loadedPreferences?.['streets'][20]?.['strokeWidth'] ?? 9,
            'strokeDashstyle':
                loadedPreferences?.['streets'][20]?.['strokeDashstyle'] ?? 'solid',
        };
        // Ramp: 4
        this.preferences['streets'][4] = {
            'strokeColor':
                loadedPreferences?.['streets'][4]?.['strokeColor'] ?? '#3FC91C',
            'strokeWidth': loadedPreferences?.['streets'][4]?.['strokeWidth'] ?? 11,
            'strokeDashstyle':
                loadedPreferences?.['streets'][4]?.['strokeDashstyle'] ?? 'solid',
        };
        // Freeway: 3
        this.preferences['streets'][3] = {
            'strokeColor':
                loadedPreferences?.['streets'][3]?.['strokeColor'] ?? '#387FB8',
            'strokeWidth': loadedPreferences?.['streets'][3]?.['strokeWidth'] ?? 18,
            'strokeDashstyle':
                loadedPreferences?.['streets'][3]?.['strokeDashstyle'] ?? 'solid',
        };
        // Minor: 7
        this.preferences['streets'][7] = {
            'strokeColor':
                loadedPreferences?.['streets'][7]?.['strokeColor'] ?? '#ECE589',
            'strokeWidth': loadedPreferences?.['streets'][7]?.['strokeWidth'] ?? 14,
            'strokeDashstyle':
                loadedPreferences?.['streets'][7]?.['strokeDashstyle'] ?? 'solid',
        };
        // Major: 6
        this.preferences['streets'][6] = {
            'strokeColor':
                loadedPreferences?.['streets'][6]?.['strokeColor'] ?? '#C13040',
            'strokeWidth': loadedPreferences?.['streets'][6]?.['strokeWidth'] ?? 16,
            'strokeDashstyle':
                loadedPreferences?.['streets'][6]?.['strokeDashstyle'] ?? 'solid',
        };
        // Stairway: 16
        this.preferences['streets'][16] = {
            'strokeColor':
                loadedPreferences?.['streets'][16]?.['strokeColor'] ?? '#B700FF',
            'strokeWidth': loadedPreferences?.['streets'][16]?.['strokeWidth'] ?? 5,
            'strokeDashstyle':
                loadedPreferences?.['streets'][16]?.['strokeDashstyle'] ?? 'dash',
        };
        // Walking: 5
        this.preferences['streets'][5] = {
            'strokeColor':
                loadedPreferences?.['streets'][5]?.['strokeColor'] ?? '#00FF00',
            'strokeWidth': loadedPreferences?.['streets'][5]?.['strokeWidth'] ?? 5,
            'strokeDashstyle':
                loadedPreferences?.['streets'][5]?.['strokeDashstyle'] ?? 'dash',
        };
        // Dirty: 8
        this.preferences['streets'][8] = {
            'strokeColor':
                loadedPreferences?.['streets'][8]?.['strokeColor'] ?? '#82614A',
            'strokeWidth': loadedPreferences?.['streets'][8]?.['strokeWidth'] ?? 7,
            'strokeDashstyle':
                loadedPreferences?.['streets'][8]?.['strokeDashstyle'] ?? 'solid',
        };
        // Ferry: 15
        this.preferences['streets'][15] = {
            'strokeColor':
                loadedPreferences?.['streets'][15]?.['strokeColor'] ?? '#FF8000',
            'strokeWidth': loadedPreferences?.['streets'][15]?.['strokeWidth'] ?? 5,
            'strokeDashstyle':
                loadedPreferences?.['streets'][15]?.['strokeDashstyle'] ?? 'dashdot',
        };
        // Railroad: 18
        this.preferences['streets'][18] = {
            'strokeColor':
                loadedPreferences?.['streets'][18]?.['strokeColor'] ?? '#FFFFFF',
            'strokeWidth': loadedPreferences?.['streets'][18]?.['strokeWidth'] ?? 8,
            'strokeDashstyle':
                loadedPreferences?.['streets'][18]?.['strokeDashstyle'] ?? 'dash',
        };
        // Private: 17
        this.preferences['streets'][17] = {
            'strokeColor':
                loadedPreferences?.['streets'][17]?.['strokeColor'] ?? '#00FFB3',
            'strokeWidth': loadedPreferences?.['streets'][17]?.['strokeWidth'] ?? 7,
            'strokeDashstyle':
                loadedPreferences?.['streets'][17]?.['strokeDashstyle'] ?? 'solid',
        };
        // Alley: 22
        this.preferences['streets'][22] = {
            'strokeColor':
                loadedPreferences?.['streets'][22]?.['strokeColor'] ?? '#C6C7FF',
            'strokeWidth': loadedPreferences?.['streets'][22]?.['strokeWidth'] ?? 6,
            'strokeDashstyle':
                loadedPreferences?.['streets'][22]?.['strokeDashstyle'] ?? 'solid',
        };
        // Runway: 19
        this.preferences['streets'][19] = {
            'strokeColor':
                loadedPreferences?.['streets'][19]?.['strokeColor'] ?? '#00FF00',
            'strokeWidth': loadedPreferences?.['streets'][19]?.['strokeWidth'] ?? 5,
            'strokeDashstyle':
                loadedPreferences?.['streets'][19]?.['strokeDashstyle'] ?? 'dashdot',
        };
        // Primary: 2
        this.preferences['streets'][2] = {
            'strokeColor':
                loadedPreferences?.['streets'][2]?.['strokeColor'] ?? '#CBA12E',
            'strokeWidth': loadedPreferences?.['streets'][2]?.['strokeWidth'] ?? 12,
            'strokeDashstyle':
                loadedPreferences?.['streets'][2]?.['strokeDashstyle'] ?? 'solid',
        };
        // Pedestrian: 10
        this.preferences['streets'][10] = {
            'strokeColor':
                loadedPreferences?.['streets'][10]?.['strokeColor'] ?? '#0000FF',
            'strokeWidth': loadedPreferences?.['streets'][10]?.['strokeWidth'] ?? 5,
            'strokeDashstyle':
                loadedPreferences?.['streets'][10]?.['strokeDashstyle'] ?? 'dash',
        };
        // Red segments (without names)
        this.preferences['red'] = {
            'strokeColor': loadedPreferences?.['red']?.['strokeColor'] ?? '#FF0000',
            'strokeDashstyle':
                loadedPreferences?.['red']?.['strokeDashstyle'] ?? 'solid',
        };

        this.preferences['roundabout'] = {
            'strokeColor':
                loadedPreferences?.['roundabout']?.['strokeColor'] ?? '#111',
            'strokeWidth': loadedPreferences?.['roundabout']?.['strokeWidth'] ?? 1,
            'strokeDashstyle':
                loadedPreferences?.['roundabout']?.['strokeDashstyle'] ?? 'dash',
        };
        this.preferences['lanes'] = {
            'strokeColor': loadedPreferences?.['lanes']?.['strokeColor'] ?? '#454443',
            'strokeDashstyle':
                loadedPreferences?.['lanes']?.['strokeDashstyle'] ?? 'dash',
            'strokeOpacity': loadedPreferences?.['lanes']?.['strokeOpacity'] ?? 0.9,
        };
        this.preferences['toll'] = {
            'strokeColor': loadedPreferences?.['toll']?.['strokeColor'] ?? '#00E1FF',
            'strokeDashstyle':
                loadedPreferences?.['toll']?.['strokeDashstyle'] ?? 'solid',
            'strokeOpacity': loadedPreferences?.['toll']?.['strokeOpacity'] ?? 1.0,
        };
        this.preferences['closure'] = {
            'strokeColor':
                loadedPreferences?.['closure']?.['strokeColor'] ?? '#FF00FF',
            'strokeOpacity': loadedPreferences?.['closure']?.['strokeOpacity'] ?? 1.0,
            'strokeDashstyle':
                loadedPreferences?.['closure']?.['strokeDashstyle'] ?? 'dash',
        };
        this.preferences['headlights'] = {
            'strokeColor':
                loadedPreferences?.['headlights']?.['strokeColor'] ?? '#bfff00',
            'strokeOpacity':
                loadedPreferences?.['headlights']?.['strokeOpacity'] ?? 0.9,
            'strokeDashstyle':
                loadedPreferences?.['headlights']?.['strokeDashstyle'] ?? 'dot',
        };
        this.preferences['nearbyHOV'] = {
            'strokeColor':
                loadedPreferences?.['nearbyHOV']?.['strokeColor'] ?? '#ff66ff',
            'strokeOpacity':
                loadedPreferences?.['nearbyHOV']?.['strokeOpacity'] ?? 1.0,
            'strokeDashstyle':
                loadedPreferences?.['nearbyHOV']?.['strokeDashstyle'] ?? 'dash',
        };
        this.preferences['restriction'] = {
            'strokeColor':
                loadedPreferences?.['restriction']?.['strokeColor'] ?? '#F2FF00',
            'strokeOpacity':
                loadedPreferences?.['restriction']?.['strokeOpacity'] ?? 1.0,
            'strokeDashstyle':
                loadedPreferences?.['restriction']?.['strokeDashstyle'] ?? 'dash',
        };
        this.preferences['dirty'] = {
            'strokeColor': loadedPreferences?.['dirty']?.['strokeColor'] ?? '#82614A',
            'strokeOpacity': loadedPreferences?.['dirty']?.['strokeOpacity'] ?? 0.6,
            'strokeDashstyle':
                loadedPreferences?.['dirty']?.['strokeDashstyle'] ?? 'longdash',
        };

        this.preferences['speeds'] = {};
        this.preferences['speeds']['default'] =
            loadedPreferences?.['speed']?.['default'] ?? '#cc0000';

        if (loadedPreferences?.['speeds']?.['metric']) {
            this.preferences['speeds']['metric'] = loadedPreferences['speeds']['metric'];
        } else {
            this.preferences['speeds']['metric'] = {};
            this.preferences['speeds']['metric'][5] =
                loadedPreferences?.['speeds']?.['metric'][5] ?? '#542344';
            this.preferences['speeds']['metric'][7] =
                loadedPreferences?.['speeds']?.['metric'][7] ?? '#ff5714';
            this.preferences['speeds']['metric'][10] =
                loadedPreferences?.['speeds']?.['metric'][10] ?? '#ffbf00';
            this.preferences['speeds']['metric'][20] =
                loadedPreferences?.['speeds']?.['metric'][20] ?? '#ee0000';
            this.preferences['speeds']['metric'][30] =
                loadedPreferences?.['speeds']?.['metric'][30] ?? '#e4ff1a';
            this.preferences['speeds']['metric'][40] =
                loadedPreferences?.['speeds']?.['metric'][40] ?? '#993300';
            this.preferences['speeds']['metric'][50] =
                loadedPreferences?.['speeds']?.['metric'][50] ?? '#33ff33';
            this.preferences['speeds']['metric'][60] =
                loadedPreferences?.['speeds']?.['metric'][60] ?? '#639fab';
            this.preferences['speeds']['metric'][70] =
                loadedPreferences?.['speeds']?.['metric'][70] ?? '#00ffff';
            this.preferences['speeds']['metric'][80] =
                loadedPreferences?.['speeds']?.['metric'][80] ?? '#00bfff';
            this.preferences['speeds']['metric'][90] =
                loadedPreferences?.['speeds']?.['metric'][90] ?? '#0066ff';
            this.preferences['speeds']['metric'][100] =
                loadedPreferences?.['speeds']?.['metric'][100] ?? '#ff00ff';
            this.preferences['speeds']['metric'][110] =
                loadedPreferences?.['speeds']?.['metric'][110] ?? '#ff0080';
            this.preferences['speeds']['metric'][120] =
                loadedPreferences?.['speeds']?.['metric'][120] ?? '#ff0000';
            this.preferences['speeds']['metric'][130] =
                loadedPreferences?.['speeds']?.['metric'][130] ?? '#ff9000';
            this.preferences['speeds']['metric'][140] =
                loadedPreferences?.['speeds']?.['metric'][140] ?? '#ff4000';
            this.preferences['speeds']['metric'][150] =
                loadedPreferences?.['speeds']?.['metric'][150] ?? '#0040ff';
        }

        if (loadedPreferences?.['speeds']?.['imperial']) {
            this.preferences['speeds']['imperial'] =
                loadedPreferences['speeds']['imperial'];
        } else {
            this.preferences['speeds']['imperial'] = {};
            this.preferences['speeds']['imperial'][5] =
                loadedPreferences?.['speeds']?.['imperial'][5] ?? '#ff0000';
            this.preferences['speeds']['imperial'][10] =
                loadedPreferences?.['speeds']?.['imperial'][10] ?? '#ff8000';
            this.preferences['speeds']['imperial'][15] =
                loadedPreferences?.['speeds']?.['imperial'][15] ?? '#ffb000';
            this.preferences['speeds']['imperial'][20] =
                loadedPreferences?.['speeds']?.['imperial'][20] ?? '#bfff00';
            this.preferences['speeds']['imperial'][25] =
                loadedPreferences?.['speeds']?.['imperial'][25] ?? '#993300';
            this.preferences['speeds']['imperial'][30] =
                loadedPreferences?.['speeds']?.['imperial'][30] ?? '#33ff33';
            this.preferences['speeds']['imperial'][35] =
                loadedPreferences?.['speeds']?.['imperial'][35] ?? '#00ff90';
            this.preferences['speeds']['imperial'][40] =
                loadedPreferences?.['speeds']?.['imperial'][40] ?? '#00ffff';
            this.preferences['speeds']['imperial'][45] =
                loadedPreferences?.['speeds']?.['imperial'][45] ?? '#00bfff';
            this.preferences['speeds']['imperial'][50] =
                loadedPreferences?.['speeds']?.['imperial'][50] ?? '#0066ff';
            this.preferences['speeds']['imperial'][55] =
                loadedPreferences?.['speeds']?.['imperial'][55] ?? '#ff00ff';
            this.preferences['speeds']['imperial'][60] =
                loadedPreferences?.['speeds']?.['imperial'][60] ?? '#ff0050';
            this.preferences['speeds']['imperial'][65] =
                loadedPreferences?.['speeds']?.['imperial'][65] ?? '#ff9010';
            this.preferences['speeds']['imperial'][70] =
                loadedPreferences?.['speeds']?.['imperial'][70] ?? '#0040ff';
            this.preferences['speeds']['imperial'][75] =
                loadedPreferences?.['speeds']?.['imperial'][75] ?? '#10ff10';
            this.preferences['speeds']['imperial'][80] =
                loadedPreferences?.['speeds']?.['imperial'][80] ?? '#ff4000';
            this.preferences['speeds']['imperial'][85] =
                loadedPreferences?.['speeds']?.['imperial'][85] ?? '#ff0000';
        }
        // jshint ignore: end
        this.storePreferences(this.preferences);
        // Compute properties that need to be computed

        return oldUser;
    }

    public savePreferences(silent = false) {
        this.storePreferences(this.preferences, silent);
    }

    private storePreferences(pref: PreferenceObject, silent = true) {
        pref.version = this.mediator.SVL_VERSION;
        try {
            unsafeWindow.localStorage.setItem('svl', JSON.stringify(pref));
            if (!silent) {
                this.mediator.alert(AlertType.SUCCESS, this.mediator._('preferences_saved'));
            }
        } catch (e) {
            console.error(e);
            this.mediator.alert(AlertType.ERROR, this.mediator._('preferences_saving_error'));
        }
    }

    public saveDefaultPreferences() {
        this.loadPreferences(true);
    }

    public exportPreferences() {
        GM_setClipboard(JSON.stringify(this.preferences));
        this.mediator.alert(AlertType.INFO, this.mediator._('export_preferences_message'));
    }

    public rollbackPreferences() {
        this.loadPreferences(false);
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UI_REQUIRE_REFRESH);
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UPDATED_REQUIRES_REDRAW);
    }

    public resetPreferences() {
        console.debug('resetting preferences');
        this.saveDefaultPreferences();
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UI_REQUIRE_REFRESH);
        this.mediator.notify(this, AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES);
        this.mediator.alert(AlertType.SUCCESS, this.mediator._('preferences_reset_message'));
    }

    public importPreferences() {
        this.mediator.prompt(
            GM_info.script.name,
            `${this.mediator._('preferences_import_prompt')}\n\n${this.mediator._(
                'preferences_import_prompt_2'
            )}`,
            '',
            (_: any, input: string) => {
                try {
                    const importedPreferences = JSON.parse(input);
                    this.preferences = importedPreferences;
                    this.storePreferences(this.preferences, true);
                    this.mediator.alert(AlertType.SUCCESS, this.mediator._('preferences_imported'));
                    this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_UPDATED_REQUIRES_REDRAW);
                    //this.updateStylesFromPreferences(importedPreferences);
                } catch (e) {
                    console.error(e);
                    this.mediator.alert(AlertType.ERROR, this.mediator._('preferences_importing_error'));
                }
            }
        );
    }
}