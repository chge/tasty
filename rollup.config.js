import buble from 'rollup-plugin-buble';
import builtins from 'rollup-plugin-node-builtins';
import commonjs from 'rollup-plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import istanbul from 'rollup-plugin-istanbul';
import resolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';

import NYC from 'nyc';

const COVERAGE = process.argv.indexOf('--coverage') !== -1,
	MINIFY = process.argv.indexOf('--minify') !== -1;

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
	}),
/*	{
		transform: (source, id) => '// ' + id + '\n' + source
	},
	{
		// WORKAROUND for bare-required shims in sockjs-client.
		transform: (source, id) => id.substr(-8) === 'shims.js' ?
			source.replace('import * as shims from', 'import') :
			source,
		transformBundle: (source) => source
			// WORKAROUND for rollup-plugin-commonjs and sockjs-client.
			.replace("( shims && shims['default'] ) || shims;", '')
			// WORKAROUND for rollup-plugin-node-globals.
			.replace(
				/process\.env\.([A-Z_]+)/g,
				(match, p1) => process.env[p1]
			)
			// WORKAROUND for rollup-plugin-node-globals.
			.replace(/global\./g, 'window.')
			// WORKAROUND for rollup-plugin-node-globals.
			.replace(/process\.version/g, "'" + process.version + "'")
	}*/
];

COVERAGE &&
	plugins.push(
		istanbul({
			exclude: [
				'node_modules/**/*.*'
			],
			instrumenter: new NYC().createInstrumenter
		})
	);

MINIFY &&
	plugins.push(
		uglify({
			ie8: true,
			compress: {
				dead_code: true,
				drop_console: true,
				global_defs: {
					console: undefined
				}
			}
		})
	);

export default {
	amd: {
		id: 'tasty'
	},
	input: 'src/main.js',
	legacy: true,
	output: {
		name: 'Tasty',
		file: MINIFY ?
			'dist/tasty.min.js' :
			'dist/tasty.js',
		format: 'umd'
	},
	plugins: plugins
};
