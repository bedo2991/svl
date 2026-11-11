import toastr from 'toastr';
import Swal, { SweetAlertResult } from 'sweetalert2';
import 'toastr/build/toastr.css';
import 'sweetalert2/dist/sweetalert2.min.css';
import Utils from '../Utils';

/**
 * Controller for handling alerts and notifications.
 * Decoupled from WazeWrap, using toastr and sweetalert2.
 */
export default class AlertController {
    private static stylesInjected = false;

    private static ensureStylesInjected(): void {
        if (AlertController.stylesInjected) {
            return;
        }
        AlertController.stylesInjected = true;

        const style = document.createElement('style');
        style.id = 'svl-alert-styles';
        style.textContent = `
            #toast-container > div {
                width: min(650px, 90vw);
                opacity: 0.95;
            }
        `;
        document.head?.appendChild(style);

        toastr.options = {
            target: 'body',
            timeOut: 6000,
            positionClass: 'toast-top-center',
            closeOnHover: false,
            closeDuration: 0,
            showDuration: 0,
            closeButton: true,
            progressBar: true,
            escapeHtml: true
        };
    }

    public constructor() {
        AlertController.ensureStylesInjected();
    }

    public info(title: string, message: string, timeOut?: number): void {
        toastr.info(message, title, timeOut ? { timeOut } : {});
    }

    public success(title: string, message: string, timeOut?: number): void {
        toastr.success(message, title, timeOut ? { timeOut } : {});
    }

    public warning(title: string, message: string, timeOut?: number): void {
        toastr.warning(message, title, timeOut ? { timeOut } : {});
    }

    public error(title: string, message: string, timeOut?: number): void {
        toastr.error(message, title, timeOut ? { timeOut } : {});
    }

    public debug(title: string, message: string): void {
        // Toastr doesn't have debug? It does implicitly in some versions, or mapped to info.
        // But we can just use console or info.
        console.debug(`[${title}] ${message}`);
    }

    /**
     * Shows a prompt dialog.
     * @param title 
     * @param message 
     * @param defaultValue 
     * @param callback Function (val) => void. If val is null, it was cancelled.
     */
    public prompt(title: string, message: string, defaultValue: string = '', callback: (val: string | null) => void): void {
        Swal.fire({
            title: title,
            text: message,
            input: 'text',
            inputValue: defaultValue,
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel'
        }).then((result: SweetAlertResult) => {
            if (result.isConfirmed) {
                callback(result.value);
            } else {
                callback(null);
            }
        });
    }

    /**
     * Shows a confirm dialog.
     * @param title 
     * @param message 
     * @param okCallback 
     * @param cancelCallback 
     */
    public confirm(
        title: string,
        message: string,
        okCallback: () => void,
        cancelCallback?: () => void,
        confirmButtonText: string = 'OK',
        cancelButtonText: string = 'Cancel'
    ): void {
        Swal.fire({
            title: title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText,
            cancelButtonText
        }).then((result: SweetAlertResult) => {
            if (result.isConfirmed) {
                okCallback();
            } else if (cancelCallback) {
                cancelCallback();
            }
        });
    }

    public showScriptUpdate(title: string, version: string, htmlContent: string, supportURL: string = ''): void {
        const safeSupportURL = supportURL ? Utils.escapeHtml(supportURL) : '';
        Swal.fire({
            title: `${title} ${version}`,
            html: htmlContent + (safeSupportURL ? `<br/><br/><a href="${safeSupportURL}" target="_blank" rel="noopener noreferrer" style="color: #0078d7; text-decoration: underline;">Support Forum</a>` : ''),
            width: 600,
            allowOutsideClick: true,
            showCloseButton: true,
            confirmButtonText: 'Cool!'
        });
    }
}
