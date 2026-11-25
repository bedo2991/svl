import { KeyboardShortcut } from "wme-sdk-typings";
import { AcceptedControllerEvents, DashStyle, DEFAULT_PREFERENCES, SVLLayerState } from "../svlGlobals";
import SVLMediator from "../SVLMediator";
import AbstractController from "./AbstractController";
import { AlertType, SVLEvents } from "./AbstractMediator";
import PreferencesController from "./PreferencesController";
import Utils from "../Utils";

type StatusIconKind = 'play' | 'pause' | 'stop';

const CHEVRON_SVG_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="black" d="M4.47 5.47a.75.75 0 0 1 1.06 0L8 7.94l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z"/></svg>'
)}`;

export default class UserInterfaceController extends AbstractController {
    // Singleton pattern
    private static instance: UserInterfaceController;
    private static readonly SHORTCUT_ID = 'svl';

    private preferencesController!: PreferencesController;
    private badgeElement: HTMLElement | null = null;
    private badgeRetryTimeoutId: number | undefined;
    private shortcutSyncTimeoutId: number | undefined;
    private dialogObserver: MutationObserver | null = null;
    private shortcutListenersRegistered = false;
    private roadTypeNames: Map<number, string> = new Map();
    private preSearchOpenState: Map<HTMLDetailsElement, boolean> | null = null;

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
                <br>- 8.3.1 - New: Option to display more labels, even between different segments. Brand new settings panel. Fixed: layer shortcut not being preserved.
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

    private getDesiredShortcutKeys(): string | null {
        const raw = this.mediator.getPreference('shortcutKeys');
        if (raw === undefined) {
            return DEFAULT_PREFERENCES.shortcutKeys;
        }
        if (raw === null) {
            return null;
        }
        return Utils.normalizeShortcutKeys(raw);
    }

    private async registerShortcutFromPreferences(): Promise<void> {
        const desiredShortcut = this.getDesiredShortcutKeys();

        const toggleShortcut: KeyboardShortcut = {
            callback: () => {
                UserInterfaceController.instance.mediator.notify(
                    UserInterfaceController.instance,
                    AcceptedControllerEvents.KEYBOARD_SHORTCUT_TRIGGERED
                );
            },
            description: "Toggle SVL",
            shortcutId: UserInterfaceController.SHORTCUT_ID,
            shortcutKeys: desiredShortcut,
        };

        if (desiredShortcut === null) {
            try {
                await this.mediator.wmeSDK.Shortcuts.createShortcut(toggleShortcut);
                this.debugLog('Empty keyboard shortcut successfully added.');
            } catch (e) {
                console.error('SVL: Error while adding the empty keyboard shortcut:', e);
            }
            return;
        }

        if (!(await this.mediator.wmeSDK.Shortcuts.areShortcutKeysInUse({
            shortcutKeys: desiredShortcut
        }))) {
            try {
                await this.mediator.wmeSDK.Shortcuts.createShortcut(toggleShortcut);
                this.debugLog('Keyboard shortcut successfully added.');
            } catch (e) {
                this.mediator.alert(AlertType.ERROR, 'Street Vector Layer could not add its default shortcut.');
                console.error('SVL: Error while adding the keyboard shortcut:', e);
                try {
                    toggleShortcut.shortcutKeys = null;
                    await this.mediator.wmeSDK.Shortcuts.createShortcut(toggleShortcut);
                    this.mediator.notify(this, AcceptedControllerEvents.KEYBOARD_SHORTCUT_CHANGED, null);
                } catch (e2) {
                    console.error('SVL: Error while adding the empty keyboard shortcut:', e2);
                }
            }
        } else {
            const conflictMessage = desiredShortcut === DEFAULT_PREFERENCES.shortcutKeys
                ? this.mediator._('shortcut_cannot_be_set')
                : this.mediator._('shortcut_cannot_be_set').replace(/\(Shift\s*\+\s*s\)/i, `(${desiredShortcut})`);
            setTimeout(() => {
                this.mediator.alert(AlertType.WARNING, conflictMessage);
            }, 3000);
            try {
                toggleShortcut.shortcutKeys = null;
                await this.mediator.wmeSDK.Shortcuts.createShortcut(toggleShortcut);
                this.mediator.notify(this, AcceptedControllerEvents.KEYBOARD_SHORTCUT_CHANGED, null);
                this.debugLog('Empty keyboard shortcut successfully added.');
            } catch (e) {
                console.error('SVL: Error while adding the empty keyboard shortcut:', e);
            }
        }
    }

    private async initShortcut(): Promise<void> {
        await this.registerShortcutFromPreferences();
        this.registerShortcutPersistenceListeners();
    }

    public async syncShortcutFromSDK(): Promise<void> {
        if (this.shortcutSyncTimeoutId !== undefined) {
            clearTimeout(this.shortcutSyncTimeoutId);
            this.shortcutSyncTimeoutId = undefined;
        }

        try {
            const allShortcuts = await this.mediator.wmeSDK.Shortcuts.getAllShortcuts();
            const svlShortcut = allShortcuts.find((s: KeyboardShortcut) => s.shortcutId === UserInterfaceController.SHORTCUT_ID);
            if (!svlShortcut) {
                return;
            }

            const normalizedKeys = Utils.normalizeShortcutKeys(svlShortcut.shortcutKeys);
            const storedKeys = this.getDesiredShortcutKeys();
            if (normalizedKeys !== storedKeys) {
                this.debugLog(`Keyboard shortcut updated: ${String(storedKeys)} -> ${String(normalizedKeys)}`);
                this.mediator.notify(this, AcceptedControllerEvents.KEYBOARD_SHORTCUT_CHANGED, normalizedKeys);
            }
        } catch (e) {
            this.debugLog('Failed to synchronize shortcut from SDK:', e);
        }
    }

    private scheduleShortcutSync(delayMs = 150): void {
        if (this.shortcutSyncTimeoutId !== undefined) {
            clearTimeout(this.shortcutSyncTimeoutId);
        }
        this.shortcutSyncTimeoutId = window.setTimeout(() => {
            this.shortcutSyncTimeoutId = undefined;
            void this.syncShortcutFromSDK();
        }, delayMs);
    }

    private ensureDialogObserver(): void {
        if (this.dialogObserver) {
            return;
        }
        const dialogContainer = document.getElementById('wz-dialog-container');
        if (dialogContainer) {
            this.dialogObserver = new MutationObserver(() => {
                this.scheduleShortcutSync();
            });
            this.dialogObserver.observe(dialogContainer, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }
    }

    private isAnyDialogOpen(): boolean {
        this.ensureDialogObserver();
        return (
            (document.getElementById('wz-dialog-container')?.childElementCount ?? 0) > 0 ||
            Boolean(document.querySelector('wz-dialog, dialog[open], [role="dialog"]'))
        );
    }

    private registerShortcutPersistenceListeners(): void {
        if (this.shortcutListenersRegistered) {
            return;
        }
        this.shortcutListenersRegistered = true;

        this.ensureDialogObserver();

        const handleDialogInteraction = (): void => {
            if (this.isAnyDialogOpen()) {
                this.scheduleShortcutSync(150);
            }
        };

        document.addEventListener('keyup', handleDialogInteraction, true);
        document.addEventListener('click', handleDialogInteraction, true);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                void this.syncShortcutFromSDK();
            }
        });
        (unsafeWindow ?? window).addEventListener('beforeunload', () => {
            void this.syncShortcutFromSDK();
        });
    }

    private async syncShortcutWithPreferences(): Promise<void> {
        if (this.shortcutSyncTimeoutId !== undefined) {
            await this.syncShortcutFromSDK();
        }

        try {
            const allShortcuts = await this.mediator.wmeSDK.Shortcuts.getAllShortcuts();
            const existing = allShortcuts.find((s: KeyboardShortcut) => s.shortcutId === UserInterfaceController.SHORTCUT_ID);
            const currentKeys = existing ? Utils.normalizeShortcutKeys(existing.shortcutKeys) : undefined;
            const desiredKeys = this.getDesiredShortcutKeys();

            if (currentKeys !== desiredKeys) {
                if (await this.mediator.wmeSDK.Shortcuts.isShortcutRegistered({ shortcutId: UserInterfaceController.SHORTCUT_ID })) {
                    await this.mediator.wmeSDK.Shortcuts.deleteShortcut({ shortcutId: UserInterfaceController.SHORTCUT_ID });
                }
                await this.registerShortcutFromPreferences();
            }
        } catch (e) {
            this.debugLog('Failed to synchronize SDK shortcut with preferences:', e);
        }
    }

    private updateRangeProgressCssVar(input: HTMLInputElement): void {
        if (typeof CSS !== 'undefined' && CSS.supports('accent-color', '#0b57d0')) {
            return;
        }
        const min = input.min !== '' ? parseFloat(input.min) : 0;
        const max = input.max !== '' ? parseFloat(input.max) : 100;
        const val = parseFloat(input.value);
        if (!Number.isNaN(val) && max > min) {
            const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
            input.style.setProperty('--progress', `${pct}%`);
        }
    }

    private createRangeOption({
        id,
        title,
        description,
        min,
        max,
        step,
        unit = '',
        isNew,
    }: { id: string; title: string; description: string; min: number; max: number; step?: number; unit?: string; isNew?: string }) {
        const line = document.createElement('div');
        line.className = 'svl-field prefLineSlider svl-filterable-item';
        line.dataset.searchText = `${title} ${description}`.toLowerCase();
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }

        const headerRow = document.createElement('div');
        headerRow.className = 'svl-field-header';

        const inputId = `svl_${id}`;
        const descId = `svl_desc_${id}`;

        const label = document.createElement('label');
        label.htmlFor = inputId;
        label.className = 'svl-field-label';
        label.textContent = title;

        const output = document.createElement('output');
        output.id = `svl_output_${id}`;
        output.htmlFor = inputId;
        output.className = 'svl-range-output';
        output.dataset.unit = unit;

        headerRow.appendChild(label);
        headerRow.appendChild(output);
        line.appendChild(headerRow);

        if (description) {
            const hint = document.createElement('span');
            hint.id = descId;
            hint.className = 'svl-field-hint';
            hint.textContent = description;
            line.appendChild(hint);
        }

        const input = this.createInput({
            id,
            min,
            max,
            step,
            title: this.mediator._('pick_a_value_slider'),
            className: 'prefElement svl-range-input',
            type: 'range',
            describedBy: description ? descId : undefined,
        });

        input.addEventListener('input', () => {
            output.textContent = `${input.value}${unit}`;
            this.updateRangeProgressCssVar(input);
        });

        line.appendChild(input);

        return line;
    }

    private createColorOption({
        id,
        title,
        description,
        isNew,
        uniqueId,
    }: { id: string; title: string; description: string; isNew?: string; uniqueId?: string }) {
        const line = document.createElement('div');
        line.className = 'svl-field prefLineCheckbox svl-filterable-item';
        line.dataset.searchText = `${title} ${description}`.toLowerCase();
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }

        const inputId = `svl_${id}`;
        const descId = `svl_desc_${id}`;

        const inlineRow = document.createElement('div');
        inlineRow.className = 'svl-field-inline';

        const textCol = document.createElement('div');
        textCol.className = 'svl-field-text';

        const label = document.createElement('label');
        label.htmlFor = inputId;
        label.className = 'svl-field-label';
        label.textContent = title;
        textCol.appendChild(label);

        if (description) {
            const hint = document.createElement('span');
            hint.id = descId;
            hint.className = 'svl-field-hint';
            hint.textContent = description;
            textCol.appendChild(hint);
        }

        const input = this.createInput({
            id,
            title: this.mediator._('pick_a_color'),
            className: 'prefElement svl-color-input',
            type: 'color',
            uniqueId,
            describedBy: description ? descId : undefined,
        });

        inlineRow.appendChild(textCol);
        inlineRow.appendChild(input);
        line.appendChild(inlineRow);

        return line;
    }

    private createInput({
        id,
        type,
        className,
        title,
        min,
        max,
        step,
        uniqueId,
        describedBy,
    }: {
        id: string;
        type: string;
        className?: string;
        title?: string;
        min?: number;
        max?: number;
        step?: number;
        uniqueId?: string;
        describedBy?: string;
    }) {
        const input = document.createElement('input');
        input.id = 'svl_' + id;
        input.name = 'svl_' + id;
        if (className) {
            input.className = className;
        }
        if (title) {
            input.title = title;
        }
        input.type = type;
        input.dataset.uniqueId = uniqueId ?? id;
        if (describedBy) {
            input.setAttribute('aria-describedby', describedBy);
        }
        if (type === 'range' || type === 'number') {
            input.min = min?.toString() ?? "";
            input.max = max?.toString() ?? "";
            input.step = step?.toString() ?? "";
        }
        if (type === 'number') {
            input.inputMode = step !== undefined && step < 1 ? 'decimal' : 'numeric';
        }
        return input;
    }

    private createDropdownOption({
        id,
        title,
        description,
        options,
        isNew,
    }: { id: string; title: string; description: string; options: { text: string; value: string }[]; isNew?: string }) {
        const line = document.createElement('div');
        line.className = 'svl-field prefLineSelect svl-filterable-item';
        line.dataset.searchText = `${title} ${description}`.toLowerCase();
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }

        const selectId = `svl_${id}`;
        const descId = `svl_desc_${id}`;

        const label = document.createElement('label');
        label.htmlFor = selectId;
        label.className = 'svl-field-label';
        label.textContent = title;
        line.appendChild(label);

        if (description) {
            const hint = document.createElement('span');
            hint.id = descId;
            hint.className = 'svl-field-hint';
            hint.textContent = description;
            line.appendChild(hint);
        }

        const newSelect = document.createElement('select');
        newSelect.className = 'prefElement svl-select';
        newSelect.id = selectId;
        newSelect.name = selectId;
        newSelect.dataset.uniqueId = id;
        if (description) {
            newSelect.setAttribute('aria-describedby', descId);
        }

        if (options && options.length > 0) {
            options.forEach((o) => {
                const option = document.createElement('option');
                option.text = o.text;
                option.value = o.value;
                newSelect.add(option);
            });
        }

        line.appendChild(newSelect);
        return line;
    }

    private createPreferencesSection(name: string, open = false): { details: HTMLDetailsElement; content: HTMLDivElement } {
        const details = document.createElement('details');
        details.className = 'svl-accordion-item';
        details.open = open;

        const summary = document.createElement('summary');
        summary.className = 'svl-accordion-summary';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'svl-summary-title';
        titleSpan.textContent = name;
        summary.appendChild(titleSpan);

        const body = document.createElement('div');
        body.className = 'svl-accordion-body';

        details.appendChild(summary);
        details.appendChild(body);
        return { details, content: body };
    }

    private createFieldsetGroup(legendText: string): HTMLFieldSetElement {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'svl-fieldset';
        const legend = document.createElement('legend');
        legend.className = 'svl-legend';
        legend.textContent = legendText;
        fieldset.appendChild(legend);
        return fieldset;
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
            const notice = document.createElement('span');
            notice.className = 'svl-translation-warning';
            notice.append('SVL is not yet available in your language. Would you like to help translate? ');
            const contactLink = document.createElement('a');
            contactLink.href = 'https://www.waze.com/discuss/t/script-street-vector-layer/250377';
            contactLink.target = '_blank';
            contactLink.rel = 'noopener noreferrer';
            contactLink.textContent = 'Contact bedo2991';
            notice.appendChild(contactLink);
            notice.append('.');
            translationMessage.appendChild(notice);
        } else {
            const errSpan = document.createElement('span');
            errSpan.className = 'svl-translation-error';
            errSpan.textContent = 'Could not fetch online translations (using built-in English).';
            translationMessage.appendChild(errSpan);
        }

        return translationMessage;
    }

    private createButtonIconSvg(pathData: string): SVGSVGElement {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '14');
        svg.setAttribute('height', '14');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('fill', 'currentColor');
        svg.style.flexShrink = '0';
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);
        return svg;
    }

    private getDashArrayForStyle(dashStyle: string): string {
        switch (dashStyle) {
            case 'dash':
                return '8, 5';
            case 'dashdot':
                return '8, 4, 2, 4';
            case 'longdash':
                return '14, 5';
            case 'longdashdot':
                return '14, 4, 2, 4';
            case 'dot':
                return '2, 5';
            case 'solid':
            default:
                return 'none';
        }
    }

    private updateStreetPreview(key: string | number): void {
        const lineEl = document.getElementById(`svl_previewLine_${key}`) as SVGLineElement | null;
        if (!lineEl) return;

        const colorInput = document.getElementById(`svl_streetColor_${key}`) as HTMLInputElement | null;
        const dashSelect = document.getElementById(`svl_strokeDashstyle_${key}`) as HTMLSelectElement | null;
        const widthInput = document.getElementById(`svl_streetWidth_${key}`) as HTMLInputElement | null;
        const opacityInput = document.getElementById(`svl_streetOpacity_${key}`) as HTMLInputElement | null;

        const strokeColor = colorInput?.value || '#ffffff';
        const dashStyle = dashSelect?.value || 'solid';
        const rawWidth = widthInput ? parseFloat(widthInput.value) : 6;
        const clampedWidth = Number.isNaN(rawWidth) ? 6 : Math.max(2, Math.min(12, rawWidth * 0.6));
        const rawOpacity = opacityInput ? parseFloat(opacityInput.value) / 100 : 1;
        const clampedOpacity = Number.isNaN(rawOpacity) ? 1 : Math.max(0.15, Math.min(1, rawOpacity));

        lineEl.setAttribute('stroke', strokeColor);
        lineEl.setAttribute('stroke-width', String(clampedWidth));
        lineEl.setAttribute('stroke-dasharray', this.getDashArrayForStyle(dashStyle));
        lineEl.setAttribute('stroke-opacity', String(clampedOpacity));
    }

    private updateAllStreetPreviews(): void {
        const streetsPreferences = this.mediator.getPreference('streets');
        if (Array.isArray(streetsPreferences)) {
            for (let i = 0; i < streetsPreferences.length; i += 1) {
                if (streetsPreferences[i]) {
                    this.updateStreetPreview(i);
                }
            }
        }
        const options = this.getOptions();
        options.streets.forEach((o) => this.updateStreetPreview(o));
        options.decorations.forEach((o) => this.updateStreetPreview(o));
    }

    private updateDependentControlsState(): void {
        const isRealSize = Boolean(this.mediator.getPreference('realsize'));
        document.querySelectorAll<HTMLInputElement>('input.segmentsWidth').forEach((el) => {
            el.disabled = isRealSize;
            const wrapper = el.closest('.svl-control-chip');
            wrapper?.classList.toggle('is-disabled', isRealSize);
        });

        const routingEnabled = Boolean(this.mediator.getPreference('routingModeEnabled'));
        const hideRoutingInput = document.getElementById('svl_hideRoutingModeBlock') as HTMLInputElement | null;
        if (hideRoutingInput) {
            hideRoutingInput.disabled = !routingEnabled;
            hideRoutingInput.closest('.svl-field')?.classList.toggle('is-disabled', !routingEnabled);
        }

        const autoReloadEnabled = Boolean(this.mediator.getPreference('autoReload.enabled'));
        const autoReloadIntervalInput = document.getElementById('svl_autoReload_interval') as HTMLInputElement | null;
        if (autoReloadIntervalInput) {
            autoReloadIntervalInput.disabled = !autoReloadEnabled;
            autoReloadIntervalInput.closest('.svl-field')?.classList.toggle('is-disabled', !autoReloadEnabled);
        }

        const showSLColor = Boolean(this.mediator.getPreference('showSLcolor'));
        const showSLSingleColor = Boolean(this.mediator.getPreference('showSLSinglecolor'));

        const singleColorInput = document.getElementById('svl_showSLSinglecolor') as HTMLInputElement | null;
        if (singleColorInput) {
            singleColorInput.disabled = !showSLColor;
            singleColorInput.closest('.svl-field')?.classList.toggle('is-disabled', !showSLColor);
        }

        const slSingleColorPicker = document.getElementById('svl_SLColor') as HTMLInputElement | null;
        if (slSingleColorPicker) {
            const enableSinglePicker = showSLColor && showSLSingleColor;
            slSingleColorPicker.disabled = !enableSinglePicker;
            slSingleColorPicker.closest('.svl-field')?.classList.toggle('is-disabled', !enableSinglePicker);
        }

        const multiPaletteDisabled = !showSLColor || showSLSingleColor;
        const speedGrid = document.getElementById('svl_speedLimitsGrid');
        if (speedGrid) {
            speedGrid.classList.toggle('is-disabled', multiPaletteDisabled);
            speedGrid.querySelectorAll<HTMLInputElement>('input[type="color"]').forEach((input) => {
                input.disabled = multiPaletteDisabled;
            });
        }
    }

    private syncAccordionToggleAllButton(accordionContainer: HTMLElement): void {
        const button = accordionContainer.querySelector<HTMLButtonElement>(':scope > .svl-search-toolbar [command="--toggle-all"]');
        if (!button) return;
        const items = Array.from(accordionContainer.querySelectorAll<HTMLDetailsElement>(':scope > details.svl-accordion-item'))
            .filter((d) => !d.hidden);
        const allOpen = items.length > 0 && items.every((d) => d.open);
        button.setAttribute('aria-expanded', String(allOpen));
    }

    private handleSearchFilter(query: string, accordionContainer: HTMLElement, emptyStatus: HTMLElement): void {
        const normalized = query.trim().toLowerCase();
        const detailsList = Array.from(accordionContainer.querySelectorAll<HTMLDetailsElement>(':scope > details.svl-accordion-item'));

        if (!normalized) {
            detailsList.forEach((details) => {
                details.hidden = false;
                if (this.preSearchOpenState && this.preSearchOpenState.has(details)) {
                    details.open = Boolean(this.preSearchOpenState.get(details));
                }
                details.querySelectorAll<HTMLElement>('.svl-filterable-item, .svl-fieldset').forEach((item) => {
                    item.hidden = false;
                });
            });
            this.preSearchOpenState = null;
            emptyStatus.hidden = true;
            emptyStatus.textContent = '';
            this.syncAccordionToggleAllButton(accordionContainer);
            return;
        }

        if (!this.preSearchOpenState) {
            this.preSearchOpenState = new Map(detailsList.map((d) => [d, d.open]));
        }

        let totalMatches = 0;

        detailsList.forEach((details) => {
            const summaryText = details.querySelector('.svl-summary-title')?.textContent?.toLowerCase() ?? '';
            const summaryMatches = summaryText.includes(normalized);
            const items = Array.from(details.querySelectorAll<HTMLElement>('.svl-filterable-item'));
            let sectionMatches = 0;

            items.forEach((item) => {
                const haystack = (item.dataset.searchText ?? item.textContent ?? '').toLowerCase();
                const isMatch = summaryMatches || haystack.includes(normalized);
                item.hidden = !isMatch;
                if (isMatch) {
                    sectionMatches += 1;
                }
            });

            details.querySelectorAll<HTMLFieldSetElement>('.svl-fieldset').forEach((fieldset) => {
                const visibleChildren = fieldset.querySelectorAll('.svl-filterable-item:not([hidden])');
                fieldset.hidden = visibleChildren.length === 0;
            });

            if (sectionMatches > 0) {
                details.hidden = false;
                details.open = true;
                totalMatches += sectionMatches;
            } else {
                details.hidden = true;
            }
        });

        if (totalMatches === 0) {
            emptyStatus.hidden = false;
            emptyStatus.textContent = this.mediator._('search_no_results');
        } else {
            emptyStatus.hidden = true;
            emptyStatus.textContent = '';
        }

        this.syncAccordionToggleAllButton(accordionContainer);
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
            style.textContent = `
            #sidepanel-svl {
                --svl-accent-color: var(--primary, #0b57d0);
                --svl-surface: var(--surface_default, #ffffff);
                --svl-surface-muted: var(--background_variant, #f4f6f9);
                --svl-border: var(--hairline, #d0d5dd);
                --svl-input-border: var(--hairline_strong, #9ca3af);
                --svl-text: var(--content_default, #1f2328);
                --svl-text-muted: var(--content_p2, #4b5563);
                --svl-warning-bg: #fffbeb;
                --svl-warning-border: #f59e0b;
                --svl-warning-text: #92400e;

                box-sizing: border-box;
                width: 100%;
                padding: 10px 12px 24px;
                color: var(--svl-text);
                font-size: 13px;
                line-height: 1.45;
                accent-color: var(--svl-accent-color);
            }

            #sidepanel-svl .visually-hidden:where(:not(:focus-within, :active)) {
                position: absolute !important;
                clip-path: inset(50%) !important;
                overflow: hidden !important;
                width: 1px !important;
                height: 1px !important;
                margin: -1px !important;
                padding: 0 !important;
                border: 0 !important;
                white-space: nowrap !important;
            }

            #sidepanel-svl [hidden] {
                display: none !important;
            }

            #sidepanel-svl *,
            #sidepanel-svl *::before,
            #sidepanel-svl *::after {
                box-sizing: border-box;
            }

            #sidepanel-svl :where(a:any-link, button, input, select, summary):focus-visible {
                outline: 3px solid var(--svl-accent-color);
                outline-offset: 2px;
            }

            /* Header Card */
            #sidepanel-svl .svl-header-card {
                background: var(--svl-surface);
                border: 1px solid var(--svl-border);
                border-radius: 10px;
                padding: 12px;
                margin-block-end: 10px;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }

            #sidepanel-svl .svl-header-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
            }

            #sidepanel-svl .svl-brand-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }

            #sidepanel-svl .svl-kicker {
                font-size: 11px;
                color: var(--svl-text-muted);
            }

            #sidepanel-svl .svl-title {
                margin: 0;
                font-size: 17px;
                font-weight: 700;
                line-height: 1.2;
                color: var(--svl-text);
            }

            #sidepanel-svl .svl-version-pill {
                display: inline-flex;
                align-items: center;
                align-self: flex-start;
                font-size: 11px;
                font-weight: 600;
                padding: 1px 7px;
                border-radius: 999px;
                background: var(--svl-surface-muted);
                color: var(--svl-text-muted);
                margin-block-start: 2px;
            }

            #sidepanel-svl .svl_logo {
                width: 82px;
                height: auto;
                flex-shrink: 0;
                object-fit: contain;
            }

            #sidepanel-svl .svl-master-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-block-start: 10px;
                padding-block-start: 10px;
                border-block-start: 1px solid var(--svl-border);
            }

            #sidepanel-svl .svl-master-toggle-wrap {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-block-size: 28px;
            }

            #sidepanel-svl .svl-master-toggle-wrap label {
                margin: 0;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
            }

            #sidepanel-svl .svl-state-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 2px 8px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 600;
                background: var(--svl-surface-muted);
                border: 1px solid var(--svl-border);
            }

            #sidepanel-svl .svl-header-links {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-block-start: 8px;
                padding-block-start: 8px;
                border-block-start: 1px dashed var(--svl-border);
                font-size: 11.5px;
            }

            #sidepanel-svl .svl_support-link {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                color: var(--svl-accent-color);
                font-weight: 600;
                text-decoration: underline;
            }

            #sidepanel-svl .svl_translationblock {
                color: var(--svl-text-muted);
                font-size: 11px;
            }

            #sidepanel-svl .svl-translation-warning {
                color: #b45309;
                font-weight: 600;
            }

            #sidepanel-svl .svl-translation-error {
                color: #b91c1c;
                font-weight: 600;
            }

            /* Sticky Action Bar */
            #sidepanel-svl .svl_buttons {
                position: sticky;
                top: 0;
                z-index: 25;
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 8px 10px;
                margin-block-end: 10px;
                background: var(--svl-surface);
                border: 1px solid var(--svl-border);
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
                transition: border-color 0.2s, background-color 0.2s;
            }

            #sidepanel-svl .svl_buttons.svl_unsaved {
                background-color: var(--svl-warning-bg) !important;
                border-color: var(--svl-warning-border) !important;
            }

            #sidepanel-svl .svl-dirty-banner {
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 11.5px;
                font-weight: 600;
                color: var(--svl-text-muted);
            }

            #sidepanel-svl .svl_buttons.svl_unsaved .svl-dirty-banner {
                color: var(--svl-warning-text);
            }

            #sidepanel-svl .svl-dirty-dot {
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #10b981;
                margin-inline-end: 6px;
            }

            #sidepanel-svl .svl_buttons.svl_unsaved .svl-dirty-dot {
                background: #d97706;
            }

            #sidepanel-svl .svl-action-row {
                display: grid;
                grid-template-columns: 1.2fr 1fr 1fr;
                gap: 6px;
                width: 100%;
            }

            #sidepanel-svl .svl-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                min-block-size: 32px;
                padding: 4px 10px;
                font: inherit;
                font-size: 12px;
                font-weight: 600;
                border-radius: 6px;
                border: 1px solid var(--svl-input-border);
                background: var(--svl-surface);
                color: var(--svl-text);
                cursor: pointer;
                transition: background-color 0.15s, border-color 0.15s, opacity 0.15s;
            }

            #sidepanel-svl .svl-btn:hover:not(:disabled) {
                background: var(--svl-surface-muted);
            }

            #sidepanel-svl .svl-btn.btn-primary:not(:disabled) {
                background: var(--svl-accent-color);
                border-color: var(--svl-accent-color);
                color: #ffffff;
            }

            #sidepanel-svl .svl-btn:disabled,
            #sidepanel-svl .svl-btn.disabled {
                opacity: 0.48;
                cursor: not-allowed;
            }

            /* Search & Expand/Collapse Toolbar */
            #sidepanel-svl .svl-search-toolbar {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-block-end: 10px;
            }

            #sidepanel-svl .svl-search-box {
                flex: 1;
                min-width: 0;
            }

            #sidepanel-svl .svl-search-input {
                width: 100%;
                min-block-size: 32px;
                padding: 4px 10px;
                font: inherit;
                font-size: 12.5px;
                border-radius: 6px;
                border: 1px solid var(--svl-input-border);
                background: var(--svl-surface);
                color: var(--svl-text);
            }

            #sidepanel-svl .svl-btn-ghost {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-block-size: 32px;
                padding: 4px 8px;
                font: inherit;
                font-size: 11.5px;
                font-weight: 600;
                white-space: nowrap;
                border-radius: 6px;
                border: 1px solid var(--svl-border);
                background: var(--svl-surface-muted);
                color: var(--svl-text);
                cursor: pointer;
            }

            #sidepanel-svl [command="--toggle-all"][aria-expanded="true"] .expand,
            #sidepanel-svl [command="--toggle-all"][aria-expanded="false"] .collapse {
                display: none;
            }

            #sidepanel-svl .svl-search-empty {
                padding: 12px;
                text-align: center;
                font-size: 12.5px;
                color: var(--svl-text-muted);
                background: var(--svl-surface-muted);
                border-radius: 8px;
                margin-block-end: 10px;
            }

            /* Accordion (<details> / <summary>) */
            #sidepanel-svl .svl-accordion-item {
                background: var(--svl-surface);
                border: 1px solid var(--svl-border);
                border-radius: 8px;
                margin-block-end: 8px;
                overflow: clip;
            }

            #sidepanel-svl .svl-accordion-summary {
                list-style: none;
                display: flex;
                align-items: center;
                gap: 0.6ch;
                min-block-size: 38px;
                padding: 8px 12px;
                font-weight: 700;
                font-size: 13.5px;
                background: var(--svl-surface-muted);
                color: var(--svl-text);
                user-select: none;
            }

            #sidepanel-svl .svl-accordion-summary::-webkit-details-marker {
                display: none;
            }

            #sidepanel-svl .svl-accordion-summary:where(:not([aria-disabled="true"])) {
                cursor: pointer;
            }

            #sidepanel-svl .svl-accordion-summary::before {
                content: "";
                inline-size: 1.1em;
                block-size: 1.1em;
                flex-shrink: 0;
                background-color: currentColor;
                -webkit-mask: url("${CHEVRON_SVG_DATA_URI}") no-repeat center / contain;
                mask: url("${CHEVRON_SVG_DATA_URI}") no-repeat center / contain;
                rotate: -90deg;
            }

            #sidepanel-svl .svl-accordion-summary:dir(rtl)::before {
                rotate: 90deg;
            }

            #sidepanel-svl details[open] > .svl-accordion-summary::before {
                rotate: 0deg;
            }

            @media (prefers-reduced-motion: no-preference) {
                #sidepanel-svl .svl-accordion-summary::before {
                    transition: rotate 0.2s;
                }
            }

            #sidepanel-svl details.svl-accordion-item::details-content {
                interpolate-size: allow-keywords;
                overflow: clip;
                contain: layout;
            }

            #sidepanel-svl details.svl-accordion-item:not([open])::details-content {
                block-size: 0;
            }

            @media (prefers-reduced-motion: no-preference) {
                #sidepanel-svl details.svl-accordion-item::details-content {
                    transition: block-size, content-visibility, display;
                    transition-duration: 0.22s;
                    transition-timing-function: ease-in-out;
                    transition-behavior: allow-discrete;
                }
            }

            #sidepanel-svl .svl-accordion-body {
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                border-block-start: 1px solid var(--svl-border);
            }

            /* Fieldsets & Form Controls */
            #sidepanel-svl .svl-fieldset {
                margin: 4px 0 0;
                padding: 8px 10px 10px;
                border: 1px solid var(--svl-border);
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            #sidepanel-svl .svl-legend {
                padding: 0 6px;
                font-size: 11.5px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.03em;
                color: var(--svl-text-muted);
            }

            #sidepanel-svl .svl-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 8px;
                border-radius: 6px;
                background: var(--svl-surface-muted);
                border: 1px solid transparent;
                transition: opacity 0.15s;
            }

            #sidepanel-svl .svl-field.is-disabled {
                opacity: 0.55;
            }

            #sidepanel-svl .svl-field-inline {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                width: 100%;
            }

            #sidepanel-svl .svl-field-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }

            #sidepanel-svl .svl-field-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
                flex: 1;
            }

            #sidepanel-svl .svl-field-label {
                margin: 0;
                font-weight: 600;
                font-size: 12.5px;
                color: var(--svl-text);
                cursor: pointer;
            }

            #sidepanel-svl .svl-field-hint {
                font-size: 11.5px;
                line-height: 1.35;
                color: var(--svl-text-muted);
            }

            #sidepanel-svl .svl-checkbox-row {
                display: flex;
                align-items: flex-start;
                gap: 8px;
            }

            #sidepanel-svl .svl-checkbox-input {
                width: 18px;
                height: 18px;
                margin-block-start: 2px;
                flex-shrink: 0;
                cursor: pointer;
                accent-color: var(--svl-accent-color);
            }

            #sidepanel-svl .svl-range-output {
                font-variant-numeric: tabular-nums;
                font-size: 11.5px;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 4px;
                background: var(--svl-surface);
                border: 1px solid var(--svl-border);
                color: var(--svl-text);
            }

            #sidepanel-svl .svl-range-input {
                width: 100%;
                min-block-size: 24px;
                margin: 2px 0 0;
                cursor: pointer;
                accent-color: var(--svl-accent-color);
            }

            #sidepanel-svl .svl-number-input,
            #sidepanel-svl .svl-select {
                min-block-size: 30px;
                padding: 3px 8px;
                font: inherit;
                font-size: 12.5px;
                font-variant-numeric: tabular-nums;
                border-radius: 6px;
                border: 1px solid var(--svl-input-border);
                background: var(--svl-surface);
                color: var(--svl-text);
            }

            #sidepanel-svl .svl-number-input {
                width: 78px;
                text-align: end;
            }

            #sidepanel-svl .svl-color-input {
                width: 42px;
                height: 30px;
                padding: 2px;
                border-radius: 6px;
                border: 1px solid var(--svl-input-border);
                background: var(--svl-surface);
                cursor: pointer;
                flex-shrink: 0;
            }

            /* Road & Decoration Style Cards */
            #sidepanel-svl .prefLineStreets {
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 8px 10px;
                border-radius: 6px;
                background: var(--svl-surface-muted);
                border: 1px solid var(--svl-border);
            }

            #sidepanel-svl .svl-street-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
            }

            #sidepanel-svl .svl-street-title {
                margin: 0;
                font-size: 12.5px;
                font-weight: 700;
                color: var(--svl-text);
            }

            #sidepanel-svl .svl-street-preview {
                width: 76px;
                height: 16px;
                border-radius: 4px;
                background: #3a3f47;
                border: 1px solid rgba(0, 0, 0, 0.25);
                flex-shrink: 0;
                display: block;
            }

            #sidepanel-svl .svl-street-controls {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 6px;
            }

            #sidepanel-svl .svl-control-chip {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                color: var(--svl-text-muted);
            }

            #sidepanel-svl .svl-control-chip.is-disabled {
                opacity: 0.45;
            }

            #sidepanel-svl .svl-control-chip label {
                margin: 0;
                font-weight: 600;
                cursor: pointer;
            }

            #sidepanel-svl .svl-control-chip .svl-number-input {
                width: 56px;
                padding: 2px 5px;
            }

            #sidepanel-svl .svl-control-chip-grow {
                flex: 1;
                min-width: 105px;
            }

            #sidepanel-svl .svl-control-chip-grow .svl-select {
                width: 100%;
            }

            /* Speed Limit Palette Grid */
            #sidepanel-svl .svl-speed-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
                transition: opacity 0.15s;
            }

            #sidepanel-svl .svl-speed-grid.is-disabled {
                opacity: 0.45;
            }

            #sidepanel-svl .prefLineSL {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                padding: 5px 8px;
                border-radius: 6px;
                background: var(--svl-surface-muted);
                border: 1px solid var(--svl-border);
            }

            #sidepanel-svl .prefLineSL.svl-sl-default {
                grid-column: 1 / -1;
            }

            #sidepanel-svl .svl-speed-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-weight: 700;
                font-size: 12px;
                font-variant-numeric: tabular-nums;
                cursor: pointer;
                margin: 0;
            }

            #sidepanel-svl .svl-speed-unit {
                font-size: 10.5px;
                font-weight: 500;
                color: var(--svl-text-muted);
            }

            #sidepanel-svl .svl-backup-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
            }

            #sidepanel-svl .newOption {
                border: 1px solid #f59e0b;
                position: relative;
            }

            #sidepanel-svl .newOption::before {
                content: "${newSinceLabel} " attr(data-version);
                display: inline-block;
                align-self: flex-start;
                font-size: 10px;
                font-weight: 700;
                padding: 1px 6px;
                border-radius: 999px;
                background: #fef3c7;
                color: #b45309;
                margin-block-end: 2px;
            }

            .routingDiv {
                opacity: 0.95;
                font-size: 1.1em;
                color: #ffffff;
                border: 2px solid #000000;
                border-radius: 6px;
                position: absolute;
                top: 3em;
                right: 3.7em;
                padding: 0.5em 0.75em;
                background-color: #b30000;
                z-index: 10000;
            }

            .routingDiv:hover {
                background-color: #ff3377;
            }

            @media (pointer: coarse) {
                #sidepanel-svl .svl-btn,
                #sidepanel-svl .svl-btn-ghost,
                #sidepanel-svl .svl-search-input,
                #sidepanel-svl .svl-number-input,
                #sidepanel-svl .svl-select,
                #sidepanel-svl .svl-color-input {
                    min-block-size: 44px;
                }
            }

            /* Progressive enhancement fallback when accent-color is unsupported */
            @supports not (accent-color: var(--svl-accent-color)) {
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input {
                    position: absolute !important;
                    clip-path: inset(50%) !important;
                    overflow: hidden !important;
                    width: 1px !important;
                    height: 1px !important;
                    margin: -1px !important;
                    padding: 0 !important;
                    border: 0 !important;
                    white-space: nowrap !important;
                }
                #sidepanel-svl .svl-checkbox-row,
                #sidepanel-svl .svl-master-toggle-wrap {
                    position: relative;
                    padding-inline-start: 1.75rem;
                }
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input + label::before,
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input + .svl-field-text > .svl-field-label::before {
                    content: "";
                    position: absolute;
                    inset-inline-start: 0;
                    top: 2px;
                    width: 1.15rem;
                    height: 1.15rem;
                    border: 2px solid var(--svl-input-border);
                    background: var(--svl-surface);
                    border-radius: 4px;
                    box-sizing: border-box;
                }
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input:focus-visible + label::before,
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input:focus-visible + .svl-field-text > .svl-field-label::before {
                    outline: 2px solid var(--svl-accent-color);
                    outline-offset: 2px;
                }
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input:checked + label::before,
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input:checked + .svl-field-text > .svl-field-label::before {
                    background-color: var(--svl-accent-color, #0b57d0);
                    border-color: var(--svl-accent-color, #0b57d0);
                }
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input:checked + label::after,
                #sidepanel-svl input[type="checkbox"].svl-checkbox-input:checked + .svl-field-text > .svl-field-label::after {
                    content: "✓";
                    position: absolute;
                    inset-inline-start: 0.22rem;
                    top: 1px;
                    color: #ffffff;
                    font-weight: 700;
                    font-size: 0.85rem;
                    line-height: 1.15rem;
                }
                #sidepanel-svl input[type="range"] {
                    -webkit-appearance: none;
                    appearance: none;
                    background: transparent;
                }
                #sidepanel-svl input[type="range"]::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 8px;
                    background: linear-gradient(to right, var(--svl-accent-color, #0b57d0) var(--progress, 50%), #cccccc var(--progress, 50%));
                    border-radius: 4px;
                }
                #sidepanel-svl input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: var(--svl-accent-color, #0b57d0);
                    cursor: pointer;
                    margin-top: -4px;
                }
                #sidepanel-svl input[type="range"]::-moz-range-track {
                    width: 100%;
                    height: 8px;
                    background: #cccccc;
                    border-radius: 4px;
                }
                #sidepanel-svl input[type="range"]::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: var(--svl-accent-color, #0b57d0);
                    cursor: pointer;
                }
                #sidepanel-svl input[type="range"]::-moz-range-progress {
                    background-color: var(--svl-accent-color, #0b57d0);
                    height: 8px;
                    border-radius: 4px;
                }
            }`;
            (document.head ?? document.body).appendChild(style);
        }

        const mainDiv = document.createElement('div');
        mainDiv.id = 'sidepanel-svl';

        // Header Card
        const headerCard = document.createElement('header');
        headerCard.className = 'svl-header-card';

        const headerTop = document.createElement('div');
        headerTop.className = 'svl-header-top';

        const brandInfo = document.createElement('div');
        brandInfo.className = 'svl-brand-info';

        const spanThanks = document.createElement('span');
        spanThanks.className = 'svl-kicker';
        spanThanks.textContent = this.mediator._('thanks_for_using');
        brandInfo.appendChild(spanThanks);

        const svlTitle = document.createElement('h2');
        svlTitle.className = 'svl-title';
        svlTitle.textContent = 'Street Vector Layer';
        brandInfo.appendChild(svlTitle);

        const spanVersion = document.createElement('span');
        spanVersion.className = 'svl-version-pill';
        spanVersion.textContent = `${this.mediator._('version')} ${this.mediator.SVL_VERSION}`;
        brandInfo.appendChild(spanVersion);

        const logo = document.createElement('img');
        logo.className = 'svl_logo';
        logo.src = 'https://raw.githubusercontent.com/bedo2991/svl/master/logo.png';
        logo.alt = this.mediator._('svl_logo');
        logo.width = 82;
        logo.height = 46;

        headerTop.appendChild(brandInfo);
        headerTop.appendChild(logo);
        headerCard.appendChild(headerTop);

        // Master Layer Toggle + Status Pill
        const masterBar = document.createElement('div');
        masterBar.className = 'svl-master-bar';

        const masterToggleWrap = document.createElement('div');
        masterToggleWrap.className = 'svl-master-toggle-wrap';

        const masterToggleInput = document.createElement('input');
        masterToggleInput.type = 'checkbox';
        masterToggleInput.id = 'svl_masterLayerToggle';
        masterToggleInput.className = 'svl-checkbox-input';
        masterToggleInput.addEventListener('change', () => {
            this.mediator.notify(this, AcceptedControllerEvents.KEYBOARD_SHORTCUT_TRIGGERED);
        });

        const masterToggleLabel = document.createElement('label');
        masterToggleLabel.htmlFor = 'svl_masterLayerToggle';
        masterToggleLabel.textContent = this.mediator._('enable_svl_layer');

        masterToggleWrap.appendChild(masterToggleInput);
        masterToggleWrap.appendChild(masterToggleLabel);

        const statePill = document.createElement('span');
        statePill.id = 'svl_panelStatePill';
        statePill.className = 'svl-state-pill';
        statePill.setAttribute('role', 'status');
        statePill.setAttribute('aria-live', 'polite');

        masterBar.appendChild(masterToggleWrap);
        masterBar.appendChild(statePill);
        headerCard.appendChild(masterBar);

        const headerLinks = document.createElement('div');
        headerLinks.className = 'svl-header-links';

        const supportForum = document.createElement('a');
        supportForum.textContent = `${this.mediator._('something_not_working')} ${this.mediator._('report_it_here')}.`;
        supportForum.href = GM_info.script.supportURL ?? 'https://www.waze.com/discuss/t/script-street-vector-layer/250377';
        supportForum.target = '_blank';
        supportForum.rel = 'noopener noreferrer';
        supportForum.className = 'svl_support-link';
        headerLinks.appendChild(supportForum);

        const currentLocale = (await this.mediator.wmeSDK.Settings.getLocale())?.localeCode;
        headerLinks.appendChild(this.buildTranslationBanner(currentLocale));
        headerCard.appendChild(headerLinks);

        mainDiv.appendChild(headerCard);

        // Sticky Action Bar (Save / Rollback / Reset)
        const buttons = document.createElement('div');
        buttons.id = 'svl_buttons';
        buttons.className = 'svl_buttons';

        const dirtyBanner = document.createElement('div');
        dirtyBanner.id = 'svl_dirtyStatusBanner';
        dirtyBanner.className = 'svl-dirty-banner';
        dirtyBanner.setAttribute('role', 'status');
        dirtyBanner.setAttribute('aria-live', 'polite');

        const dirtyDot = document.createElement('span');
        dirtyDot.className = 'svl-dirty-dot';
        dirtyDot.setAttribute('aria-hidden', 'true');

        const dirtyText = document.createElement('span');
        dirtyText.id = 'svl_dirtyStatusText';
        dirtyText.textContent = this.mediator._('all_changes_saved');

        const dirtyLeft = document.createElement('span');
        dirtyLeft.appendChild(dirtyDot);
        dirtyLeft.appendChild(dirtyText);
        dirtyBanner.appendChild(dirtyLeft);
        buttons.appendChild(dirtyBanner);

        const actionRow = document.createElement('div');
        actionRow.className = 'svl-action-row';

        const saveButton = document.createElement('button');
        saveButton.id = 'svl_saveNewPref';
        saveButton.type = 'button';
        saveButton.className = 'svl-btn btn disabled';
        saveButton.disabled = true;
        saveButton.title = this.mediator._('save_help');
        saveButton.appendChild(
            this.createButtonIconSvg('M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4.414A1 1 0 0 0 14.707 3.7L12.3 1.293A1 1 0 0 0 11.586 1H2Zm2 1h7v4H4V2Zm4 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z')
        );
        const saveLabel = document.createElement('span');
        saveLabel.textContent = this.mediator._('save');
        saveButton.appendChild(saveLabel);

        const rollbackButton = document.createElement('button');
        rollbackButton.id = 'svl_rollbackButton';
        rollbackButton.type = 'button';
        rollbackButton.className = 'svl-btn btn btn-default disabled';
        rollbackButton.disabled = true;
        rollbackButton.title = this.mediator._('rollback_help');
        rollbackButton.appendChild(
            this.createButtonIconSvg('M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1Z M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466Z')
        );
        const rollbackLabel = document.createElement('span');
        rollbackLabel.textContent = this.mediator._('rollback');
        rollbackButton.appendChild(rollbackLabel);

        const resetButton = document.createElement('button');
        resetButton.id = 'svl_resetButton';
        resetButton.type = 'button';
        resetButton.className = 'svl-btn btn btn-default';
        resetButton.title = this.mediator._('reset_help');
        resetButton.appendChild(
            this.createButtonIconSvg('M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6ZM14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z')
        );
        const resetLabel = document.createElement('span');
        resetLabel.textContent = this.mediator._('reset');
        resetButton.appendChild(resetLabel);

        actionRow.appendChild(saveButton);
        actionRow.appendChild(rollbackButton);
        actionRow.appendChild(resetButton);
        buttons.appendChild(actionRow);
        mainDiv.appendChild(buttons);

        // Accordion Container + Search Filter Toolbar
        const accordionContainer = document.createElement('div');
        accordionContainer.id = 'svl-accordion-group';
        accordionContainer.className = 'accordion';

        const searchToolbar = document.createElement('div');
        searchToolbar.className = 'svl-search-toolbar';

        const searchElement = document.createElement('search');
        searchElement.className = 'svl-search-box';

        const searchLabel = document.createElement('label');
        searchLabel.htmlFor = 'svl_search_input';
        searchLabel.className = 'visually-hidden';
        searchLabel.textContent = this.mediator._('search_settings_label');

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.id = 'svl_search_input';
        searchInput.name = 'svl_search';
        searchInput.className = 'svl-search-input';
        searchInput.placeholder = this.mediator._('search_settings_placeholder');
        searchInput.setAttribute('autocorrect', 'off');
        searchInput.setAttribute('autocapitalize', 'none');
        searchInput.spellcheck = false;
        searchInput.enterKeyHint = 'search';

        searchElement.appendChild(searchLabel);
        searchElement.appendChild(searchInput);

        const toggleAllBtn = document.createElement('button');
        toggleAllBtn.type = 'button';
        toggleAllBtn.id = 'svl_toggleAllAccordion';
        toggleAllBtn.className = 'svl-btn-ghost';
        toggleAllBtn.setAttribute('commandfor', 'svl-accordion-group');
        toggleAllBtn.setAttribute('command', '--toggle-all');
        toggleAllBtn.setAttribute('aria-expanded', 'false');

        const expandSpan = document.createElement('span');
        expandSpan.className = 'expand';
        expandSpan.textContent = this.mediator._('expand_all');

        const collapseSpan = document.createElement('span');
        collapseSpan.className = 'collapse';
        collapseSpan.textContent = this.mediator._('collapse_all');

        toggleAllBtn.appendChild(expandSpan);
        toggleAllBtn.appendChild(collapseSpan);

        searchToolbar.appendChild(searchElement);
        searchToolbar.appendChild(toggleAllBtn);
        accordionContainer.appendChild(searchToolbar);

        const searchEmptyStatus = document.createElement('div');
        searchEmptyStatus.id = 'svl_search_empty';
        searchEmptyStatus.className = 'svl-search-empty';
        searchEmptyStatus.setAttribute('role', 'status');
        searchEmptyStatus.setAttribute('aria-live', 'polite');
        searchEmptyStatus.hidden = true;
        accordionContainer.appendChild(searchEmptyStatus);

        // 1. Roads Properties Section
        const streetsSection = this.createPreferencesSection(this.mediator._('roads_properties'), true);
        const streets = streetsSection.content;

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
                    { text: `— ${this.mediator._('road_themes_title')} —`, value: '' },
                    { text: this.mediator._('svl_standard_layer'), value: 'svl_standard' },
                    { text: this.mediator._('wme_colors_layer'), value: 'wme_colors' },
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

        // Nodes Group inside Roads Properties
        const nodesFieldset = this.createFieldsetGroup(this.mediator._('nodes_properties'));
        nodesFieldset.appendChild(
            this.createRangeOption({
                id: 'nodeRadius',
                title: this.mediator._('node_size'),
                description: this.mediator._('node_size_descr'),
                min: 2,
                max: 10,
                step: 0.2,
                unit: ' px',
                isNew: '6.2.3',
            })
        );
        nodesFieldset.appendChild(
            this.createColorOption({
                id: 'nodeColor',
                title: this.mediator._('node_color'),
                description: this.mediator._('node_color_descr'),
                isNew: '6.2.3',
            })
        );
        nodesFieldset.appendChild(
            this.createColorOption({
                id: 'nodeDeadEndColor',
                title: this.mediator._('dead_end_node_color'),
                description: this.mediator._('dead_end_node_color_descr'),
                isNew: '6.2.3',
            })
        );
        nodesFieldset.appendChild(
            this.createColorOption({
                id: 'virtualNodeColor',
                title: this.mediator._('virtual_node_color'),
                description: this.mediator._('virtual_node_color_descr'),
                isNew: '6.2.3',
            })
        );
        streets.appendChild(nodesFieldset);

        // Labels Group inside Roads Properties
        const labelsFieldset = this.createFieldsetGroup(this.mediator._('labels_properties'));
        labelsFieldset.appendChild(
            this.createIntegerOption({
                id: 'showANs',
                title: this.mediator._('show_ans'),
                description: this.mediator._('show_ans_descr'),
                min: 0,
                max: 4,
                step: 1,
            })
        );
        labelsFieldset.appendChild(
            this.createRangeOption({
                id: 'labelOutlineWidth',
                title: this.mediator._('label_width'),
                description: this.mediator._('label_width_descr'),
                min: 0,
                max: 10,
                step: 1,
                unit: ' px',
            })
        );
        streets.appendChild(labelsFieldset);

        accordionContainer.appendChild(streetsSection.details);

        // 2. Segments Decorations Section
        const decorationsSection = this.createPreferencesSection(this.mediator._('segments_decorations'));
        options.decorations.forEach((o) => {
            decorationsSection.content.appendChild(
                this.createStreetOptionLine({
                    i: o,
                    showWidth: false,
                    showOpacity: true,
                })
            );
        });
        accordionContainer.appendChild(decorationsSection.details);

        // 3. Rendering Parameters Section
        const renderingSection = this.createPreferencesSection(this.mediator._('rendering_parameters'));
        const renderingParameters = renderingSection.content;

        const visibilityFieldset = this.createFieldsetGroup(this.mediator._('layer_visibility_section'));
        visibilityFieldset.appendChild(
            this.createIntegerOption({
                id: 'layerOpacity',
                title: this.mediator._('layer_opacity'),
                description: this.mediator._('layer_opacity_descr'),
                min: 10,
                max: 100,
                step: 5,
            })
        );
        visibilityFieldset.appendChild(
            this.createCheckboxOption({
                id: 'disableRoadLayers',
                title: this.mediator._('hide_road_layer'),
                description: this.mediator._('hide_road_layer_descr'),
            })
        );
        visibilityFieldset.appendChild(
            this.createCheckboxOption({
                id: 'startDisabled',
                title: this.mediator._('svl_initially_disabled'),
                description: this.mediator._('svl_initially_disabled_descr'),
            })
        );
        visibilityFieldset.appendChild(
            this.createCheckboxOption({
                id: 'showUnderGPSPoints',
                title: this.mediator._('gps_layer_above_roads'),
                description: this.mediator._('gps_layer_above_roads_descr'),
            })
        );
        renderingParameters.appendChild(visibilityFieldset);

        const routingFieldset = this.createFieldsetGroup(this.mediator._('routing_mode_section'));
        routingFieldset.appendChild(
            this.createCheckboxOption({
                id: 'routingModeEnabled',
                title: this.mediator._('enable_routing_mode'),
                description: this.mediator._('enable_routing_mode_descr'),
            })
        );
        routingFieldset.appendChild(
            this.createCheckboxOption({
                id: 'hideRoutingModeBlock',
                title: this.mediator._('hide_routing_mode_panel'),
                description: this.mediator._('hide_routing_mode_panel_descr'),
            })
        );
        renderingParameters.appendChild(routingFieldset);

        const labelDensityFieldset = this.createFieldsetGroup(this.mediator._('labels_properties'));
        labelDensityFieldset.appendChild(
            this.createRangeOption({
                id: 'clutterConstant',
                title: this.mediator._('street_names_density'),
                description: this.mediator._('street_names_density_descr'),
                min: 1,
                max: this.clutterMax,
                step: 1,
            })
        );
        labelDensityFieldset.appendChild(
            this.createCheckboxOption({
                id: 'mergeConnectedLabels',
                title: this.mediator._('merge_connected_labels'),
                description: this.mediator._('merge_connected_labels_descr'),
                isNew: '8.3.0',
            })
        );
        renderingParameters.appendChild(labelDensityFieldset);

        const closeZoomFieldset = this.createFieldsetGroup(this.mediator._('close_zoom_only'));
        closeZoomFieldset.appendChild(
            this.createIntegerOption({
                id: 'fakelock',
                title: this.mediator._('render_as_level'),
                description: this.mediator._('render_as_level_descr'),
                min: 1,
                max: 7,
                step: 1,
            })
        );
        closeZoomFieldset.appendChild(
            this.createRangeOption({
                id: 'closeZoomLabelSize',
                title: this.mediator._('font_size_close'),
                description: this.mediator._('font_size_close_descr'),
                min: 8,
                max: this.fontSizeMax,
                step: 1,
                unit: ' px',
            })
        );
        closeZoomFieldset.appendChild(
            this.createRangeOption({
                id: 'arrowDeclutter',
                title: this.mediator._('limit_arrows'),
                description: this.mediator._('limit_arrows_descr'),
                min: 1,
                max: 200,
                step: 1,
            })
        );
        renderingParameters.appendChild(closeZoomFieldset);

        const farZoomFieldset = this.createFieldsetGroup(this.mediator._('far_zoom_only'));
        farZoomFieldset.appendChild(
            this.createRangeOption({
                id: 'farZoomLabelSize',
                title: this.mediator._('font_size_far'),
                description: this.mediator._('font_size_far_descr'),
                min: 8,
                max: this.fontSizeMax,
                step: 1,
                unit: ' px',
            })
        );
        renderingParameters.appendChild(farZoomFieldset);

        accordionContainer.appendChild(renderingSection.details);

        // 4. Speed Limits Section
        const speedLimitsSection = this.createPreferencesSection(this.mediator._('speed_limits'));
        const speedLimits = speedLimitsSection.content;

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
        speedLimits.appendChild(
            this.createColorOption({
                id: 'SLColor',
                title: `${this.getLocalisedString('speed limit')} (${this.mediator._('color')})`,
                description: '',
            })
        );

        const slPaletteFieldset = this.createFieldsetGroup(this.getLocalisedString('speed limit'));
        const slGrid = document.createElement('div');
        slGrid.id = 'svl_speedLimitsGrid';
        slGrid.className = 'svl-speed-grid';

        // Metric
        let type = 'metric';
        slGrid.appendChild(this.createSpeedOptionLine('Default', true));
        let typeKeys = Object.keys(this.mediator.getPreference(`speeds.${type}`)).map(Number).sort((a, b) => a - b);
        for (const speed of typeKeys) {
            if (isNaN(speed)) continue;
            slGrid.appendChild(this.createSpeedOptionLine(speed, true));
        }

        // Imperial
        type = 'imperial';
        slGrid.appendChild(this.createSpeedOptionLine('Default', false));
        typeKeys = Object.keys(this.mediator.getPreference(`speeds.${type}`)).map(Number).sort((a, b) => a - b);
        for (const speed of typeKeys) {
            if (isNaN(speed)) continue;
            slGrid.appendChild(this.createSpeedOptionLine(speed, false));
        }

        slPaletteFieldset.appendChild(slGrid);
        speedLimits.appendChild(slPaletteFieldset);
        accordionContainer.appendChild(speedLimitsSection.details);

        // 5. Performance Tuning Section
        const performanceSection = this.createPreferencesSection(this.mediator._('performance_tuning'));
        const performance = performanceSection.content;

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
        accordionContainer.appendChild(performanceSection.details);

        // 6. Utilities & Backup Section
        const utilitiesSection = this.createPreferencesSection(this.mediator._('utilities'));
        const utilities = utilitiesSection.content;

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

        const backupFieldset = this.createFieldsetGroup(this.mediator._('settings_backup'));
        const utilityButtons = document.createElement('div');
        utilityButtons.className = 'svl-backup-grid';

        const exportButton = document.createElement('button');
        exportButton.id = 'svl_exportButton';
        exportButton.type = 'button';
        exportButton.textContent = this.mediator._('export');
        exportButton.className = 'svl-btn btn btn-default';

        const importButton = document.createElement('button');
        importButton.id = 'svl_importButton';
        importButton.type = 'button';
        importButton.textContent = this.mediator._('import');
        importButton.className = 'svl-btn btn btn-default';

        const downloadButton = document.createElement('button');
        downloadButton.id = 'svl_downloadButton';
        downloadButton.type = 'button';
        downloadButton.textContent = this.mediator._('download_json');
        downloadButton.title = this.mediator._('download_json_help');
        downloadButton.className = 'svl-btn btn btn-default';

        const uploadButton = document.createElement('button');
        uploadButton.id = 'svl_uploadButton';
        uploadButton.type = 'button';
        uploadButton.textContent = this.mediator._('upload_json_file');
        uploadButton.className = 'svl-btn btn btn-default';

        const uploadFileInput = document.createElement('input');
        uploadFileInput.type = 'file';
        uploadFileInput.id = 'svl_uploadFileInput';
        uploadFileInput.accept = '.json,application/json';
        uploadFileInput.hidden = true;
        uploadFileInput.style.display = 'none';

        utilityButtons.appendChild(importButton);
        utilityButtons.appendChild(exportButton);
        utilityButtons.appendChild(uploadButton);
        utilityButtons.appendChild(downloadButton);
        backupFieldset.appendChild(utilityButtons);
        backupFieldset.appendChild(uploadFileInput);
        utilities.appendChild(backupFieldset);

        accordionContainer.appendChild(utilitiesSection.details);
        mainDiv.appendChild(accordionContainer);

        // Accordion Expand/Collapse All + Search Event Listeners
        const toggleAllSections = () => {
            const expand = toggleAllBtn.getAttribute('aria-expanded') !== 'true';
            for (const details of accordionContainer.querySelectorAll<HTMLDetailsElement>(':scope > details.svl-accordion-item')) {
                if (!details.hidden) {
                    details.open = expand;
                }
            }
            toggleAllBtn.setAttribute('aria-expanded', String(expand));
        };

        accordionContainer.addEventListener('command', (event: Event) => {
            const cmdEvent = event as Event & { command?: string };
            if (cmdEvent.command !== '--toggle-all') return;
            toggleAllSections();
        }, { capture: true });

        if (!Object.prototype.hasOwnProperty.call(HTMLButtonElement.prototype, 'commandForElement')) {
            toggleAllBtn.addEventListener('click', toggleAllSections);
        }

        accordionContainer.addEventListener('toggle', (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target?.matches('.accordion > details.svl-accordion-item')) return;
            this.syncAccordionToggleAllButton(accordionContainer);
        }, { capture: true });

        searchInput.addEventListener('input', () => {
            this.handleSearchFilter(searchInput.value, accordionContainer, searchEmptyStatus);
        });

        const { tabLabel, tabPane } = await this.mediator.wmeSDK.Sidebar.registerScriptTab();
        tabLabel.innerText = 'SVL 🗺️';
        tabLabel.title = 'Street Vector Layer';

        tabPane.replaceChildren(mainDiv);

        // Add preference change listeners
        const prefElements = tabPane.querySelectorAll('.prefElement');
        prefElements.forEach((element: Element) => {
            element.addEventListener('change', this.handleUserUpdatedSVLPreferences.bind(this));
        });

        saveButton.addEventListener('click', this.handleSaveNewPrefClick.bind(this));
        rollbackButton.addEventListener('click', this.handleRollbackPreferencesClick.bind(this));
        resetButton.addEventListener('click', this.handleResetPreferencesClick.bind(this));
        importButton.addEventListener('click', this.handleImportPreferencesClick.bind(this));
        exportButton.addEventListener('click', this.handleExportPreferencesClick.bind(this));
        downloadButton.addEventListener('click', () => {
            this.mediator.notify(this, AcceptedControllerEvents.PREFERENCES_DOWNLOAD_REQUEST);
        });
        uploadButton.addEventListener('click', () => {
            uploadFileInput.value = '';
            uploadFileInput.click();
        });
        uploadFileInput.addEventListener('change', () => {
            const file = uploadFileInput.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                const rawJson = typeof reader.result === 'string' ? reader.result : '';
                if (this.mediator.importPreferencesFromJson(rawJson)) {
                    this.resetButtonState();
                } else {
                    this.mediator.alert(AlertType.ERROR, this.mediator._('preferences_importing_error'));
                }
            };
            reader.onerror = () => {
                this.mediator.alert(AlertType.ERROR, this.mediator._('preferences_importing_error'));
            };
            reader.readAsText(file);
        });

        await this.updatePreferencesUI();
        this.updatePanelStatusUI(this.mediator.getState());
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
        const dirtyText = document.getElementById('svl_dirtyStatusText');
        if (dirtyText) {
            dirtyText.textContent = this.mediator._('all_changes_saved');
        }
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
        const dirtyText = document.getElementById('svl_dirtyStatusText');
        if (dirtyText) {
            dirtyText.textContent = this.mediator._('unsaved_changes');
        }
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
                this.updateAllStreetPreviews();
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
                    this.updateStreetPreview(decorator);
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
                        this.updateStreetPreview(streetIndex);
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

                this.mediator.setPreference(uniqueID, val);
                this.updateDependentControlsState();
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
            if (el instanceof HTMLInputElement && el.type === 'range') {
                const rawId = id.replace(/^svl_/, '');
                const output = document.getElementById(`svl_output_${rawId}`) as HTMLOutputElement | null;
                if (output) {
                    const unit = output.dataset.unit ?? '';
                    output.textContent = `${el.value}${unit}`;
                }
                this.updateRangeProgressCssVar(el);
            }
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
        await this.syncShortcutWithPreferences();
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
        this.setCheckboxChecked('svl_mergeConnectedLabels', this.mediator.getPreference('mergeConnectedLabels') ?? DEFAULT_PREFERENCES.mergeConnectedLabels);
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

        this.updateAllStreetPreviews();
        this.updateDependentControlsState();

        // Toggle metric / imperial speed rows
        const WMEUsesImperial = (await this.mediator.wmeSDK.Settings.getUserSettings()).isImperial;
        const type = WMEUsesImperial ? 'imperial' : 'metric';
        const otherType = WMEUsesImperial ? 'metric' : 'imperial';
        const speeds = Object.keys(this.mediator.getPreference(`speeds.${type}`));

        document.querySelectorAll<HTMLDivElement>(`div.svl_${otherType}`).forEach((el) => {
            el.style.display = 'none';
        });
        document.querySelectorAll<HTMLDivElement>(`div.svl_${type}`).forEach((el) => {
            el.style.display = 'flex';
        });
        for (const speed of speeds) {
            this.setInputValue(`svl_slValue_${type}_${speed}`, speed);
            this.setInputValue(`svl_slColor_${type}_${speed}`, this.mediator.getPreference(`speeds.${type}.${speed}`));
        }

        this.setInputValue(`svl_slColor_${type}_Default`, this.mediator.getPreference('speeds.default'));
    }

    private createCheckboxOption({
        id,
        title,
        description,
        isNew,
        uniqueId,
    }: { id: string; title: string; description: string; isNew?: string; uniqueId?: string }) {
        const line = document.createElement('div');
        line.className = 'svl-field prefLineCheckbox svl-filterable-item';
        line.dataset.searchText = `${title} ${description}`.toLowerCase();
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }

        const inputId = `svl_${id}`;
        const descId = `svl_desc_${id}`;

        const row = document.createElement('div');
        row.className = 'svl-checkbox-row';

        const input = this.createInput({
            id,
            className: 'prefElement svl-checkbox-input',
            type: 'checkbox',
            uniqueId,
            describedBy: description ? descId : undefined,
        });

        const textWrap = document.createElement('div');
        textWrap.className = 'svl-field-text';

        const label = document.createElement('label');
        label.htmlFor = inputId;
        label.className = 'svl-field-label';
        label.textContent = title;
        textWrap.appendChild(label);

        if (description) {
            const hint = document.createElement('span');
            hint.id = descId;
            hint.className = 'svl-field-hint';
            hint.textContent = description;
            textWrap.appendChild(hint);
        }

        row.appendChild(input);
        row.appendChild(textWrap);
        line.appendChild(row);

        return line;
    }

    private createStreetOptionLine({
        i,
        showWidth = true,
        showOpacity = false,
    }: { i: string | number; showWidth?: boolean; showOpacity?: boolean }) {
        const roadName = this.getLocalisedString(i);

        const line = document.createElement('div');
        line.className = 'prefLineStreets svl-filterable-item';
        line.dataset.searchText = roadName.toLowerCase();

        const header = document.createElement('div');
        header.className = 'svl-street-header';

        const title = document.createElement('span');
        title.className = 'svl-street-title';
        title.textContent = roadName;

        const svgNS = 'http://www.w3.org/2000/svg';
        const previewSvg = document.createElementNS(svgNS, 'svg');
        previewSvg.setAttribute('class', 'svl-street-preview');
        previewSvg.setAttribute('viewBox', '0 0 76 16');
        previewSvg.setAttribute('aria-hidden', 'true');

        const previewLine = document.createElementNS(svgNS, 'line');
        previewLine.id = `svl_previewLine_${i}`;
        previewLine.setAttribute('x1', '6');
        previewLine.setAttribute('y1', '8');
        previewLine.setAttribute('x2', '70');
        previewLine.setAttribute('y2', '8');
        previewLine.setAttribute('stroke', '#ffffff');
        previewLine.setAttribute('stroke-width', '5');
        previewLine.setAttribute('stroke-linecap', 'butt');
        previewSvg.appendChild(previewLine);

        header.appendChild(title);
        header.appendChild(previewSvg);
        line.appendChild(header);

        const inputs = document.createElement('div');
        inputs.className = 'svl-street-controls';

        if (showWidth) {
            const widthChip = document.createElement('div');
            widthChip.className = 'svl-control-chip';

            const widthLabel = document.createElement('label');
            widthLabel.htmlFor = `svl_streetWidth_${i}`;
            widthLabel.textContent = this.mediator._('width');

            const width = this.createInput({
                id: `streetWidth_${i}`,
                type: 'number',
                title: `${this.mediator._('width')} (${this.mediator._('width_disabled')})`,
                className: Number.isInteger(i)
                    ? 'svl-number-input prefElement segmentsWidth'
                    : 'svl-number-input prefElement',
                min: 1,
                max: 20,
                step: 1,
                uniqueId: `streets.${i}.strokeWidth`,
            });

            widthChip.appendChild(widthLabel);
            widthChip.appendChild(width);
            inputs.appendChild(widthChip);
        }

        if (showOpacity) {
            const opacityChip = document.createElement('div');
            opacityChip.className = 'svl-control-chip';

            const opacityLabel = document.createElement('label');
            opacityLabel.htmlFor = `svl_streetOpacity_${i}`;
            opacityLabel.textContent = `${this.mediator._('opacity')} %`;

            const opacity = this.createInput({
                id: `streetOpacity_${i}`,
                className: 'svl-number-input prefElement',
                title: this.mediator._('opacity'),
                type: 'number',
                min: 0,
                max: 100,
                step: 10,
                uniqueId: `streets.${i}.strokeOpacity`,
            });

            opacityChip.appendChild(opacityLabel);
            opacityChip.appendChild(opacity);
            inputs.appendChild(opacityChip);
        }

        const colorChip = document.createElement('div');
        colorChip.className = 'svl-control-chip';

        const colorLabel = document.createElement('label');
        colorLabel.htmlFor = `svl_streetColor_${i}`;
        colorLabel.textContent = this.mediator._('color');

        const color = this.createInput({
            id: `streetColor_${i}`,
            className: 'prefElement svl-color-input',
            title: `${roadName} — ${this.mediator._('color')}`,
            type: 'color',
            uniqueId: `streets.${i}.strokeColor`,
        });

        colorChip.appendChild(colorLabel);
        colorChip.appendChild(color);
        inputs.appendChild(colorChip);

        const styleChip = document.createElement('div');
        styleChip.className = 'svl-control-chip svl-control-chip-grow';

        const styleLabel = document.createElement('label');
        styleLabel.htmlFor = `svl_strokeDashstyle_${i}`;
        styleLabel.className = 'visually-hidden';
        styleLabel.textContent = `${roadName} ${this.mediator._('stroke_style')}`;

        const select = this.createDashStyleDropdown({
            id: `strokeDashstyle_${i}`,
            uniqueID: `streets.${i}.strokeDashstyle`,
        });
        select.className = 'svl-select prefElement';

        styleChip.appendChild(styleLabel);
        styleChip.appendChild(select);
        inputs.appendChild(styleChip);

        line.appendChild(inputs);

        return line;
    }

    private createDashStyleDropdown({ id, uniqueID }: { id: string; uniqueID?: string }): HTMLSelectElement {
        const newSelect = document.createElement('select');
        newSelect.className = 'prefElement svl-select';
        newSelect.title = this.mediator._('stroke_style');
        newSelect.id = `svl_${id}`;
        newSelect.name = `svl_${id}`;
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
        const unitLabel = metric ? this.mediator._('kmh') : this.mediator._('mph');
        const colorInputId = `svl_slColor_${type}_${i}`;

        const line = document.createElement('div');
        line.className = `svl_${type} prefLineSL svl-filterable-item`;
        if (i === 'Default') {
            line.classList.add('svl-sl-default');
        }
        line.dataset.searchText = `${i} ${unitLabel} ${this.mediator._('speed_limits')}`.toLowerCase();

        const label = document.createElement('label');
        label.htmlFor = colorInputId;
        label.className = 'svl-speed-badge';

        if (typeof i === 'number') {
            const numSpan = document.createElement('span');
            numSpan.textContent = String(i);
            const unitSpan = document.createElement('span');
            unitSpan.className = 'svl-speed-unit';
            unitSpan.textContent = unitLabel;
            label.appendChild(numSpan);
            label.appendChild(unitSpan);

            const slValue = this.createInput({
                id: `slValue_${type}_${i}`,
                className: 'prefElement',
                title: this.mediator._('speed_limit_value'),
                type: 'number',
                min: 0,
                max: 150,
                step: 1,
            });
            slValue.value = String(i);
            slValue.disabled = true;
            slValue.hidden = true;
            line.appendChild(slValue);
        } else {
            label.textContent = this.mediator._('default_speed_color');
        }

        const uniqueId = i === 'Default' ? 'speeds.default' : `speeds.${type}.${i}`;
        const val: string = this.mediator.getPreference(uniqueId);

        const color = this.createInput({
            id: `slColor_${type}_${i}`,
            className: 'prefElement svl-color-input',
            type: 'color',
            title: this.mediator._('color'),
            uniqueId,
        });

        if (val) {
            color.value = val;
        }

        line.appendChild(label);
        line.appendChild(color);

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
        line.className = 'svl-field prefLineInteger svl-filterable-item';
        line.dataset.searchText = `${title} ${description}`.toLowerCase();
        if (typeof isNew === 'string') {
            line.classList.add('newOption');
            line.dataset.version = isNew;
        }

        const inputId = `svl_${id}`;
        const descId = `svl_desc_${id}`;

        const inlineRow = document.createElement('div');
        inlineRow.className = 'svl-field-inline';

        const textWrap = document.createElement('div');
        textWrap.className = 'svl-field-text';

        const label = document.createElement('label');
        label.htmlFor = inputId;
        label.className = 'svl-field-label';
        label.textContent = title;
        textWrap.appendChild(label);

        if (description) {
            const hint = document.createElement('span');
            hint.id = descId;
            hint.className = 'svl-field-hint';
            hint.textContent = description;
            textWrap.appendChild(hint);
        }

        const input = this.createInput({
            id,
            min,
            max,
            step,
            type: 'number',
            title: `${this.mediator._('insert_number')} (${min}–${max})`,
            className: 'prefElement svl-number-input',
            uniqueId,
            describedBy: description ? descId : undefined,
        });

        inlineRow.appendChild(textWrap);
        inlineRow.appendChild(input);
        line.appendChild(inlineRow);

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

    private resolveStatePresentation(state: SVLLayerState): { iconKind: StatusIconKind; iconColor: string; title: string } {
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

        return { iconKind, iconColor, title };
    }

    private updatePanelStatusUI(state: SVLLayerState): void {
        const { iconKind, iconColor, title } = this.resolveStatePresentation(state);

        const masterToggle = document.getElementById('svl_masterLayerToggle') as HTMLInputElement | null;
        if (masterToggle) {
            masterToggle.checked = [
                SVLLayerState.VISIBLE,
                SVLLayerState.AUTOMATICALLY_DISABLED,
                SVLLayerState.DRAWING_ABORTED,
            ].includes(state);
        }

        const statePill = document.getElementById('svl_panelStatePill');
        if (statePill) {
            const icon = this.createStatusIconSvg(iconKind, iconColor);
            icon.style.marginLeft = '0';
            const textSpan = document.createElement('span');
            textSpan.textContent = title;
            statePill.replaceChildren(icon, textSpan);
        }
    }

    private updateBadge(state: SVLLayerState): void {
        this.updatePanelStatusUI(state);
        if (!this.badgeElement) return;

        const { iconKind, iconColor, title } = this.resolveStatePresentation(state);

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

        this.mediator.subscribe(SVLEvents.WME_SETTINGS_CHANGED, () => {
            void this.updatePreferencesUI();
        });
    }
}
