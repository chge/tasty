import buble from 'rollup-plugin-buble';
import commonjs from 'rollup-plugin-commonjs';
import istanbul from 'rollup-plugin-istanbul';
import resolve from 'rollup-plugin-node-resolve';

const plugins = [
	commonjs(),
	resolve({
		jsnext: true,
		main: true,
		browser: true
	}),
	buble()
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
	moduleId: 'tasty',
	moduleName: 'tasty',
	plugins: plugins
};