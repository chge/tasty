import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';
import resolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';

import NYC from 'nyc';

const plugins = [
	buble(),
	commonjs(),
	resolve({
		jsnext: true,
		main: true,
		browser: true
	}),
	// WORKAROUND: rollup-plugin-commonjs makes conditional require() useless for https://github.com/socketio/engine.io-parser/pull/58
	{
		transformBundle: (code) => code.replace(
			'var lookup = new Uint8Array(256);',
			"var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);"
		)
	}
];

if (process.argv.indexOf('--coverage') !== -1) {
	const nyc = new NYC(),
		istanbul2 = new nyc._instrumenterLib.istanbul();

	plugins.push(
		istanbul({
			exclude: [
				'node_modules/**/*.*'
			],
			// WORKAROUND: plugin uses obsolete API.
			instrumenter: {
				Instrumenter: istanbul2.createInstrumenter
			}
		})
	);
}

const bundle = {
	amd: {
		id: 'tasty'
	},
	dest: 'dist/tasty.js',
	entry: 'src/main.js',
	format: 'umd',
	legacy: true,
	moduleName: 'Tasty',
	plugins: plugins
};

export default [
	bundle,
	Object.assign({}, bundle, {
		dest: 'dist/tasty.min.js',
		plugins: plugins.concat(
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
		)
	})
];
