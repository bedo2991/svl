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


    /**
 * Efficiently calculates the sine of an angle (in radians) using a Taylor series expansion.
 * @param input Angle in radians
 * @returns Approximation of the sine of the input angle
 */
    public static efficientSin(input: number): number {
        // Calculate powers efficiently
        const x_squared = input * input;
        const x_cubed = x_squared * input;
        const x_to_the_fifth = x_cubed * x_squared;

        // Note: 3! = 6, 5! = 120
        // sin(x) ≈ x - (x^3 / 6) + (x^5 / 120)
        return input - (x_cubed / 6.0) + (x_to_the_fifth / 120.0);
    }

    /**
 * Efficiently calculates the cosine of an angle (in radians) using a Taylor series expansion.
 * @param input Angle in radians
 * @returns Approximation of the cosine of the input angle
 */
    public static efficientCos(input: number): number {
        const x_squared = input * input;
        const x_to_the_fourth = x_squared * x_squared;

        // Note: 2! = 2, 4! = 24
        return 1.0 - (x_squared / 2.0) + (x_to_the_fourth / 24.0);
    }
}