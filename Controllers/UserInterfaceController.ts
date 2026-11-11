import { KeyboardShortcut } from "wme-sdk-typings";
import { AcceptedControllerEvents, DashStyle, DEFAULT_PREFERENCES, SVLLayerState } from "../svlGlobals";
import SVLMediator from "../SVLMediator";
import AbstractController from "./AbstractController";
import { AlertType, SVLEvents } from "./AbstractMediator";
import PreferencesController from "./PreferencesController";

type StatusIconKind = 'play' | 'pause' | 'stop';

export default class UserInterfaceController extends AbstractController {
    // Singleton pattern
    private static instance: UserInterfaceController;

    private preferencesController!: PreferencesController;
    private badgeElement: HTMLElement | null = null;
    private badgeRetryTimeoutId: number | undefined;
    private roadTypeNames: Map<number, string> = new Map();

    private readonly clutterMax: number = 20;
    private readonly fontSizeMax: number = 32;

    private constructor({ mediator, preferencesController }: { mediator: SVLMediator, preferencesController: PreferencesController }) {
        super(mediator);
        this.preferencesController = preferencesController;
    }

    public static getInstance(): UserInterfaceController {
        if (!UserInterfaceController.instance) {
            throw new Error("UserInterfaceController not initialized. Call initialize() first.");
        }
        return UserInterfaceController.instance;
    }

    public static async initialize({ mediator, preferencesController }: { mediator: SVLMediator, preferencesController: PreferencesController }): Promise<UserInterfaceController> {
        if (!UserInterfaceController.instance) {
            UserInterfaceController.instance = new UserInterfaceController({ mediator, preferencesController });

            await UserInterfaceController.instance.initShortcut();
            UserInterfaceController.instance.checkVersionAndUpdate();
            UserInterfaceController.instance.createBadge();
            UserInterfaceController.instance.registerBadgeCallbacks();

            await UserInterfaceController.instance.initPreferencePanel();
            return UserInterfaceController.instance;
        } else {
            throw new Error("UserInterfaceController is already initialized.");
        }
    }

    private checkVersionAndUpdate(): void {
        const previousVersion = this.preferencesController.getPreviousVersion();
        if (previousVersion && previousVersion !== this.mediator.SVL_VERSION) {
            this.mediator.alertController.showScriptUpdate(
                'Street Vector Layer',
                this.mediator.SVL_VERSION,
                `<b>${this.mediator._('whats_new')}</b>
                <br>- 8.1.1 - Support displaying more than 2 alternative street names (this value can be set in the settings).
                <br>- 8.0.0 - Improved arrows placement, virtual nodes, and overall visual quality. Various bug fixes and performance improvements.
                <br>- 7.0.2 - New: Reduced flickering when deselecting segments.
                <br>- 7.0.0 - Fixed: SVL covers the WME's paths. The option "Show GPS layer above roads" now also works consistently. Flickering is possible at every deselection (current SDK limitation).
                <br>- 7.0.0 - Code completely rewritten, with many internal improvements and optimizations. Please report any issue you find!`,
                GM_info.script.supportURL ?? undefined
            );
            this.preferencesController.savePreferences(true);
        }
    }

    private async initShortcut(): Promise<void> {
        const defaultShortcut = "S+s";

        const toggleShortcut: KeyboardShortcut = {
            callback: () => {
                UserInterfaceController.instance.mediator.notify(
                    UserInterfaceController.instance,
                    AcceptedControllerEvents.KEYBOARD_SHORTCUT_TRIGGERED
                );
            },
            description: "Toggle SVL",
            shortcutId: "svl",
            shortcutKeys: defaultShortcut,
        };

        if (!(await this.mediator.wmeSDK.Shortcuts.areShortcutKeysInUse({
            shortcutKeys: defaultShortcut
        }))) {
            try {
                await this.mediator.wmeSDK.Shortcuts.createShortcut(toggleShortcut);
                this.debugLog('Keyboard shortcut successfully added.');
            } catch (e) {
                this.mediator.alert(AlertType.ERROR, 'Street Vector Layer could not add its default shortcut.');
                console.error('SVL: Error while adding the keyboard shortcut:', e);
            }
        } else {
            setTimeout(() => {
                this.mediator.alert(AlertType.WARNING, this.mediator._('shortcut_cannot_be_set'));
            }, 3000);
            try {
                toggleShortcut.shortcutKeys = null;
                await this.mediator.wmeSDK.Shortcuts.createShortcut(toggleShortcut);
                this.debugLog('Empty keyboard shortcut successfully added.');
            } catch (e) {
                console.error('SVL: Error while adding the empty keyboard shortcut:', e);
            }
        }
    }

    private createRangeOption({
        id,
        title,
        description,
        min,
        max,
        step,
        isNew,
    }: { id: string; title: string; description: string; min: number; max: number; step?: number; isNew?: string }) {
        const line = document.createElement('div');
        line.className = 'prefLineSlider';
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }
        const label = document.createElement('label');
        label.innerText = title;

        const input = this.createInput({
            id,
            min,
            max,
            step,
            title: this.mediator._('pick_a_value_slider'),
            className: 'prefElement form-control',
            type: 'range',
        });

        label.appendChild(input);
        line.appendChild(label);

        if (description) {
            const i = document.createElement('i');
            i.innerText = description;
            line.appendChild(i);
        }

        return line;
    }

    private createColorOption({
        id,
        title,
        description,
        isNew,
    }: { id: string; title: string; description: string; isNew?: string }) {
        const line = document.createElement('div');
        line.className = 'prefLineCheckbox';
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }
        const label = document.createElement('label');
        label.innerText = title;

        const input = this.createInput({
            id,
            title: this.mediator._('pick_a_color'),
            className: 'prefElement form-control',
            type: 'color',
        });

        label.appendChild(input);
        line.appendChild(label);

        if (description) {
            const i = document.createElement('i');
            i.innerText = description;
            line.appendChild(i);
        }

        return line;
    }

    private createInput({ id, type, className, title, min, max, step, uniqueId }: { id: string; type: string; className?: string; title?: string; min?: number; max?: number; step?: number; uniqueId?: string }) {
        const input = document.createElement('input');
        input.id = 'svl_' + id;
        if (className) {
            input.className = className;
        }
        if (title) {
            input.title = title;
        }
        input.type = type;
        input.dataset.uniqueId = uniqueId ?? id;
        if (type === 'range' || type === 'number') {
            input.min = min?.toString() ?? "";
            input.max = max?.toString() ?? "";
            input.step = step?.toString() ?? "";
        }
        return input;
    }

    private createDropdownOption({ id, title, description, options, isNew }: { id: string, title: string, description: string, options: { text: string; value: string }[], isNew?: string }) {
        const line = document.createElement('div');
        line.className = 'prefLineSelect';
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }

        const newSelect = document.createElement('select');
        newSelect.className = 'prefElement';

        const label = document.createElement('label');
        label.innerText = title;
        newSelect.id = `svl_${id}`;
        newSelect.dataset.uniqueId = id;
        if (options && options.length > 0) {
            options.forEach((o) => {
                const option = document.createElement('option');
                option.text = o.text;
                option.value = o.value;
                newSelect.add(option);
            });
        }
        const i = document.createElement('i');
        i.innerText = description;
        line.appendChild(label);
        line.appendChild(i);
        line.appendChild(newSelect);
        return line;
    }

    private createPreferencesSection(name: string, open = false) {
        const details = document.createElement('details');
        details.open = open;
        const summary = document.createElement('summary');
        summary.innerText = name;
        details.appendChild(summary);
        return details;
    }

    private async resolveMapViewportContainer(): Promise<HTMLElement | null> {
        try {
            return await this.mediator.wmeSDK.Map.getMapViewportElement();
        } catch {
            return document.getElementById('map');
        }
    }

    private async updateRoutingModePanel(): Promise<void> {
        const ID = 'svl_routingModeDiv';
        const shouldShow = Boolean(this.mediator.getPreference('routingModeEnabled')) &&
            this.mediator.getPreference('hideRoutingModeBlock') !== true;

        if (!shouldShow) {
            this.mediator.setRoutingModeSuppressed(false);
            document.getElementById(ID)?.remove();
            return;
        }

        if (document.getElementById(ID) !== null) {
            return;
        }

        const mapContainer = await this.resolveMapViewportContainer();
        if (!mapContainer || document.getElementById(ID) !== null) {
            return;
        }

        // Re-verify preference state after async await
        if (
            !this.mediator.getPreference('routingModeEnabled') ||
            this.mediator.getPreference('hideRoutingModeBlock') === true
        ) {
            return;
        }

        const routingModeDiv = document.createElement('div');
        routingModeDiv.id = ID;
        routingModeDiv.className = 'routingDiv';
        routingModeDiv.textContent = this.mediator._('routing_mode_panel_title');
        routingModeDiv.appendChild(document.createElement('br'));
        const smallEl = document.createElement('small');
        smallEl.textContent = this.mediator._('routing_mode_panel_body');
        routingModeDiv.appendChild(smallEl);
        routingModeDiv.addEventListener('mouseenter', () => {
            this.mediator.setRoutingModeSuppressed(true);
            this.mediator.notify(this, AcceptedControllerEvents.REDRAW_ALL_REQUEST);
        });
        routingModeDiv.addEventListener('mouseleave', () => {
            this.mediator.setRoutingModeSuppressed(false);
            this.mediator.notify(this, AcceptedControllerEvents.REDRAW_ALL_REQUEST);
        });
        mapContainer.appendChild(routingModeDiv);
    }

    private buildTranslationBanner(currentLocale: string | undefined): HTMLDivElement {
        const translationMessage = document.createElement('div');
        translationMessage.className = 'svl_translationblock';

        if (this.mediator._('language_code') === currentLocale) {
            const translationPercentage = this.mediator._('completition_percentage');
            if (translationPercentage === '100%') {
                translationMessage.textContent = `${this.mediator._('fully_translated_in')} ${this.mediator._('translated_by')}`;
            } else {
                translationMessage.append(
                    `${translationPercentage} ${this.mediator._('translation_thanks')} ${this.mediator._('translated_by')}. `
                );
                const helpLink = document.createElement('a');
                helpLink.href = 'https://www.waze.com/discuss/t/script-street-vector-layer/250377';
                helpLink.target = '_blank';
                helpLink.rel = 'noopener noreferrer';
                helpLink.textContent = this.mediator._('would_you_like_to_help');
                translationMessage.appendChild(helpLink);
            }
        } else if (this.mediator.areOnlineTranslationsLoaded()) {
            const bold = document.createElement('b');
            bold.style.color = 'red';
            bold.append('Unfortunately, SVL is not yet available in your language. Would you like to help translating?');
            bold.appendChild(document.createElement('br'));
            const contactLink = document.createElement('a');
            contactLink.href = 'https://www.waze.com/discuss/t/script-street-vector-layer/250377';
            contactLink.target = '_blank';
            contactLink.rel = 'noopener noreferrer';
            contactLink.textContent = 'Please contact bedo2991';
            bold.appendChild(contactLink);
            bold.append('.');
            translationMessage.appendChild(bold);
        } else {
            const bold = document.createElement('b');
            bold.style.color = '#8b0000';
            bold.textContent = 'An error occurred while fetching the translations. If it persists, please report it on the Waze forum.';
            translationMessage.appendChild(bold);
        }

        return translationMessage;
    }

    private async initPreferencePanel(): Promise<void> {
        const roadTypes = await this.mediator.wmeSDK.DataModel.Segments.getRoadTypes();
        this.roadTypeNames = new Map(
            roadTypes.map((rt: { id: number; localizedName: string }) => [rt.id, rt.localizedName])
        );

        if (!document.getElementById('svl-ui-styles')) {
            const style = document.createElement('style');
            style.id = 'svl-ui-styles';
            const newSinceLabel = this.mediator._('new_since_version').replace(/["\\]/g, '');
            style.textContent = `.svl_unsaved{background-color:#ffcc00 !important;}
            .expand{display:flex; width:100%; justify-content:space-around;align-items: center;}
            .prefLineSelect{width:100%; margin-bottom:1vh;}
            .prefLineSelect label{display:block;width:100%}
            .prefLineCheckbox{width:100%; margin-bottom:1vh;}
            .prefLineCheckbox label{display:block;width:100%;}
            .prefLineCheckbox input{float:right;}
            .prefLineInteger{width:100%; margin-bottom:1vh;}
            .prefLineInteger label{display:block;width:100%}
            .prefLineInteger input{float:right;}
            .prefLineSlider {width:100%; margin-bottom:1vh;}
            .prefLineSlider label{display:block;width:100%}
            .prefLineSlider input{float:right;}
            .newOption::before {content:"${newSinceLabel} " attr(data-version)"!"; font-weight:bolder; color:#e65c00;}
            .newOption{border:1px solid #ff9900; padding: 1px; box-shadow: 2px 3px #cc7a00;}
            .svl_logo {width:130px; display:inline-block; float:right}
            .svl_support-link{display:inline-block; width:100%; text-align:center;}
            .svl_translationblock{display:inline-block; width:100%; text-align:center; font-size:x-small}
            .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:var(--background_variant); top:0; }
            .routingDiv{opacity: 0.95; font-size:1.2em; color:#ffffff; border:0.2em #000 solid; position:absolute; top:3em; right:3.7em; padding:0.5em; background-color:#b30000; z-index: 10000;}
            .routingDiv:hover{background-color:#ff3377;}
            #sidepanel-svl summary{font-weight:bold; margin:10px;}
            #sidepanel-svl {width:96%;margin:auto;padding-right:13px;}
            #sidepanel-svl details{margin-bottom:9pt;}
            #sidepanel-svl i{font-size:small;}`;
            (document.head ?? document.body).appendChild(style);
        }

        const mainDiv = document.createElement('div');
        mainDiv.id = 'sidepanel-svl';

        const logo = document.createElement('img');
        logo.className = 'svl_logo';
        logo.src = 'https://raw.githubusercontent.com/bedo2991/svl/master/logo.png';
        logo.alt = this.mediator._('svl_logo');
        mainDiv.appendChild(logo);

        const spanThanks = document.createElement('span');
        spanThanks.innerText = this.mediator._('thanks_for_using');
        mainDiv.appendChild(spanThanks);

        const svlTitle = document.createElement('h4');
        svlTitle.innerText = 'Street Vector Layer';
        mainDiv.appendChild(svlTitle);

        const spanVersion = document.createElement('span');
        spanVersion.innerText = `${this.mediator._('version')} ${this.mediator.SVL_VERSION}`;
        mainDiv.appendChild(spanVersion);

        const supportForum = document.createElement('a');
        supportForum.innerText = `${this.mediator._('something_not_working')} ${this.mediator._(
            'report_it_here'
        )}.`;
        supportForum.href = GM_info.script.supportURL ?? '';
        supportForum.target = '_blank';
        supportForum.rel = 'noopener noreferrer';
        supportForum.className = 'svl_support-link';
        mainDiv.appendChild(supportForum);

        const currentLocale = (await this.mediator.wmeSDK.Settings.getLocale())?.localeCode;
        mainDiv.appendChild(this.buildTranslationBanner(currentLocale));

        const saveButton = document.createElement('button');
        saveButton.id = 'svl_saveNewPref';
        saveButton.type = 'button';
        saveButton.className = 'btn disabled waze-icon-save';
        saveButton.innerText = this.mediator._('save');
        saveButton.title = this.mediator._('save_help');

        const rollbackButton = document.createElement('button');
        rollbackButton.id = 'svl_rollbackButton';
        rollbackButton.type = 'button';
        rollbackButton.className = 'btn btn-default disabled';
        rollbackButton.innerText = this.mediator._('rollback');
        rollbackButton.title = this.mediator._('rollback_help');

        const resetButton = document.createElement('button');
        resetButton.id = 'svl_resetButton';
        resetButton.type = 'button';
        resetButton.className = 'btn btn-default';
        resetButton.innerText = this.mediator._('reset');
        resetButton.title = this.mediator._('reset_help');

        const buttons = document.createElement('div');
        buttons.id = 'svl_buttons';
        buttons.className = 'svl_buttons expand';
        buttons.appendChild(saveButton);
        buttons.appendChild(rollbackButton);
        buttons.appendChild(resetButton);

        mainDiv.appendChild(buttons);

        const streets = this.createPreferencesSection(this.mediator._('roads_properties'), true);

        streets.appendChild(
            this.createCheckboxOption({
                id: 'realsize',
                title: this.mediator._('use_reallife_width'),
                description: this.mediator._('use_reallife_width_descr'),
            })
        );

        streets.appendChild(
            this.createDropdownOption({
                id: 'presets',
                title: this.mediator._('road_themes_title'),
                description: this.mediator._('road_themes_descr'),
                options: [
                    { 'text': '', 'value': '' },
                    { 'text': this.mediator._('svl_standard_layer'), 'value': 'svl_standard' },
                    { 'text': this.mediator._('wme_colors_layer'), 'value': 'wme_colors' },
                ],
            })
        );

        {
            const streetsPreferences = this.mediator.getPreference('streets');
            for (let i = 0; i < streetsPreferences.length; i += 1) {
                if (streetsPreferences[i]) {
                    streets.appendChild(
                        this.createStreetOptionLine({ i, showWidth: true, showOpacity: false })
                    );
                }
            }
        }
        const decorations = this.createPreferencesSection(this.mediator._('segments_decorations'));

        const renderingParameters = this.createPreferencesSection(
            this.mediator._('rendering_parameters')
        );

        const performance = this.createPreferencesSection(this.mediator._('performance_tuning'));

        const speedLimits = this.createPreferencesSection(this.mediator._('speed_limits'));

        const options = this.getOptions();
        options.streets.forEach((o) => {
            streets.appendChild(
                this.createStreetOptionLine({
                    i: o,
                    showWidth: false,
                    showOpacity: false,
                })
            );
        });

        options.decorations.forEach((o) => {
            decorations.appendChild(
                this.createStreetOptionLine({
                    i: o,
                    showWidth: false,
                    showOpacity: true,
                })
            );
        });

        streets.appendChild(decorations);

        streets.appendChild(
            this.createIntegerOption({
                id: 'showANs',
                title: this.mediator._('show_ans'),
                description: this.mediator._('show_ans_descr'),
                min: 0,
                max: 4,
                step: 1,
            })
        );

        mainDiv.appendChild(streets);

        renderingParameters.appendChild(
            this.createIntegerOption({
                id: 'layerOpacity',
                title: this.mediator._('layer_opacity'),
                description: this.mediator._('layer_opacity_descr'),
                min: 10,
                max: 100,
                step: 5,
            })
        );

        renderingParameters.appendChild(
            this.createCheckboxOption({
                id: 'routingModeEnabled',
                title: this.mediator._('enable_routing_mode'),
                description: this.mediator._('enable_routing_mode_descr'),
            })
        );

        renderingParameters.appendChild(
            this.createCheckboxOption({
                id: 'hideRoutingModeBlock',
                title: this.mediator._('hide_routing_mode_panel'),
                description: this.mediator._('hide_routing_mode_panel_descr'),
            })
        );

        renderingParameters.appendChild(
            this.createCheckboxOption({
                id: 'showUnderGPSPoints',
                title: this.mediator._('gps_layer_above_roads'),
                description: this.mediator._('gps_layer_above_roads_descr'),
            })
        );

        streets.appendChild(
            this.createRangeOption({
                id: 'labelOutlineWidth',
                title: this.mediator._('label_width'),
                description: this.mediator._('label_width_descr'),
                min: 0,
                max: 10,
                step: 1,
            })
        );

        streets.appendChild(
            this.createRangeOption(
                {
                    id: 'nodeRadius',
                    title: this.mediator._('node_size'),
                    description: this.mediator._('node_size_descr'),
                    min: 2,
                    max: 10,
                    step: 0.2,
                    isNew: '6.2.3',
                }
            )
        );

        streets.appendChild(this.createColorOption({
            id: 'nodeColor',
            title: this.mediator._('node_color'),
            description: this.mediator._('node_color_descr'),
            isNew: '6.2.3',
        }));

        streets.appendChild(this.createColorOption({
            id: 'nodeDeadEndColor',
            title: this.mediator._('dead_end_node_color'),
            description: this.mediator._('dead_end_node_color_descr'),
            isNew: '6.2.3',
        }));

        streets.appendChild(this.createColorOption({
            id: 'virtualNodeColor',
            title: this.mediator._('virtual_node_color'),
            description: this.mediator._('virtual_node_color_descr'),
            isNew: '6.2.3',
        }));

        renderingParameters.appendChild(
            this.createCheckboxOption({
                id: 'disableRoadLayers',
                title: this.mediator._('hide_road_layer'),
                description: this.mediator._('hide_road_layer_descr'),
            })
        );

        renderingParameters.appendChild(
            this.createCheckboxOption({
                id: 'startDisabled',
                title: this.mediator._('svl_initially_disabled'),
                description: this.mediator._('svl_initially_disabled_descr'),
            })
        );

        renderingParameters.appendChild(
            this.createRangeOption({
                id: 'clutterConstant',
                title: this.mediator._('street_names_density'),
                description: this.mediator._('street_names_density_descr'),
                min: 1,
                max: this.clutterMax,
                step: 1,
            })
        );

        const closeZoomTitle = document.createElement('h5');
        closeZoomTitle.innerText = this.mediator._('close_zoom_only');

        renderingParameters.appendChild(closeZoomTitle);

        renderingParameters.appendChild(
            this.createIntegerOption({
                id: 'fakelock',
                title: this.mediator._('render_as_level'),
                description: this.mediator._('render_as_level_descr'),
                min: 1,
                max: 7,
                step: 1,
            })
        );

        renderingParameters.appendChild(
            this.createRangeOption({
                id: 'closeZoomLabelSize',
                title: this.mediator._('font_size_close'),
                description: this.mediator._('font_size_close_descr'),
                min: 8,
                max: this.fontSizeMax,
                step: 1,
            })
        );

        renderingParameters.appendChild(
            this.createRangeOption({
                id: 'arrowDeclutter',
                title: this.mediator._('limit_arrows'),
                description: this.mediator._('limit_arrows_descr'),
                min: 1,
                max: 200,
                step: 1,
            })
        );

        const farZoomTitle = document.createElement('h5');
        farZoomTitle.innerText = this.mediator._('far_zoom_only');
        renderingParameters.appendChild(farZoomTitle);

        renderingParameters.appendChild(
            this.createRangeOption({
                id: 'farZoomLabelSize',
                title: this.mediator._('font_size_far'),
                description: this.mediator._('font_size_far_descr'),
                min: 8,
                max: this.fontSizeMax,
            })
        );

        mainDiv.appendChild(renderingParameters);

        const utilities = this.createPreferencesSection(this.mediator._('utilities'));

        utilities.appendChild(
            this.createCheckboxOption({
                id: 'autoReload_enabled',
                title: this.mediator._('automatically_refresh'),
                description: this.mediator._('automatically_refresh_descr'),
                uniqueId: 'autoReload.enabled',
            })
        );

        utilities.appendChild(
            this.createIntegerOption({
                id: 'autoReload_interval',
                title: this.mediator._('autoreload_interval'),
                description: this.mediator._('autoreload_interval_descr'),
                min: 20,
                max: 3600,
                step: 1,
                uniqueId: 'autoReload.interval',
            })
        );
        mainDiv.appendChild(utilities);

        // Performance settings
        performance.appendChild(
            this.createIntegerOption({
                id: 'useWMERoadLayerAtZoom',
                title: this.mediator._('stop_svl_at_zoom'),
                description: this.mediator._('stop_svl_at_zoom_descr'),
                min: 12,
                max: 17,
                step: 1,
            })
        );

        performance.appendChild(
            this.createIntegerOption({
                id: 'switchZoom',
                title: this.mediator._('close_zoom_until_level'),
                description: this.mediator._('close_zoom_until_level_descr'),
                min: 17,
                max: 21,
                step: 1,
            })
        );

        performance.appendChild(
            this.createIntegerOption({
                id: 'segmentsThreshold',
                title: this.mediator._('segments_threshold'),
                description: this.mediator._('segments_threshold_descr'),
                min: 1000,
                max: 10000,
                step: 100,
            })
        );

        performance.appendChild(
            this.createIntegerOption({
                id: 'nodesThreshold',
                title: this.mediator._('nodes_threshold'),
                description: this.mediator._('nodes_threshold_descr'),
                min: 1000,
                max: 10000,
                step: 100,
            })
        );
        mainDiv.appendChild(performance);

        speedLimits.appendChild(
            this.createCheckboxOption({
                id: 'showSLtext',
                title: this.mediator._('show_sl_on_name'),
                description: this.mediator._('show_sl_on_name_descr'),
            })
        );

        speedLimits.appendChild(
            this.createCheckboxOption({
                id: 'showSLcolor',
                title: this.mediator._('show_sl_with_colors'),
                description: this.mediator._('show_sl_with_colors_descr'),
            })
        );

        speedLimits.appendChild(
            this.createCheckboxOption({
                id: 'showSLSinglecolor',
                title: this.mediator._('show_sl_with_one_color'),
                description: this.mediator._('show_sl_with_one_color_descr'),
            })
        );

        const colorPicker = this.createInput({
            id: 'SLColor',
            type: 'color',
            className: 'prefElement form-control',
            title: this.mediator._('pick_a_color'),
        });
        speedLimits.appendChild(colorPicker);

        const slTitle = document.createElement('h6');
        slTitle.innerText = this.getLocalisedString('speed limit');
        speedLimits.appendChild(slTitle);

        // Metric
        let type = 'metric';
        speedLimits.appendChild(this.createSpeedOptionLine('Default', true));
        let typeKeys = Object.keys(this.mediator.getPreference(`speeds.${type}`)).map(Number).sort((a, b) => a - b);
        for (const speed of typeKeys) {
            if (isNaN(speed)) continue;
            speedLimits.appendChild(this.createSpeedOptionLine(speed, true));
        }

        // Imperial
        type = 'imperial';
        speedLimits.appendChild(this.createSpeedOptionLine('Default', false));
        typeKeys = Object.keys(this.mediator.getPreference(`speeds.${type}`)).map(Number).sort((a, b) => a - b);
        for (const speed of typeKeys) {
            if (isNaN(speed)) continue;
            speedLimits.appendChild(this.createSpeedOptionLine(speed, false));
        }

        mainDiv.appendChild(speedLimits);

        const subTitle = document.createElement('h5');
        subTitle.innerText = this.mediator._('settings_backup');
        mainDiv.appendChild(subTitle);

        const utilityButtons = document.createElement('div');
        utilityButtons.className = 'expand';

        const exportButton = document.createElement('button');
        exportButton.id = 'svl_exportButton';
        exportButton.type = 'button';
        exportButton.innerText = this.mediator._('export');
        exportButton.className = 'btn btn-default';

        const importButton = document.createElement('button');
        importButton.id = 'svl_importButton';
        importButton.type = 'button';
        importButton.innerText = this.mediator._('import');
        importButton.className = 'btn btn-default';

        utilityButtons.appendChild(importButton);
        utilityButtons.appendChild(exportButton);
        mainDiv.appendChild(utilityButtons);

        const { tabLabel, tabPane } = await this.mediator.wmeSDK.Sidebar.registerScriptTab();
        tabLabel.innerText = 'SVL 🗺️';
        tabLabel.title = 'Street Vector Layer';

        tabPane.replaceChildren(mainDiv);
        // Add event listeners
        const prefElements = tabPane.querySelectorAll('.prefElement');
        prefElements.forEach((element: Element) => {
            element.addEventListener('change', this.handleUserUpdatedSVLPreferences.bind(this));
        });

        document.getElementById('svl_saveNewPref')?.addEventListener('click', this.handleSaveNewPrefClick.bind(this));
        document.getElementById('svl_rollbackButton')?.addEventListener('click', this.handleRollbackPreferencesClick.bind(this));
        document.getElementById('svl_resetButton')?.addEventListener('click', this.handleResetPreferencesClick.bind(this));
        document.getElementById('svl_importButton')?.addEventListener('click', this.handleImportPreferencesClick.bind(this));
        document.getElementById('svl_exportButton')?.addEventListener('click', this.handleExportPreferencesClick.bind(this));
        await this.updatePreferencesUI();
    }

    private handleResetPreferencesClick(): void {
        this.mediator.alertController.confirm(
            GM_info.script.name,
            `${this.mediator._('preferences_reset_question')}\n\n${this.mediator._('preferences_reset_question_2')}`,
            () => {
                this.resetButtonState();
                this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_RESET_REQUEST);
            },
            undefined,
            this.mediator._('preferences_reset_yes'),
            this.mediator._('preferences_reset_cancel')
        );
    }

    private handleImportPreferencesClick(): void {
        this.resetButtonState();
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_IMPORT_REQUEST);
    }

    private handleExportPreferencesClick(): void {
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_EXPORT_REQUEST);
    }

    private handleSaveNewPrefClick(): void {
        this.resetButtonState();
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_SAVE_REQUEST);
    }

    private handleRollbackPreferencesClick(): void {
        this.resetButtonState();
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_ROLLBACK_REQUEST);
    }

    private resetButtonState(): void {
        document.getElementById('svl_buttons')?.classList.remove('svl_unsaved');
        const saveNewButton = document.getElementById('svl_saveNewPref') as HTMLButtonElement | null;
        if (saveNewButton) {
            saveNewButton.classList.add('disabled');
            saveNewButton.disabled = true;
            saveNewButton.classList.remove('btn-primary');
        }
        const rollbackButton = document.getElementById('svl_rollbackButton') as HTMLButtonElement | null;
        if (rollbackButton) {
            rollbackButton.classList.add('disabled');
            rollbackButton.disabled = true;
        }
    }

    private markDirtyButtonState(): void {
        document.getElementById('svl_buttons')?.classList.add('svl_unsaved');
        const saveNewButton = document.getElementById('svl_saveNewPref') as HTMLButtonElement | null;
        if (saveNewButton) {
            saveNewButton.classList.remove('disabled');
            saveNewButton.disabled = false;
            saveNewButton.classList.add('btn-primary');
        }

        const rollbackButton = document.getElementById('svl_rollbackButton') as HTMLButtonElement | null;
        if (rollbackButton) {
            rollbackButton.classList.remove('disabled');
            rollbackButton.disabled = false;
        }
    }

    private clampNumericInput(input: HTMLInputElement, fallback: number): number {
        let val = parseFloat(input.value);
        if (Number.isNaN(val)) {
            val = fallback;
            input.value = String(val);
            return val;
        }
        if (input.min !== '' && val < parseFloat(input.min)) {
            val = parseFloat(input.min);
            input.value = String(val);
        }
        if (input.max !== '' && val > parseFloat(input.max)) {
            val = parseFloat(input.max);
            input.value = String(val);
        }
        return val;
    }

    private handleUserUpdatedSVLPreferences(event: Event): void {
        if (!event.target) return;

        const t = event.target as HTMLInputElement;
        const uniqueID = t.dataset.uniqueId;
        if (uniqueID === 'presets' && !t.value) {
            return;
        }

        this.markDirtyButtonState();

        if (uniqueID) {
            this.debugLog(`Preference changed: ${uniqueID}`);
            if (uniqueID === 'presets') {
                this.preferencesController.loadPreset(t.value);
                this.updateStreetsPreferenceValues();
                t.value = '';
                this.mediator.alert(AlertType.INFO, this.mediator._('preset_applied'));
            } else if (uniqueID.startsWith('streets.')) {
                const parts = uniqueID.split('.');
                const streetIndex = parseInt(parts[1], 10);
                const property = parts[2];
                if (isNaN(streetIndex)) {
                    // Decorator preference (e.g. red, lanes, toll, closure, etc.)
                    const decorator = parts[1];
                    const decPreference = this.mediator.getPreference(decorator);
                    if (!decPreference) {
                        console.error(`Decorator preference not found for ${decorator}`);
                        return;
                    }
                    switch (property) {
                        case 'strokeOpacity':
                            decPreference[property] = this.clampNumericInput(t, (decPreference[property] ?? 1) * 100) / 100.0;
                            break;
                        case 'strokeWidth':
                            decPreference[property] = this.clampNumericInput(t, decPreference[property] ?? 1);
                            break;
                        default:
                            decPreference[property] = t.value;
                            break;
                    }
                    this.mediator.setPreference(decorator, decPreference);
                } else {
                    const streetsPreferences = this.mediator.getPreference('streets');
                    if (streetsPreferences[streetIndex]) {
                        switch (property) {
                            case 'strokeOpacity':
                                streetsPreferences[streetIndex][property] =
                                    this.clampNumericInput(t, (streetsPreferences[streetIndex][property] ?? 1) * 100) / 100.0;
                                break;
                            case 'strokeWidth':
                                streetsPreferences[streetIndex][property] =
                                    this.clampNumericInput(t, streetsPreferences[streetIndex][property] ?? 1);
                                break;
                            default:
                                streetsPreferences[streetIndex][property] = t.value;
                                break;
                        }
                        this.mediator.setPreference('streets', streetsPreferences);
                    }
                }
            } else {
                let val: any = t.value;
                if (t.type === 'checkbox') {
                    val = t.checked;
                } else if (t.type === 'number' || t.type === 'range') {
                    const currentVal = this.mediator.getPreference(uniqueID);
                    const fallback = uniqueID === 'layerOpacity'
                        ? Number(currentVal ?? DEFAULT_PREFERENCES.layerOpacity) * 100
                        : uniqueID === 'autoReload.interval'
                            ? Number(currentVal ?? DEFAULT_PREFERENCES.autoReloadInterval) / 1000
                            : Number(currentVal ?? (t.min !== '' ? parseFloat(t.min) : 0));
                    val = this.clampNumericInput(t, fallback);
                }

                if (uniqueID === 'layerOpacity') {
                    val = val / 100.0;
                }
                if (uniqueID === 'autoReload.interval') {
                    val = val * 1000;
                }
                if (uniqueID === 'realsize') {
                    document.querySelectorAll<HTMLInputElement>('input.segmentsWidth').forEach((el) => {
                        el.disabled = Boolean(val);
                    });
                }

                this.mediator.setPreference(uniqueID, val);
            }

            if (uniqueID === 'routingModeEnabled' || uniqueID === 'hideRoutingModeBlock') {
                void this.updateRoutingModePanel();
            }
        }
        this.mediator.notify(this, AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES);
    }

    private setInputValue(id: string, value: string | number): void {
        const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
        if (el) {
            el.value = String(value);
        }
    }

    private setCheckboxChecked(id: string, checked: boolean): void {
        const el = document.getElementById(id) as HTMLInputElement | null;
        if (el) {
            el.checked = Boolean(checked);
        }
    }

    private updateStreetsPreferenceValues(): void {
        const streetsPreferences = this.mediator.getPreference('streets');
        for (let i = 0; i < streetsPreferences.length; i += 1) {
            if (streetsPreferences[i]) {
                this.setInputValue(`svl_streetWidth_${i}`, streetsPreferences[i]['strokeWidth']);
                this.setInputValue(`svl_streetColor_${i}`, streetsPreferences[i]['strokeColor']);
                this.setInputValue(`svl_strokeDashstyle_${i}`, streetsPreferences[i]['strokeDashstyle']);
            }
        }
    }

    public async updatePreferencesUI(): Promise<void> {
        await this.updatePreferenceValues();
        await this.updateRoutingModePanel();
    }

    /**
     * Updates the values shown on the preference panel with those stored in PreferencesController.
     */
    private async updatePreferenceValues(): Promise<void> {
        this.resetButtonState();
        this.updateStreetsPreferenceValues();
        this.setInputValue('svl_presets', '');

        const options = this.getOptions();
        options.streets.forEach((o) => {
            const streetPreference = this.mediator.getPreference(o);
            if (!streetPreference) return;
            this.setInputValue(`svl_streetColor_${o}`, streetPreference['strokeColor']);
            this.setInputValue(`svl_strokeDashstyle_${o}`, streetPreference['strokeDashstyle']);
        });

        options.decorations.forEach((o) => {
            const decorationPreference = this.mediator.getPreference(o);
            if (!decorationPreference) return;
            this.setInputValue(`svl_streetOpacity_${o}`, Math.round(decorationPreference['strokeOpacity'] * 100.0));
            this.setInputValue(`svl_streetColor_${o}`, decorationPreference['strokeColor']);
            this.setInputValue(`svl_strokeDashstyle_${o}`, decorationPreference['strokeDashstyle']);
        });

        this.setInputValue('svl_fakelock', this.mediator.getPreference('fakelock') ?? DEFAULT_PREFERENCES.fakelock);
        this.setCheckboxChecked('svl_autoReload_enabled', this.mediator.getPreference('autoReload.enabled'));
        this.setInputValue('svl_labelOutlineWidth', this.mediator.getPreference('labelOutlineWidth'));
        this.setInputValue('svl_autoReload_interval', this.mediator.getPreference('autoReload.interval') / 1000);

        this.setInputValue('svl_clutterConstant', this.mediator.getPreference('clutterConstant'));
        this.setInputValue('svl_closeZoomLabelSize', this.mediator.getPreference('closeZoomLabelSize'));
        this.setInputValue('svl_farZoomLabelSize', this.mediator.getPreference('farZoomLabelSize'));
        this.setInputValue('svl_arrowDeclutter', this.mediator.getPreference('arrowDeclutter'));
        this.setInputValue('svl_useWMERoadLayerAtZoom', this.mediator.getPreference('useWMERoadLayerAtZoom'));
        this.setInputValue('svl_switchZoom', this.mediator.getPreference('switchZoom'));
        this.setInputValue('svl_nodesThreshold', this.mediator.getPreference('nodesThreshold'));

        this.setInputValue('svl_nodeRadius', this.mediator.getPreference('nodeRadius'));
        this.setInputValue('svl_nodeColor', this.mediator.getPreference('nodeColor'));
        this.setInputValue('svl_nodeDeadEndColor', this.mediator.getPreference('nodeDeadEndColor'));
        this.setInputValue('svl_virtualNodeColor', this.mediator.getPreference('virtualNodeColor'));

        this.setInputValue('svl_segmentsThreshold', this.mediator.getPreference('segmentsThreshold'));

        this.setCheckboxChecked('svl_disableRoadLayers', this.mediator.getPreference('disableRoadLayers'));
        this.setCheckboxChecked('svl_startDisabled', this.mediator.getPreference('startDisabled'));
        this.setCheckboxChecked('svl_showUnderGPSPoints', this.mediator.getPreference('showUnderGPSPoints'));
        this.setCheckboxChecked('svl_routingModeEnabled', this.mediator.getPreference('routingModeEnabled'));
        this.setCheckboxChecked('svl_hideRoutingModeBlock', this.mediator.getPreference('hideRoutingModeBlock'));
        this.setInputValue('svl_showANs', this.mediator.getPreference('showANs'));

        this.setInputValue('svl_layerOpacity', Math.round(this.mediator.getPreference('layerOpacity') * 100));

        // Speed limits
        this.setCheckboxChecked('svl_showSLtext', this.mediator.getPreference('showSLtext'));
        this.setCheckboxChecked('svl_showSLcolor', this.mediator.getPreference('showSLcolor'));
        this.setCheckboxChecked('svl_showSLSinglecolor', this.mediator.getPreference('showSLSinglecolor'));
        this.setInputValue('svl_SLColor', this.mediator.getPreference('SLColor'));
        this.setCheckboxChecked('svl_realsize', this.mediator.getPreference('realsize'));

        const isRealSize = Boolean(this.mediator.getPreference('realsize'));
        document.querySelectorAll<HTMLInputElement>('input.segmentsWidth').forEach((el) => {
            el.disabled = isRealSize;
        });

        // Toggle metric / imperial speed rows
        const WMEUsesImperial = (await this.mediator.wmeSDK.Settings.getUserSettings()).isImperial;
        const type = WMEUsesImperial ? 'imperial' : 'metric';
        const otherType = WMEUsesImperial ? 'metric' : 'imperial';
        const speeds = Object.keys(this.mediator.getPreference(`speeds.${type}`));

        document.querySelectorAll<HTMLDivElement>(`div.svl_${otherType}`).forEach((el) => {
            el.style.display = 'none';
        });
        document.querySelectorAll<HTMLDivElement>(`div.svl_${type}`).forEach((el) => {
            el.style.display = 'block';
        });
        for (const speed of speeds) {
            this.setInputValue(`svl_slValue_${type}_${speed}`, speed);
            this.setInputValue(`svl_slColor_${type}_${speed}`, this.mediator.getPreference(`speeds.${type}.${speed}`));
        }

        this.setInputValue(`svl_slColor_${type}_Default`, this.mediator.getPreference('speeds.default'));
    }

    private createCheckboxOption({ id, title, description, isNew, uniqueId }: { id: string; title: string; description: string; isNew?: string; uniqueId?: string }) {
        const line = document.createElement('div');
        line.className = 'prefLineCheckbox';
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }
        const label = document.createElement('label');
        label.innerText = title;

        const input = this.createInput({
            id,
            className: 'prefElement',
            type: 'checkbox',
            title: this.mediator._('true_or_false'),
            uniqueId,
        });

        label.appendChild(input);
        line.appendChild(label);

        const i = document.createElement('i');
        i.innerText = description;
        line.appendChild(i);

        return line;
    }

    private createStreetOptionLine({
        i,
        showWidth = true,
        showOpacity = false,
    }: { i: string | number, showWidth?: boolean, showOpacity?: boolean }) {
        const title = document.createElement('h6');
        title.innerText = this.getLocalisedString(i);

        const color = this.createInput({
            id: `streetColor_${i}`,
            className: 'prefElement form-control',
            title: this.mediator._('color'),
            type: 'color',
            uniqueId: `streets.${i}.strokeColor`,
        });
        color.style.width = '55pt';

        const inputs = document.createElement('div');

        if (showWidth) {
            const width = this.createInput({
                id: `streetWidth_${i}`,
                type: 'number',
                title: `${this.mediator._('width')} (${this.mediator._('width_disabled')})`,
                className: Number.isInteger(i)
                    ? 'form-control prefElement segmentsWidth'
                    : 'form-control prefElement',
                min: 1,
                max: 20,
                step: 1,
                uniqueId: `streets.${i}.strokeWidth`,
            });
            width.style.width = '40pt';
            inputs.appendChild(width);
        }

        if (showOpacity) {
            const opacity = this.createInput({
                id: `streetOpacity_${i}`,
                className: 'form-control prefElement',
                title: this.mediator._('opacity'),
                type: 'number',
                min: 0,
                max: 100,
                step: 10,
                uniqueId: `streets.${i}.strokeOpacity`,
            });
            opacity.style.width = '45pt';
            inputs.appendChild(opacity);
        }

        const select = this.createDashStyleDropdown({ id: `strokeDashstyle_${i}`, uniqueID: `streets.${i}.strokeDashstyle` });
        select.className = 'form-control prefElement';

        inputs.className = 'expand';
        inputs.appendChild(color);
        inputs.appendChild(select);

        const line = document.createElement('div');
        line.className = 'prefLineStreets';
        line.appendChild(title);
        line.appendChild(inputs);

        return line;
    }

    private createDashStyleDropdown({ id, uniqueID }: { id: string, uniqueID?: string }): HTMLSelectElement {
        const newSelect = document.createElement('select');
        newSelect.className = 'prefElement';
        newSelect.title = 'Stroke style';
        newSelect.id = `svl_${id}`;
        newSelect.dataset.uniqueId = uniqueID ?? id;

        const dashOptions: ReadonlyArray<{ value: DashStyle; labelKey: string }> = [
            { value: 'solid', labelKey: 'line_solid' },
            { value: 'dash', labelKey: 'line_dash' },
            { value: 'dashdot', labelKey: 'line_dashdot' },
            { value: 'longdash', labelKey: 'line_longdash' },
            { value: 'longdashdot', labelKey: 'line_longdashdot' },
            { value: 'dot', labelKey: 'line_dot' },
        ];

        for (const item of dashOptions) {
            const option = document.createElement('option');
            option.value = item.value;
            option.text = this.mediator._(item.labelKey);
            newSelect.add(option);
        }

        return newSelect;
    }

    private getLocalisedString(i: string | number): string {
        switch (i) {
            case 'red':
                return this.mediator._('dec_red');
            case 'toll':
                return this.mediator._('dec_toll');
            case 'restriction':
                return this.mediator._('dec_restriction');
            case 'dirty':
                return this.mediator._('dec_dirty');
            case 'closure':
                return this.mediator._('dec_closure');
            case 'headlights':
                return this.mediator._('dec_headlights');
            case 'lanes':
                return this.mediator._('dec_lanes');
            case 'speed limit':
                return this.mediator._('dec_speed_limit');
            case 'nearbyHOV':
                return this.mediator._('dec_nearby_hov');
            default:
                return this.roadTypeNames.get(Number(i)) ?? String(i);
        }
    }

    private getOptions() {
        return {
            streets: ['red'],
            decorations: [
                'lanes',
                'toll',
                'restriction',
                'closure',
                'headlights',
                'dirty',
                'nearbyHOV',
            ],
        } as const;
    }

    private createSpeedOptionLine(i: number | string, metric = true) {
        const type = metric ? 'metric' : 'imperial';
        const label = document.createElement('label');
        label.innerText = i !== -1 ? String(i) : 'Default';

        const inputs = document.createElement('div');
        inputs.appendChild(label);

        if (typeof i === 'number') {
            const slValue = this.createInput({
                id: `slValue_${type}_${i}`,
                className: 'form-control prefElement',
                title: this.mediator._('speed_limit_value'),
                type: 'number',
                min: 0,
                max: 150,
                step: 1,
            });
            slValue.value = String(i);
            slValue.disabled = true;
            slValue.style.width = '50pt';
            inputs.appendChild(slValue);

            const span = document.createElement('span');
            span.innerText = metric ? this.mediator._('kmh') : this.mediator._('mph');
            inputs.appendChild(span);
        }

        const uniqueId = i === 'Default' ? 'speeds.default' : `speeds.${type}.${i}`;
        const val: string = this.mediator.getPreference(uniqueId);

        const color = this.createInput({
            id: `slColor_${type}_${i}`,
            className: 'prefElement form-control',
            type: 'color',
            title: this.mediator._('color'),
            uniqueId,
        });

        if (val) {
            color.value = val;
        }

        color.style.width = '55pt';

        inputs.className = 'expand';
        inputs.appendChild(color);

        const line = document.createElement('div');
        line.className = `svl_${type} prefLineSL`;
        line.appendChild(inputs);

        return line;
    }

    private createIntegerOption({
        id,
        title,
        description,
        min,
        max,
        step,
        isNew,
        uniqueId,
    }: { id: string; title: string; description: string; min: number; max: number; step?: number; isNew?: string; uniqueId?: string }) {
        const line = document.createElement('div');
        line.className = 'prefLineInteger';
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }
        const label = document.createElement('label');
        label.innerText = title;

        const input = this.createInput({
            id,
            min,
            max,
            step,
            type: 'number',
            title: this.mediator._('insert_number'),
            className: 'prefElement form-control',
            uniqueId,
        });

        label.appendChild(input);
        line.appendChild(label);

        if (description) {
            const i = document.createElement('i');
            i.innerText = description;
            line.appendChild(i);
        }

        return line;
    }

    private createStatusIconSvg(kind: StatusIconKind, color: string): SVGSVGElement {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('aria-hidden', 'true');
        svg.style.marginLeft = '5px';
        svg.style.flexShrink = '0';

        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', '8');
        circle.setAttribute('cy', '8');
        circle.setAttribute('r', '7');
        circle.setAttribute('fill', color);
        svg.appendChild(circle);

        if (kind === 'play') {
            const polygon = document.createElementNS(svgNS, 'polygon');
            polygon.setAttribute('points', '6.2,4.8 11.6,8 6.2,11.2');
            polygon.setAttribute('fill', '#ffffff');
            svg.appendChild(polygon);
        } else if (kind === 'pause') {
            const leftBar = document.createElementNS(svgNS, 'rect');
            leftBar.setAttribute('x', '5.3');
            leftBar.setAttribute('y', '4.8');
            leftBar.setAttribute('width', '2');
            leftBar.setAttribute('height', '6.4');
            leftBar.setAttribute('rx', '0.5');
            leftBar.setAttribute('fill', '#ffffff');

            const rightBar = document.createElementNS(svgNS, 'rect');
            rightBar.setAttribute('x', '8.7');
            rightBar.setAttribute('y', '4.8');
            rightBar.setAttribute('width', '2');
            rightBar.setAttribute('height', '6.4');
            rightBar.setAttribute('rx', '0.5');
            rightBar.setAttribute('fill', '#ffffff');

            svg.appendChild(leftBar);
            svg.appendChild(rightBar);
        } else {
            const square = document.createElementNS(svgNS, 'rect');
            square.setAttribute('x', '5.3');
            square.setAttribute('y', '5.3');
            square.setAttribute('width', '5.4');
            square.setAttribute('height', '5.4');
            square.setAttribute('rx', '0.6');
            square.setAttribute('fill', '#ffffff');
            svg.appendChild(square);
        }

        return svg;
    }

    private createBadge(attempt: number = 0): void {
        if (this.badgeElement) return;
        if (this.badgeRetryTimeoutId !== undefined) {
            clearTimeout(this.badgeRetryTimeoutId);
            this.badgeRetryTimeoutId = undefined;
        }

        const topbar = document.getElementById('topbar-container');
        if (!topbar) {
            if (attempt < 15) {
                this.badgeRetryTimeoutId = window.setTimeout(() => {
                    this.badgeRetryTimeoutId = undefined;
                    this.createBadge(attempt + 1);
                }, 300);
            } else {
                this.debugLog('#topbar-container not found.');
            }
            return;
        }

        this.badgeElement = document.createElement('div');
        this.badgeElement.id = 'svl-status-badge';
        this.badgeElement.style.display = 'inline-flex';
        this.badgeElement.style.alignItems = 'center';
        this.badgeElement.style.padding = '0 8px';
        this.badgeElement.style.height = '100%';
        this.badgeElement.style.marginLeft = '10px';
        this.badgeElement.style.cursor = 'default';
        this.badgeElement.style.fontWeight = 'bold';
        this.badgeElement.style.color = '#fff';
        this.badgeElement.style.textShadow = '1px 1px 2px black';

        this.updateBadge(this.mediator.getState());
        topbar.appendChild(this.badgeElement);
    }

    private updateBadge(state: SVLLayerState): void {
        if (!this.badgeElement) return;

        let iconKind: StatusIconKind = 'stop';
        let iconColor = '#ef4444';
        let title = this.mediator._("svl_disabled");

        switch (state) {
            case SVLLayerState.VISIBLE:
                iconKind = 'play';
                if (this.mediator.isFarZoom()) {
                    iconColor = '#4DB6AC';
                    title = this.mediator._("svl_active_far_zoom");
                } else {
                    iconColor = '#3FC91C';
                    title = this.mediator._("svl_active");
                }
                break;
            case SVLLayerState.AUTOMATICALLY_DISABLED:
                iconKind = 'pause';
                iconColor = '#f59e0b';
                title = this.mediator._("svl_paused_auto");
                break;
            case SVLLayerState.DRAWING_ABORTED:
                iconKind = 'pause';
                iconColor = '#f59e0b';
                title = this.mediator._("svl_paused_aborted");
                break;
            case SVLLayerState.USER_DISABLED:
                iconKind = 'stop';
                iconColor = '#ef4444';
                title = this.mediator._("svl_disabled_user");
                break;
            default:
                break;
        }

        const labelSpan = document.createElement('span');
        labelSpan.textContent = 'SVL';
        this.badgeElement.replaceChildren(labelSpan, this.createStatusIconSvg(iconKind, iconColor));
        this.badgeElement.title = title;
    }

    private registerBadgeCallbacks(): void {
        this.mediator.subscribe(SVLEvents.LAYER_ENABLED, () => {
            this.updateBadge(SVLLayerState.VISIBLE);
        });

        this.mediator.subscribe(SVLEvents.AUTOMATICALLY_DISABLED, () => {
            this.updateBadge(SVLLayerState.AUTOMATICALLY_DISABLED);
        });

        this.mediator.subscribe(SVLEvents.DRAWING_ABORTED, () => {
            this.updateBadge(SVLLayerState.DRAWING_ABORTED);
        });

        this.mediator.subscribe(SVLEvents.USER_DISABLED, () => {
            this.updateBadge(SVLLayerState.USER_DISABLED);
        });

        this.mediator.subscribe(SVLEvents.ZOOM_CHANGED, () => {
            this.updateBadge(this.mediator.getState());
        });

        this.mediator.subscribe(SVLEvents.SVL_SETTINGS_CHANGED, () => {
            this.updateBadge(this.mediator.getState());
        });
    }
}
