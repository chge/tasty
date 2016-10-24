import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';
import resolve from 'rollup-plugin-node-resolve';

const plugins = [
	buble(),
	commonjs(),
	resolve({
		jsnext: true,
		main: true,
		browser: true
	}),
	// WORKAROUND: https://github.com/rollup/rollup/pull/1057
	{
		transformBundle: (code) => code.replace(/(\(Object\.freeze \|\| Object\)\({\s+)default:/g, "$1'default':")
	},
	// WORKAROUND: rollup-plugin-commonjs makes conditional require() useless for https://github.com/socketio/engine.io-parser/pull/58
	{
		transformBundle: (code) => code.replace('var lookup = new Uint8Array(256);', "var lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);")
	}
];

process.argv.indexOf('--coverage') !== -1 &&
	plugins.push(
		istanbul({
			exclude: [
				'node_modules/**/*.*'
			]
		})
	);

export default {
	dest: 'dist/tasty.js',
	entry: 'src/main.js',
	format: 'umd',
	legacy: true,
	moduleId: 'tasty',
	moduleName: 'tasty',
	plugins: plugins
};