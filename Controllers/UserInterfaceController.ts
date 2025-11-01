import SVLMediator from "../SVLMediator";
import AbstractController from "./AbstractController";
import PreferencesController from "./PreferencesController";


export default class UserInterfaceController extends AbstractController {
    // Singleton pattern
    private static instance: UserInterfaceController | null = null

    private preferencesController!: PreferencesController;

    /** @type{number} */
    private readonly clutterMax: number = 20;
    /** @type{number} */
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
            await UserInterfaceController.instance.initPreferencePanel();
            return UserInterfaceController.instance;
        } else {
            throw new Error("UserInterfaceController is already initialized.");
        }
    }

    /**
  *
  * @param {{id:string,title:string,description:string,min:number,max:number,step:(number|undefined),isNew:(string|undefined)}} param0
  */
    private createRangeOption({
        id,
        title,
        description,
        min,
        max,
        step,
        isNew,
    }: { id: string; title: string; description: string; min: number; max: number; step?: (number | undefined); isNew?: (string | undefined); }) {
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
    }: { id: string; title: string; description: string; isNew?: (string | undefined); }) {
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

    /**
   *
   * @param {{id:string,type:string,className:(string|undefined),title:(string|undefined)}} param0
   */
    private createInput({ id, type, className, title, min, max, step }: { id: string; type: string; className?: (string | undefined); title: (string | undefined); min?: number; max?: number; step?: number; }) {
        const input = <HTMLInputElement>document.createElement('input');
        input.id = 'svl_' + id;
        if (className) {
            input.className = className;
        }
        if (title) {
            input.title = title;
        }
        input.type = type;
        if (type === 'range' || type === 'number') {
            input.min = min?.toString() || "";
            input.max = max?.toString() || "";
            input.step = step?.toString() || "";
        }
        return input;
    }

    private createDropdownOption({ id, title, description, options, isNew }: { id: string, title: string, description: string, options: { text: string; value: string }[], isNew?: string }) {
        const line = <HTMLDivElement>document.createElement('div');
        line.className = 'prefLineSelect';
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }

        const newSelect = <HTMLSelectElement>document.createElement('select');
        newSelect.className = 'prefElement';

        const label = <HTMLLabelElement>document.createElement('label');
        label.innerText = title;
        newSelect.id = `svl_${id}`;
        if (options && options.length > 0) {
            options.forEach((o) => {
                const option = <HTMLOptionElement>document.createElement('option');
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

    private updateRoutingModePanel() {
        const ID = 'svl_routingModeDiv';
        const div = document.getElementById(ID);
        if (
            this.mediator.getPreference('routingModeEnabled') &&
            this.mediator.getPreference('hideRoutingModeBlock') !== true
        ) {
            if (div !== null) {
                //The panel already exists
                return;
            }
            // Show the routing panel
            let routingModeDiv = <HTMLDivElement>document.createElement('div');
            routingModeDiv.id = ID;
            routingModeDiv.className = 'routingDiv';
            routingModeDiv.innerHTML = `${this.mediator._(
                'routing_mode_panel_title'
            )}<br><small>${this.mediator._('routing_mode_panel_body')}<small>`;
            routingModeDiv.addEventListener('mouseenter', () => {
                // Temporary disable routing mode
                this.mediator.setPreference('routingModeEnabled', false);
                // TODO redrawAllSegments();
            });
            routingModeDiv.addEventListener('mouseleave', () => {
                // Enable routing mode again
                this.mediator.setPreference('routingModeEnabled', true);
                // TODO redrawAllSegments();
            });
            (<HTMLDivElement>document.getElementById('map')).appendChild(routingModeDiv);
        } else {
            // Remove the routing panel
            div?.remove();
        }
    }

    private async initPreferencePanel() {
        //console.debug('Init Preference Panel');
        const style = <HTMLStyleElement>document.createElement('style');
        style['innerHTML'] = `.svl_unsaved{background-color:#ffcc00 !important;}
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
        .newOption::before {content:"${this.mediator._('new_since_version')} " attr(data-version)"!"; font-weight:bolder; color:#e65c00;}
        .newOption{border:1px solid #ff9900; padding: 1px; box-shadow: 2px 3px #cc7a00;}
        .svl_logo {width:130px; display:inline-block; float:right}
        .svl_support-link{display:inline-block; width:100%; text-align:center;}
        .svl_translationblock{display:inline-block; width:100%; text-align:center; font-size:x-small}
        .svl_buttons{clear:both; position:sticky; padding: 1vh; background-color:var(--background_variant); top:0; }
        .routingDiv{opacity: 0.95; font-size:1.2em; color:#ffffff; border:0.2em #000 solid; position:absolute; top:3em; right:3.7em; padding:0.5em; background-color:#b30000;}
        .routingDiv:hover{background-color:#ff3377;}
        #sidepanel-svl summary{font-weight:bold; margin:10px;}
        #sidepanel-svl {width:98%;}
        #sidepanel-svl details{margin-bottom:9pt;}
        #sidepanel-svl i{font-size:small;}`;

        document.body.appendChild(style);
        const panelDiv = document.createElement('div');
        const mainDiv = document.createElement('div');
        mainDiv.id = 'sidepanel-svl';
        panelDiv.append(mainDiv);

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
        supportForum.href = GM_info.script.supportURL;
        supportForum.target = '_blank';
        supportForum.className = 'svl_support-link';
        mainDiv.appendChild(supportForum);

        const translationMessage = document.createElement('div');
        translationMessage.className = 'svl_translationblock';
        if (this.mediator._('language_code') === I18n.currentLocale()) {
            //Translations are available for this language
            const translationPercentage = this.mediator._('completition_percentage');
            if (translationPercentage === '100%') {
                translationMessage.innerText = `${this.mediator._('fully_translated_in')} ${this.mediator._(
                    'translated_by'
                )}`;
            } else {
                translationMessage.innerHTML = `${translationPercentage} ${this.mediator._(
                    'translation_thanks'
                )} ${this.mediator._(
                    'translated_by'
                )}. <a href="https://www.waze.com/forum/viewtopic.php?f=819&t=149535&start=310#p2114167" target="_blank">${this.mediator._(
                    'would_you_like_to_help'
                )}</a>`;
            }
        } else {
            if (this.mediator.areOnlineTranslationsLoaded()) {
                //Call for action
                //No need to translate this.
                translationMessage.innerHTML = `<b style="color:red">Unfortunately, SVL is not yet available in your language. Would you like to help translating?<br><a href="https://www.waze.com/discuss/t/script-street-vector-layer/250377" target="_blank">Please contact bedo2991</a>.</b>`;
            } else {
                translationMessage.innerHTML = `<b style="color:#8b0000">An error occurred while fetching the translations. If it persists, please report it on the Waze forum.</b>`;
            }
        }
        mainDiv.appendChild(translationMessage);

        // mainDiv.id = "svl_PrefDiv";

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

        { // Create options for streets styles
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
        options['streets'].forEach((o) => {
            if (o !== 'red') {
                streets.appendChild(
                    this.createStreetOptionLine({
                        i: o,
                        showWidth: true,
                        showOpacity: false,
                    })
                );
            } else {
                streets.appendChild(
                    this.createStreetOptionLine({
                        i: o,
                        showWidth: false,
                        showOpacity: false,
                    })
                );
            }
        });

        decorations.appendChild(
            this.createStreetOptionLine({
                i: 'lanes',
                showWidth: false,
                showOpacity: true,
            })
        );
        decorations.appendChild(
            this.createStreetOptionLine({
                i: 'toll',
                showWidth: false,
                showOpacity: true,
            })
        );
        decorations.appendChild(
            this.createStreetOptionLine({
                i: 'restriction',
                showWidth: false,
                showOpacity: true,
            })
        );
        decorations.appendChild(
            this.createStreetOptionLine({
                i: 'closure',
                showWidth: false,
                showOpacity: true,
            })
        );
        decorations.appendChild(
            this.createStreetOptionLine({
                i: 'headlights',
                showWidth: false,
                showOpacity: true,
            })
        );
        decorations.appendChild(
            this.createStreetOptionLine({
                i: 'dirty',
                showWidth: false,
                showOpacity: true,
            })
        );
        decorations.appendChild(
            this.createStreetOptionLine({
                i: 'nearbyHOV',
                showWidth: false,
                showOpacity: true,
            })
        );

        streets.appendChild(decorations);

        streets.appendChild(
            this.createCheckboxOption({
                id: 'showANs',
                title: this.mediator._('show_ans'),
                description: this.mediator._('show_ans_descr'),
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
            id: `nodeColor`,
            title: this.mediator._('node_color'),
            description: this.mediator._('node_color_descr'),
            isNew: '6.2.3',
        }));

        streets.appendChild(this.createColorOption({
            id: `nodeDeadEndColor`,
            title: this.mediator._('dead_end_node_color'),
            description: this.mediator._('dead_end_node_color_descr'),
            isNew: '6.2.3',
        }));

        streets.appendChild(this.createColorOption({
            id: `virtualNodeColor`,
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

        /*
            for (let k = wmeSDK.Settings.getUserSettings().isImperial ? 9 : 15; k > 1; k -= 1) {
                const span = document.createElement("span");
                if (wmeSDK.Settings.getUserSettings().isImperial) {
                    span.style['color'] = getColorStringFromSpeed((k * 10 - 5) * 1.609344);
                    span.innerText = k * 10 - 5;
                } else {
                    span.style['color'] = getColorStringFromSpeed(k * 10);
                    span.innerText = k * 10;
                }
                span.style['marginRight'] = "1pt";
                speedLimits.appendChild(span);
            } */

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

        //Metric
        let type = 'metric';
        speedLimits.appendChild(this.createSpeedOptionLine('Default', true));
        for (
            let i = 1;
            i < Object.keys(this.mediator.getPreference(`speeds.${type}`)).length + 1;
            i += 1
        ) {
            speedLimits.appendChild(this.createSpeedOptionLine(i, true));
        }

        type = 'imperial';
        speedLimits.appendChild(this.createSpeedOptionLine('Default', false));
        for (
            let i = 1;
            i < Object.keys(this.mediator.getPreference(`speeds.${type}`)).length + 1;
            i += 1
        ) {
            speedLimits.appendChild(this.createSpeedOptionLine(i, false));
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

        tabPane.innerHTML = panelDiv.innerHTML;
        // Add event listeners
        const prefElements = document.querySelectorAll('.prefElement');
        prefElements.forEach((element) => {
            element.addEventListener('change', this.handleUserUpdatedSVLPreferences.bind(this));
        });

        (<HTMLButtonElement>document
            .getElementById('svl_saveNewPref')
        ).addEventListener('click', this.handleSaveNewPrefClick.bind(this));
        (<HTMLButtonElement>document
            .getElementById('svl_rollbackButton'))
            .addEventListener('click', this.handleRollbackPreferencesClick.bind(this));
        (<HTMLButtonElement>document
            .getElementById('svl_resetButton'))
            .addEventListener('click', this.handleResetPreferencesClick.bind(this));
        (<HTMLButtonElement>document
            .getElementById('svl_importButton'))
            .addEventListener('click', this.handleImportPreferencesClick.bind(this));
        (<HTMLButtonElement>document
            .getElementById('svl_exportButton'))
            .addEventListener('click', this.handleExportPreferencesClick.bind(this));
        this.updatePreferenceValues();
    }
    private handleResetPreferencesClick() {
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_RESET_REQUEST);
    }

    private handleImportPreferencesClick() {
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_IMPORT_REQUEST);
    }

    private handleExportPreferencesClick() {
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_EXPORT_REQUEST);
    }

    private handleSaveNewPrefClick() {
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_SAVE_REQUEST);
    }

    private handleRollbackPreferencesClick() {
        this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_ROLLBACK_REQUEST);
    }

    private handleUserUpdatedSVLPreferences() {
        (<HTMLDivElement>document.getElementById('svl_buttons')).classList.add('svl_unsaved');
        const saveNewButton = <HTMLButtonElement>document.getElementById('svl_saveNewPref');
        saveNewButton.classList.remove('disabled');
        saveNewButton.disabled = false;
        saveNewButton.classList.add('btn-primary');
        this.mediator.notify(this, AcceptedControllerEvents.USER_UPDATED_SVL_PREFERENCES);
    }

    private updateStreetsPreferenceValues() {
        const streetsPreferences = this.mediator.getPreference('streets');
        for (let i = 0; i < streetsPreferences.length; i += 1) {
            if (streetsPreferences[i]) {
                (<HTMLInputElement>document.getElementById(`svl_streetWidth_${i}`)).value =
                    streetsPreferences[i]['strokeWidth'];
                (<HTMLInputElement>document.getElementById(`svl_streetColor_${i}`)).value =
                    streetsPreferences[i]['strokeColor'];
                (<HTMLInputElement>document.getElementById(`svl_strokeDashstyle_${i}`)).value =
                    streetsPreferences[i]['strokeDashstyle'];
            }
        }
    }

    /**
     * This function updates the values shown on the preference panel with the one saved in the preferences object.
     *
     */
    private updatePreferenceValues() {
        const saveNewButton = <HTMLButtonElement>document.getElementById('svl_saveNewPref');
        saveNewButton.classList.add('disabled');
        saveNewButton.disabled = true;
        saveNewButton.classList.remove('btn-primary');

        const rollbackButton = <HTMLButtonElement>document.getElementById('svl_rollbackButton');
        rollbackButton.classList.add('disabled');
        rollbackButton.disabled = true;
        (<HTMLDivElement>document.getElementById('svl_buttons')).classList.remove('svl_unsaved');
        this.updateStreetsPreferenceValues();

        const options = this.getOptions();
        options['streets'].forEach((o) => {
            const streetPreference = this.mediator.getPreference(o);
            if (o !== 'red') {
                (<HTMLInputElement>document.getElementById(`svl_streetWidth_${o}`)).value =
                    streetPreference['strokeWidth'];
            }
            (<HTMLInputElement>document.getElementById(`svl_streetColor_${o}`)).value =
                streetPreference['strokeColor'];
            (<HTMLInputElement>document.getElementById(`svl_strokeDashstyle_${o}`)).value =
                streetPreference['strokeDashstyle'];
        });

        options['decorations'].forEach((o) => {
            const decorationPreference = this.mediator.getPreference(o);
            if (
                [
                    'dirty',
                    'lanes',
                    'toll',
                    'restriction',
                    'closure',
                    'headlights',
                    'nearbyHOV',
                ].includes(o)
            ) {
                (<HTMLInputElement>document.getElementById(`svl_streetOpacity_${o}`)).value =
                    (decorationPreference['strokeOpacity'] * 100.0).toString();
            } else {
                (<HTMLInputElement>document.getElementById(`svl_streetWidth_${o}`)).value =
                    decorationPreference['strokeWidth'];
            }
            (<HTMLInputElement>document.getElementById(`svl_streetColor_${o}`)).value =
                decorationPreference['strokeColor'];
            (<HTMLInputElement>document.getElementById(`svl_strokeDashstyle_${o}`)).value =
                decorationPreference['strokeDashstyle'];
        });

        (<HTMLInputElement>document.getElementById('svl_fakelock')).value = this.mediator.getPreference('fakelock') ?? 6;
        (<HTMLInputElement>document.getElementById('svl_autoReload_enabled')).checked =
            this.mediator.getPreference('autoReload.enabled');
        (<HTMLInputElement>document.getElementById('svl_labelOutlineWidth')).value =
            this.mediator.getPreference('labelOutlineWidth');
        (<HTMLInputElement>document.getElementById('svl_autoReload_interval')).value =
            (this.mediator.getPreference('autoReload.interval') / 1000).toString();

        (<HTMLInputElement>document.getElementById('svl_clutterConstant')).value =
            this.mediator.getPreference('clutterConstant');
        (<HTMLInputElement>document.getElementById('svl_closeZoomLabelSize')).value =
            this.mediator.getPreference('closeZoomLabelSize');
        (<HTMLInputElement>document.getElementById('svl_farZoomLabelSize')).value =
            this.mediator.getPreference('farZoomLabelSize');
        (<HTMLInputElement>document.getElementById('svl_arrowDeclutter')).value =
            this.mediator.getPreference('arrowDeclutter');
        (<HTMLInputElement>document.getElementById('svl_useWMERoadLayerAtZoom')).value =
            this.mediator.getPreference('useWMERoadLayerAtZoom');
        (<HTMLInputElement>document.getElementById('svl_switchZoom')).value =
            this.mediator.getPreference('switchZoom');
        (<HTMLInputElement>document.getElementById('svl_nodesThreshold')).value =
            this.mediator.getPreference('nodesThreshold');

        (<HTMLInputElement>document.getElementById('svl_nodeRadius')).value =
            this.mediator.getPreference('nodeRadius');
        (<HTMLInputElement>document.getElementById('svl_nodeColor')).value =
            this.mediator.getPreference('nodeColor');
        (<HTMLInputElement>document.getElementById('svl_nodeDeadEndColor')).value =
            this.mediator.getPreference('nodeDeadEndColor');
        (<HTMLInputElement>document.getElementById('svl_virtualNodeColor')).value =
            this.mediator.getPreference('virtualNodeColor');

        (<HTMLInputElement>document.getElementById('svl_segmentsThreshold')).value =
            this.mediator.getPreference('segmentsThreshold');

        (<HTMLInputElement>document.getElementById('svl_disableRoadLayers')).checked =
            this.mediator.getPreference('disableRoadLayers');
        (<HTMLInputElement>document.getElementById('svl_startDisabled')).checked =
            this.mediator.getPreference('startDisabled');
        (<HTMLInputElement>document.getElementById('svl_showUnderGPSPoints')).checked =
            this.mediator.getPreference('showUnderGPSPoints');
        (<HTMLInputElement>document.getElementById('svl_routingModeEnabled')).checked =
            this.mediator.getPreference('routingModeEnabled');
        (<HTMLInputElement>document.getElementById('svl_hideRoutingModeBlock')).checked =
            this.mediator.getPreference('hideRoutingModeBlock');
        (<HTMLInputElement>document.getElementById('svl_showANs')).checked =
            this.mediator.getPreference('showANs');

        (<HTMLInputElement>document.getElementById('svl_layerOpacity')).value =
            String(this.mediator.getPreference('layerOpacity') * 100);

        // Speed limits
        (<HTMLInputElement>document.getElementById('svl_showSLtext')).checked =
            this.mediator.getPreference('showSLtext');
        (<HTMLInputElement>document.getElementById('svl_showSLcolor')).checked =
            this.mediator.getPreference('showSLcolor');
        (<HTMLInputElement>document.getElementById('svl_showSLSinglecolor')).checked =
            this.mediator.getPreference('showSLSinglecolor');
        (<HTMLInputElement>document.getElementById('svl_SLColor')).value =
            this.mediator.getPreference('SLColor');
        (<HTMLInputElement>document.getElementById('svl_realsize')).checked =
            this.mediator.getPreference('realsize');

        const segmentWidths = <NodeListOf<HTMLInputElement>>(document.querySelectorAll('input.segmentsWidth'));
        segmentWidths.forEach((el) => {
            el.disabled = this.mediator.getPreference('realsize');
        });

        // Toggle metric/decimal
        const WMEUsesImperial = this.mediator.wmeSDK.Settings.getUserSettings().isImperial;
        const type = WMEUsesImperial ? 'imperial' : 'metric';
        const speeds = Object.keys(this.mediator.getPreference(`speeds.${type}`));
        const slLinesToHide = <NodeListOf<HTMLDivElement>>document.querySelectorAll(
            `div.svl_${type}`
        );
        slLinesToHide.forEach((el) => {
            el.style.display = 'none';
        });
        const slLinesToShow = <NodeListOf<HTMLDivElement>>document.querySelectorAll(`div.svl_${type}`);
        slLinesToShow.forEach((el) => {
            el.style.display = 'block';
        });
        for (let i = 1; i < speeds.length + 1; i += 1) {
            (<HTMLInputElement>document.getElementById(`svl_slValue_${type}_${i}`)).value = speeds[i - 1];
            (<HTMLInputElement>document.getElementById(`svl_slColor_${type}_${i}`)).value =
                this.mediator.getPreference(`speeds.${type}.${speeds[i - 1]}`);
        }

        (<HTMLInputElement>document.getElementById(`svl_slColor_${type}_Default`)).value =
            this.mediator.getPreference(`speeds.default`);
    }

    /**
     *
     * @param {{id:string,title:string,description:string,isNew:(string|undefined)}} param0
     */
    private createCheckboxOption({ id, title, description, isNew }: { id: string; title: string; description: string; isNew?: (string | undefined); }) {
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
    }: { i: (string | number), showWidth?: boolean, showOpacity?: boolean }) {
        const title = document.createElement('h6');
        title.innerText = this.getLocalisedString(i);

        const color = this.createInput({
            id: `streetColor_${i}`,
            className: 'prefElement form-control',
            title: this.mediator._('color'),
            type: 'color',
        });
        color.style['width'] = '55pt';

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
            });
            width.style['width'] = '40pt';
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
            });
            opacity.style['width'] = '45pt';
            inputs.appendChild(opacity);
        }

        const select = this.createDashStyleDropdown(`strokeDashstyle_${i}`);
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

    private createDashStyleDropdown(id: string) {
        const newSelect = <HTMLSelectElement>document.createElement('select');
        newSelect.className = 'prefElement';
        newSelect.title = 'Stroke style';
        newSelect.id = `svl_${id}`;
        newSelect.innerHTML = `<option value="solid">${this.mediator._('line_solid')}</option>
       <option value="dash">${this.mediator._('line_dash')}</option>
       <option value="dashdot">${this.mediator._('line_dashdot')}</option>
       <option value="longdash">${this.mediator._('line_longdash')}</option>
       <option value="longdashdot">${this.mediator._('line_longdashdot')}</option>
       <option value="dot">${this.mediator._('line_dot')}</option>`;
        return newSelect;
    }

    // This rather belongs in the localitation controller!
    private getLocalisedString(i: (string | number)) {
        const locale = I18n.translations[I18n.locale];
        switch (i) {
            case 'red':
                return locale?.['segment']?.['address']?.['none'] ?? i;
            case 'toll':
                return locale?.['edit']?.['segment']?.['fields']?.['toll_road'] ?? i;
            case 'restriction':
                return (
                    locale?.['restrictions']?.['modal_headers']?.[
                    'restriction_summary'
                    ] ?? i
                );
            case 'dirty':
                return locale?.['edit']?.['segment']?.['fields']?.['unpaved'] ?? i;
            case 'closure':
                return locale?.['objects']?.['roadClosure']?.['name'] ?? i;
            case 'headlights':
                return locale?.['edit']?.['segment']?.['fields']?.['headlights'] ?? i;
            case 'lanes':
                return locale?.['objects']?.['lanes']?.['title'] ?? i;
            case 'speed limit':
                return locale?.['edit']?.['segment']?.['fields']?.['speed_limit'] ?? i;
            case 'nearbyHOV':
                return locale?.['edit']?.['segment']?.['fields']?.['nearbyHOV'] ?? i;
            default:
        }
        return locale?.['segment']?.['road_types'][i] ?? i; // jshint ignore:line
    }

    private getOptions() {
        return {
            'streets': ['red'],
            'decorations': [
                'lanes',
                'toll',
                'restriction',
                'closure',
                'headlights',
                'dirty',
                'nearbyHOV',
            ],
        };
    }

    private createSpeedOptionLine(i: (number | string), metric = true) {
        const type = metric ? 'metric' : 'imperial';
        // const title = document.createElement("h6");
        // title.innerText = getLocalisedString("speed limit");
        // title.inner
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
            slValue.style['width'] = '50pt';
            inputs.appendChild(slValue);

            const span = document.createElement('span');
            span.innerText = metric ? this.mediator._('kmh') : this.mediator._('mph');
            inputs.appendChild(span);
        }

        const color = this.createInput({
            id: `slColor_${type}_${i}`,
            className: 'prefElement form-control',
            type: 'color',
            title: this.mediator._('color'),
        });
        color.style['width'] = '55pt';

        inputs.className = 'expand';
        inputs.appendChild(color);

        const line = document.createElement('div');
        line.className = `svl_${type} prefLineSL`;
        line.appendChild(inputs);

        return line;
    }

    /**
   *
   * @param {{id:string,title:string,description:string,min:number,max:number,step:(number|undefined),isNew:(string|undefined)}} param0
   */
    private createIntegerOption({
        id,
        title,
        description,
        min,
        max,
        step,
        isNew,
    }: { id: string; title: string; description: string; min: number; max: number; step: (number | undefined); isNew?: (string | undefined); }) {
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
}