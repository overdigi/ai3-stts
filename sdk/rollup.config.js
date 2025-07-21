import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

export default [
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ai3-stts.esm.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
      }),
    ],
    external: ['socket.io-client'],
  },
  // UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ai3-stts.js',
      format: 'umd',
      name: 'AI3STTS',
      sourcemap: true,
      globals: {
        'socket.io-client': 'io',
      },
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
    ],
    external: ['socket.io-client'],
  },
  // Minified UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/ai3-stts.min.js',
      format: 'umd',
      name: 'AI3STTS',
      sourcemap: true,
      globals: {
        'socket.io-client': 'io',
      },
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      }),
    ],
    external: ['socket.io-client'],
  },
];