import toastr from 'toastr';
import Swal, { SweetAlertResult } from 'sweetalert2';
import 'toastr/build/toastr.css';
import 'sweetalert2/dist/sweetalert2.min.css';

// Custom styles for WME environment
const style = document.createElement('style');
style.innerHTML = `
    .toast-top-center-wide {
        top: 100px;
        left: 50%;
        margin-left: -500px;
    }
    #toast-container > div {
        width: 1000px;
        opacity: 0.95;
    }
`;
document.head.appendChild(style);

toastr.options = {
    target: 'body', // WME map might cover body, but usually toasts are z-indexed high. WazeWrap used #map.
    // target: '#map', // If we use #map, we need to ensure it exists when we init, or lazy load?
    // Using body is safer for initial load.
    timeOut: 6000,
    positionClass: 'toast-top-center', // Standard center top
    closeOnHover: false,
    closeDuration: 0,
    showDuration: 0,
    closeButton: true,
    progressBar: true
};

/**
 * Controller for handling alerts and notifications.
 * Decoupled from WazeWrap, using toastr and sweetalert2.
 */
export default class AlertController {
    public constructor() {
        // Initialize if anything needed
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
    public confirm(title: string, message: string, okCallback: () => void, cancelCallback?: () => void): void {
        Swal.fire({
            title: title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel'
        }).then((result: SweetAlertResult) => {
            if (result.isConfirmed) {
                okCallback();
            } else if (cancelCallback) {
                cancelCallback();
            }
        });
    }

    public showScriptUpdate(title: string, version: string, htmlContent: string, supportURL: string = ''): void {
        Swal.fire({
            title: `${title} ${version}`,
            html: htmlContent + (supportURL ? `<br/><br/><a href="${supportURL}" target="_blank" style="color: #0078d7; text-decoration: underline;">Support Forum</a>` : ''),
            width: 600,
            allowOutsideClick: true,
            showCloseButton: true,
            confirmButtonText: 'Cool!'
        });
    }
}
