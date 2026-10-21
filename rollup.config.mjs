import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';

function inlineCss() {
    return {
        name: 'inline-css',
        transform(code, id) {
            if (!id.endsWith('.css')) return null;
            return {
                code: `const style = document.createElement('style'); style.textContent = ${JSON.stringify(code)}; document.head.appendChild(style);`,
                map: { mappings: '' }
            };
        }
    };
}

// 1. Check the environment variable (NODE_ENV is standard for production)
const isProduction = process.env.NODE_ENV === 'production';

// 2. Define the plugin array (replace must run before typescript/terser for dead-code elimination)
const plugins = [
    replace({
        preventAssignment: true,
        __DEBUG__: JSON.stringify(!isProduction)
    }),
    inlineCss(),
    resolve(),
    commonjs(),
    typescript(),
    image(),
];

if (isProduction) {
    console.warn("Building for RELEASE");
    plugins.push(terser());
} else {
    console.log("Building for development");
}

export default {
    input: 'main.user.ts',
    output: {
        file: '.out/main.user.js',
        format: 'iife'
    },
    plugins: plugins
};
