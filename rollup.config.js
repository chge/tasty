import buble from 'rollup-plugin-buble';
import builtins from 'rollup-plugin-node-builtins';
import commonjs from 'rollup-plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import istanbul from 'rollup-plugin-istanbul';
import resolve from 'rollup-plugin-node-resolve';
import { uglify } from 'rollup-plugin-uglify';

import NYC from 'nyc';

const COVERAGE = process.argv.indexOf('--coverage') !== -1;

const plugins = [
	buble(),
	builtins(),
	commonjs(),
	globals(),
	resolve({
		browser: true,
		jsnext: true,
		main: true,
		module: true
	})
];

export default [
	{
		input: 'src/main.js',
		output: {
			amd: {
				id: 'tasty'
			},
			name: 'Tasty',
			file: 'dist/tasty.js',
			format: 'umd'
		},
		plugins: COVERAGE ?
			plugins.concat(
				istanbul({
					exclude: [
						'node_modules/**/*.*'
					],
					instrumenter: new NYC().createInstrumenter
				})
			) :
			plugins
	},
	{
		input: 'src/main.js',
		output: {
			amd: {
				id: 'tasty'
			},
			name: 'Tasty',
			file: 'dist/tasty.min.js',
			format: 'umd'
		},
		plugins: plugins.concat(
			uglify({
				compress: {
					dead_code: true,
					drop_console: true,
					global_defs: {
						console: undefined
					}
				}
			})
		)
	}
];
