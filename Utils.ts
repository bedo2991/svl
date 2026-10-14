export default class Utils {

    static PI_OVER_180 = Math.PI / 180.0;
    static PI_OVER_2 = Math.PI / 2.0;

    private constructor() { }

    public static debugLog(message: string, ...args: any[]): void {
        if (__DEBUG__) {
            console.debug(`[SVL DEBUG]: ${message}`, ...args);
        }
    }

    public static bestBackground(color: string) {
        const oppositeColor =
            parseInt(color.substring(1, 3), 16) * 0.299 +
            parseInt(color.substring(3, 5), 16) * 0.587 +
            parseInt(color.substring(5, 7), 16) * 0.114;
        if (oppositeColor < 127) {
            return '#FFF';
        }
        return '#000';
    }

    public static feetToMeters(feet: number): number {
        return feet * 0.3048;
    }
}