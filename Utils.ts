export interface MercatorPoint {
    x: number;
    y: number;
}

export interface LabelGraphicInfo {
    url: string;
    width: number;
    height: number;
}

const ORIGIN_SHIFT = 20037508.342789244;
const LON_TO_MERCATOR = ORIGIN_SHIFT / 180.0;
const MERCATOR_TO_LON = 180.0 / ORIGIN_SHIFT;
const RAD_TO_MERCATOR = ORIGIN_SHIFT / Math.PI;
const MERCATOR_TO_RAD = Math.PI / ORIGIN_SHIFT;
const DEG_TO_RAD_HALF = Math.PI / 360.0;
const RAD_TO_DEG_DOUBLE = 360.0 / Math.PI;

export default class Utils {

    static PI_OVER_180 = Math.PI / 180.0;
    static PI_OVER_2 = Math.PI / 2.0;

    private static labelSvgCache = new Map<string, LabelGraphicInfo>();

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

    public static escapeHtml(str: string): string {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    public static lonLatToMercator(lon: number, lat: number): MercatorPoint {
        return {
            x: lon * LON_TO_MERCATOR,
            y: Math.log(Math.tan((90.0 + lat) * DEG_TO_RAD_HALF)) * RAD_TO_MERCATOR,
        };
    }

    public static mercatorToLonLat(x: number, y: number): [number, number] {
        return [
            x * MERCATOR_TO_LON,
            Math.atan(Math.exp(y * MERCATOR_TO_RAD)) * RAD_TO_DEG_DOUBLE - 90.0,
        ];
    }

    /**
     * Ramer-Douglas-Peucker simplification on projected Web Mercator coordinates.
     * Replaces legacy OpenLayers `LineString.simplify(tolerance)`.
     */
    public static simplifyLonLatAsMercator(
        coords: number[][],
        tolerance: number
    ): MercatorPoint[] {
        const n = coords.length;
        if (n === 0) return [];
        const points: MercatorPoint[] = new Array(n);
        for (let i = 0; i < n; i++) {
            points[i] = Utils.lonLatToMercator(coords[i][0], coords[i][1]);
        }
        if (n <= 2 || tolerance <= 0) {
            return points;
        }

        const sqTolerance = tolerance * tolerance;
        const keep = new Uint8Array(n);
        keep[0] = 1;
        keep[n - 1] = 1;

        const stack: [number, number][] = [[0, n - 1]];
        while (stack.length > 0) {
            const [first, last] = stack.pop()!;
            let maxSqDist = 0;
            let index = 0;

            const pFirst = points[first];
            const pLast = points[last];
            const dx = pLast.x - pFirst.x;
            const dy = pLast.y - pFirst.y;
            const lenSq = dx * dx + dy * dy;

            for (let i = first + 1; i < last; i++) {
                const p = points[i];
                let px = pFirst.x;
                let py = pFirst.y;
                if (lenSq > 0) {
                    const t = ((p.x - px) * dx + (p.y - py) * dy) / lenSq;
                    if (t > 1) {
                        px = pLast.x;
                        py = pLast.y;
                    } else if (t > 0) {
                        px += dx * t;
                        py += dy * t;
                    }
                }
                const ddx = p.x - px;
                const ddy = p.y - py;
                const sqDist = ddx * ddx + ddy * ddy;
                if (sqDist > maxSqDist) {
                    index = i;
                    maxSqDist = sqDist;
                }
            }

            if (maxSqDist > sqTolerance) {
                keep[index] = 1;
                if (index - first > 1) stack.push([first, index]);
                if (last - index > 1) stack.push([index, last]);
            }
        }

        const result: MercatorPoint[] = [];
        for (let i = 0; i < n; i++) {
            if (keep[i]) result.push(points[i]);
        }
        return result;
    }

    /**
     * Generates and caches an inline SVG data URI and dimensions for a multi-line outlined text label.
     */
    public static getLabelGraphicInfo(
        label: string,
        fontSize: number,
        color: string,
        outlineColor: string,
        outlineWidth: number
    ): LabelGraphicInfo {
        const key = `${label}|${fontSize}|${color}|${outlineColor}|${outlineWidth}`;
        const cached = Utils.labelSvgCache.get(key);
        if (cached) {
            return cached;
        }

        const lines = label.split('\n');
        let maxChars = 1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].length > maxChars) {
                maxChars = lines[i].length;
            }
        }

        const lineHeight = Math.ceil(fontSize * 1.2);
        const width = Math.ceil(maxChars * fontSize * 0.8 + outlineWidth * 2 + 12);
        const height = Math.ceil(lines.length * lineHeight + outlineWidth * 2 + 8);
        const cx = +(width / 2).toFixed(1);
        const cy = height / 2;

        let tspans = '';
        for (let i = 0; i < lines.length; i++) {
            const y = +(cy + (i - (lines.length - 1) / 2) * lineHeight).toFixed(1);
            tspans += `<tspan x="${cx}" y="${y}" dominant-baseline="central">${Utils.escapeHtml(lines[i])}</tspan>`;
        }

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text text-anchor="middle" font-family="Rubik, 'Open Sans', Alef, helvetica, sans-serif" font-weight="800" font-size="${fontSize}px" fill="${color}" stroke="${outlineColor}" stroke-width="${outlineWidth}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill">${tspans}</text></svg>`;
        const info: LabelGraphicInfo = {
            url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
            width,
            height,
        };

        if (Utils.labelSvgCache.size > 2000) {
            Utils.labelSvgCache.clear();
        }
        Utils.labelSvgCache.set(key, info);
        return info;
    }
}