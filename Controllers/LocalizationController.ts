import AbstractController from "./AbstractController";
import SVLMediator from "../SVLMediator";

export default class LocalizationController extends AbstractController {
    // Singleton pattern
    private static instance: LocalizationController | null = null;
    readonly tr: { [s: string]: Array<string>; } = {};
    readonly tr_keys: { [s: string]: number; } = {};
    private locale: string;
    private readonly fallback: Record<string, string> = {};
    private areOnlineTranslationsLoaded: boolean = false;

    private constructor({ mediator }: { mediator: SVLMediator }) {
        super(mediator);
        // Private constructor to prevent direct instantiation
        this.locale = this.mediator.wmeSDK.Settings.getLocale()?.localeCode || 'en';
    }

    public static async initialize({ mediator }: { mediator: SVLMediator }): Promise<LocalizationController> {
        if (!LocalizationController.instance) {
            LocalizationController.instance = new LocalizationController({ mediator });
            let success = await LocalizationController.instance.loadTranslations();
            if (!success) {
                console.warn("LocalizationController: Could not load online translations, using fallback translations.");
                LocalizationController.instance.setAllFallbackTranslations();
            } else {
                LocalizationController.instance.setMinimalFallbackTranslations();
                if (__DEBUG__) {
                    console.info("LocalizationController: Online translations loaded successfully.");
                }
            }
            return LocalizationController.instance;
        } else {
            throw new Error("LocalizationController is already initialized.");
        }
    }

    public getOnlineTranslationsLoaded(): boolean {
        return this.areOnlineTranslationsLoaded;
    }


    private setAllFallbackTranslations() {
        for (let i = 0; i < this.fallbackSource.length; i++) {
            this.fallback[this.fallbackSource[i].key] = this.fallbackSource[i].value;
        }
        this.fallbackSource = [];
    }

    private setMinimalFallbackTranslations(setAll = false) {
        for (let i = 0; i < this.fallbackSource.length; i++) {
            let item = this.fallbackSource[i];
            const key_index = this.tr_keys[item.key];
            if (key_index) {
                if (this.locale && this.tr[this.locale] && this.tr[this.locale][key_index]) {
                    continue; //skip if local translation exists
                }
                if (this.tr['en'] && this.tr['en'][key_index]) {
                    continue; //skip if online translation exists
                }
            }
            this.fallback[item.key] = item.value;
        }
        this.fallbackSource = [];
    }

    /**
     * Perform a GM_xmlhttpRequest as a promise
     * @param {Tampermonkey.Request<any>} opt
     * @return {Promise}
     */
    private request(opt: Tampermonkey.Request<any>): Promise<any> {
        if (!opt || !opt.method || !opt.url)
            return Promise.reject('Invalid parameters for request()');
        Object.assign(opt, {
            timeout: 30000, //in ms
        })

        return new Promise((resolve, reject) => {
            opt.onerror = opt.ontimeout = reject;
            opt.onload = resolve;
            GM_xmlhttpRequest(opt);
        })
    }

    private async loadTranslations(): Promise<boolean> {
        //console.debug('Loading translations...');
        const response = await this.request(
            {
                method: 'GET',
                url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjug3umcYtdN9iVQc2SAqfK03o6HvozEEoxBrdg_Xf73Dt6TuApRCmT_V6UIIkMyVjRjKydl9CP8qE/pub?gid=565129786&single=true&output=tsv'
            }
        );

        if (response.readyState === 4 && response.status === 200) {
            const data = response.responseText;
            let temp = data.split('\n');
            for (const [i, line] of temp.entries()) {
                if (i > 0) {
                    const [first, ...rest] = line.split('\t');
                    this.tr[first] = rest.map((e: string) => e.trim());
                } else {
                    const [, ...rest] = line.split('\t');
                    for (const [j, value] of rest.entries()) {
                        this.tr_keys[value.trim()] = parseInt(j, 10);
                    }
                }
            }
            this.areOnlineTranslationsLoaded = true;
            this.setMinimalFallbackTranslations();
            return true;
        }
        return false;
    }

    public static getInstance(): LocalizationController {
        if (!LocalizationController.instance) {
            throw new Error("LocalizationController is not initialized. Call LocalizationController.initialize() first.");
        }
        return LocalizationController.instance;
    }

    private invalidTranslation(key: string): string {
        console.error('[SVL] Invalid translation key: ' + key);
        return '<invalid translation key>';
    }

    /**
 *
 * @param {string} key
 * @returns {string}
 */
    public translate(key: string, ...args: any[]): string {
        const key_index = this.tr_keys[key];
        if (typeof key_index === 'undefined' && Object.keys(this.tr).length > 0) {
            const local_key = this.fallback[key];
            if (typeof local_key === 'undefined') {
                return this.invalidTranslation(key);
            }
            return this.fallback[key];
        }
        const locale = this.locale || 'en';
        if (this.tr[locale]) {
            if (this.tr[locale][key_index] && this.tr[locale][key_index] !== '') {
                return this.tr[locale][key_index];
            }
        }
        if (this.tr['en'] && this.tr['en'][key_index]) {
            return this.tr['en'][key_index];
        }
        return this.fallback[key];
    }

    private fallbackSource = [
        { key: `completition_percentage`, value: `100%` },
        { key: `language_code`, value: `en` },
        { key: `translation_thanks`, value: `translated in your language thanks to:` },
        { key: `would_you_like_to_help`, value: `Would you like to help?` },
        { key: `fully_translated_in`, value: `Fully translated in your language thanks to:` },
        { key: `translated_by`, value: `bedo2991` },
        { key: `routing_mode_panel_title`, value: `SVL's Routing Mode` },
        { key: `routing_mode_panel_body`, value: `Hover to temporarily disable it` },
        { key: `thanks_for_using`, value: `Thanks for using` },
        { key: `version`, value: `Version` },
        { key: `something_not_working`, value: `Something not working?` },
        { key: `report_it_here`, value: `Report it here` },
        { key: `reset`, value: `Reset` },
        { key: `reset_help`, value: `Overwrite your current settings with the default ones` },
        { key: `rollback`, value: `Rollback` },
        { key: `rollback_help`, value: `Discard your temporary changes` },
        { key: `save`, value: `Save` },
        { key: `save_help`, value: `Save your edited settings` },
        { key: `settings_backup`, value: `Settings Backup` },
        { key: `import`, value: `Import` },
        { key: `export`, value: `Export` },
        { key: `new_since_version`, value: `New since v.` },
        { key: `whats_new`, value: `What's new?` },
        { key: `first_time`, value: `This is the first time that you run Street Vector Layer in this browser.` },
        { key: `some_info`, value: `Some info about it:` },
        { key: `default_shortcut_instruction`, value: `By default, use ALT+L to toggle the layer.` },
        { key: `instructions_1`, value: `You can change the streets color, thickness and style using the panel on the left sidebar.` },
        { key: `instructions_2`, value: `Your preferences will be saved for the next time in your browser.` },
        { key: `instructions_3`, value: `The other road layers will be automatically hidden (you can change this behaviour in the preference panel).` },
        { key: `instructions_4`, value: `Have fun and tell us on the Waze forum if you liked the script!` },
        { key: `roads_properties`, value: `Roads Properties` },
        { key: `segments_decorations`, value: `Segments Decorations` },
        { key: `rendering_parameters`, value: `Rendering Parameters` },
        { key: `speed_limits`, value: `Speed Limits` },
        { key: `performance_tuning`, value: `Performance Tuning` },
        { key: `utilities`, value: `Utilities` },
        { key: `svl_standard_layer`, value: `SVL Standard` },
        { key: `wme_colors_layer`, value: `WME Colors` },
        { key: `preset_applied`, value: `Preset applied, don't forget to save your changes!` },
        { key: `line_solid`, value: `Solid` },
        { key: `line_dash`, value: `Dashed` },
        { key: `line_dashdot`, value: `Dash Dot` },
        { key: `line_longdash`, value: `Long Dash` },
        { key: `line_longdashdot`, value: `Long Dash Dot` },
        { key: `line_dot`, value: `Dot` },
        { key: `color`, value: `Color` },
        { key: `opacity`, value: `Opacity` },
        { key: `width`, value: `Width` },
        { key: `width_disabled`, value: `disabled if using real-size width` },
        { key: `svl_logo`, value: `Street Vector Layer Logo` },
        { key: `preferences_saved`, value: `Preferences saved!` },
        { key: `preferences_saving_error`, value: `Could not save the preferences, your browser local storage seems to be full.` },
        { key: `preferences_rollback`, value: `All's well that ends well! Now it's everything as it was before.` },
        {
            key: `export_preferences_message`, value: `The configuration has been copied to your clipboard.
Please paste it in a file (CTRL+V) to store it.`},
        { key: `preferences_parsing_error`, value: `Your string seems to be somehow wrong. Please check that is a valid JSON string` },
        { key: `preferences_imported`, value: `Done, preferences imported!` },
        { key: `preferences_importing_error`, value: `Something went wrong. Is your string correct?` },
        { key: `preferences_import_prompt`, value: `N.B: your current preferences will be overwritten with the new ones. Export them first in case you want to go back to the previous status!` },
        { key: `preferences_import_prompt_2`, value: `Paste your string here:` },
        { key: `preferences_reset_message`, value: `Preferences have been reset to the default values` },
        { key: `preferences_reset_question`, value: `Are you sure you want to rollback to the default settings?` },
        { key: `preferences_reset_question_2`, value: `ANY CHANGE YOU MADE TO YOUR PREFERENCES WILL BE LOST!` },
        { key: `preferences_reset_yes`, value: `Yes, I want to reset` },
        { key: `preferences_reset_cancel`, value: `No, cancel` },
        { key: `cancel`, value: `Cancel` },
        { key: `speed_limit_value`, value: `Speed Limit Value` },
        { key: `kmh`, value: `km/h` },
        { key: `mph`, value: `mph` },
        { key: `true_or_false`, value: `True or False` },
        { key: `insert_number`, value: `Insert a number` },
        { key: `pick_a_value_slider`, value: `Pick a value using the slider` },
        { key: `svl_version`, value: `SVL v.` },
        { key: `preferences_moved`, value: `The preferences have been moved to the sidebar on the left. Please look for the ""SVL 🗺️"" tab.` },
        { key: `init_error`, value: `Street Vector Layer failed to initialize. Maybe the Editor has been updated or your connection/pc is really slow.` },
        { key: `bootstrap_error`, value: `Street Vector Layer failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!` },
        { key: `use_reallife_width`, value: `Use real-life Width` },
        { key: `use_reallife_width_descr`, value: `When enabled, the segments thickness will be computed from the road's width instead of using the value set in the preferences` },
        { key: `road_themes_title`, value: `Road Themes` },
        { key: `road_themes_descr`, value: `Applies a predefined theme to your preferences` },
        { key: `show_ans`, value: `Show Alternative Names` },
        { key: `show_ans_descr`, value: `When enabled, at most 2 ANs that differ from the primary name are shown under the street name.` },
        { key: `layer_opacity`, value: `Layer Opacity` },
        { key: `layer_opacity_descr`, value: `10: almost invisible, 100: opaque.` },
        { key: `enable_routing_mode`, value: `Enable Routing Mode` },
        { key: `enable_routing_mode_descr`, value: `When enabled, roads are rendered by taking into consideration their routing attribute. E.g. a preferred Minor Highway is shown as a Major Highway.` },
        { key: `hide_routing_mode_panel`, value: `Hide the Routing Mode Panel` },
        { key: `hide_routing_mode_panel_descr`, value: `When enabled, the overlay to temporarily disable the routing mode is not shown.` },
        { key: `gps_layer_above_roads`, value: `GPS Layer above Roads` },
        { key: `gps_layer_above_roads_descr`, value: `When enabled, the GPS tracks layer gets shown above the road layer.` },
        { key: `label_width`, value: `Labels Outline Width` },
        { key: `label_width_descr`, value: `How much border should the labels have?` },
        { key: `hide_road_layer`, value: `Hide WME Road Layer` },
        { key: `hide_road_layer_descr`, value: `When enabled, the WME standard road layer gets hidden automatically.` },
        { key: `svl_initially_disabled`, value: `SVL Initially Disabled` },
        { key: `svl_initially_disabled_descr`, value: `When enabled, the SVL does not get enabled automatically.` },
        { key: `street_names_density`, value: `Street Names Density` },
        { key: `street_names_density_descr`, value: `For a higher value, less elements will be shown.` },
        { key: `render_geometry_nodes`, value: `Render Geometry Nodes` },
        { key: `render_geometry_nodes_descr`, value: `When enabled, the geometry nodes are drawn, too.` },
        { key: `render_as_level`, value: `Render Map as Level` },
        { key: `render_as_level_descr`, value: `All segments locked above this level will be stroked through with a black line.` },
        { key: `font_size_close`, value: `Font Size (at close zoom)` },
        { key: `font_size_close_descr`, value: `Increase this value if you can't read the street names because they are too small.` },
        { key: `limit_arrows`, value: `Limit Arrows` },
        { key: `limit_arrows_descr`, value: `Increase this value if you want less arrows to be shown on streets (this may increase the script's performance).` },
        { key: `far_zoom_only`, value: `Far-zoom only` },
        { key: `close_zoom_only`, value: `Close-zoom only` },
        { key: `font_size_far`, value: `Font Size (at far zoom)` },
        { key: `font_size_far_descr`, value: `Increase this value if you can't read the street names because they are too small.` },
        { key: `hide_minor_roads`, value: `Hide minor roads at zoom 15` },
        { key: `hide_minor_roads_descr`, value: `The WME loads some type of roads when they probably shouldn't be there, check this option for avoid displaying them at higher zooms.` },
        { key: `automatically_refresh`, value: `Automatically Refresh the Map` },
        { key: `automatically_refresh_descr`, value: `When enabled, SVL refreshes the map automatically after a certain timeout if you're not editing.` },
        { key: `autoreload_interval`, value: `Auto Reload Time Interval (in Seconds)` },
        { key: `autoreload_interval_descr`, value: `How often should the WME be refreshed for new edits?` },
        { key: `stop_svl_at_zoom`, value: `Stop using SVL at zoom level` },
        { key: `stop_svl_at_zoom_descr`, value: `When you reach this zoom level, the WME's road layer gets automatically enabled.` },
        { key: `close_zoom_until_level`, value: `Close-zoom until zoom level` },
        { key: `close_zoom_until_level_descr`, value: `When the zoom is lower then this value, it will switch to far-zoom mode (rendering less details)` },
        { key: `segments_threshold`, value: `Segments threshold` },
        { key: `segments_threshold_descr`, value: `When the WME wants to draw more than this amount of segments, switch to the WME's road layer` },
        { key: `nodes_threshold`, value: `Nodes threshold` },
        { key: `nodes_threshold_descr`, value: `When the WME wants to draw more than this amount of nodes, switch to the WME's road layer` },
        { key: `show_sl_on_name`, value: `Show on the Street Name` },
        { key: `show_sl_on_name_descr`, value: `Show the speed limit as text at the end of the street name.` },
        { key: `show_sl_with_colors`, value: `Show using colors` },
        { key: `show_sl_with_colors_descr`, value: `Show the speed limit by coloring the segment's outline.` },
        { key: `show_sl_with_one_color`, value: `Show using Single Color` },
        { key: `show_sl_with_one_color_descr`, value: `Show the speed limit by coloring the segment's outline with a single color instead of a different color depending on the speed limit's value.` },
        { key: `show_unverified_dashed`, value: `Show unverified Speed Limits with a dashed Line` },
        { key: `show_unverified_dashed_descr`, value: `If the speed limit is not verified, it will be shown with a different style.` },
        { key: `shortcut_cannot_be_set`, value: `Street Vector Layer could not add its default shortcut (Shift + s). Open the WME shortcut section to set it to your favorite key combination.` },
        { key: `zoom_in_for_svl`, value: `Please zoom in to use SVL` },
        { key: `node_color`, value: `Nodes color` },
        { key: `node_color_descr`, value: `This is the color of connected nodes.` },
        { key: `dead_end_node_color`, value: `Dead end nodes color` },
        { key: `dead_end_node_color_descr`, value: `The color of nodes that are only connected to 1 segment.` },
        { key: `virtual_node_color`, value: `Virtual nodes color` },
        { key: `virtual_node_color_descr`, value: `These are nodes that connect non-drivable segments with roads, without splitting them.` },
        { key: `node_size`, value: `Nodes size` },
        { key: `node_size_descr`, value: `Increase this value if nodes are too small.` },
        { key: `pick_a_color`, value: `Pick a color` },
        { key: `svl_disabled`, value: `SVL is disabled` },
        { key: `svl_active`, value: `SVL is active` },
        { key: `svl_active_far_zoom`, value: `SVL is active (Far Zoom)` },
        { key: `svl_paused_auto`, value: `SVL is paused (auto-disabled due to zoom/clutter)` },
        { key: `svl_paused_aborted`, value: `SVL is paused (drawing aborted)` },
        { key: `svl_disabled_user`, value: `SVL is disabled by user` },
    ];
}