import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';
import resolve from 'rollup-plugin-node-resolve';

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

export default {
	dest: 'dist/tasty.js',
	entry: 'src/main.js',
	format: 'umd',
	legacy: true,
	moduleId: 'tasty',
	moduleName: 'tasty',
	plugins: plugins
};
