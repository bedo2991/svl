import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';

// 1. Check the environment variable (NODE_ENV is standard for production)
const isProduction = process.env.NODE_ENV === 'production';

// 2. Define the minification plugin array
const plugins = [
    resolve(),
    typescript(),
    image(),
];

if (isProduction) {
    console.warn("Building for RELEASE");
    plugins.push(terser());
    plugins.push(replace({
        preventAssignment: true,
        __DEBUG__: false
    }));
} else {
    plugins.push(replace({
        preventAssignment: true,
        __DEBUG__: true
    }));
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