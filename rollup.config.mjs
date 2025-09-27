import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import image from '@rollup/plugin-image';

export default {
    input: 'main.user.ts',
    output: {
        file: '.out/main.user.js',
        format: 'iife'
    },
    plugins: [resolve(), typescript(), image()]
};