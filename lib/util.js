'use strict';

module.exports = {
	delay: delay,
	glob: globs,
	mime: mime,
	random: random,
	rename: rename,
	resolve: resolve
};

const glob = require('glob').sync;

function delay(ms) {
	return new Promise(
		(resolve) => setTimeout(resolve, ms | 0)
	);
}

function globs(include, exclude) {
	include = Array.isArray(include) ?
		include :
		[include];

	return include.map(
		(pattern) => {
			try {
				return glob(pattern, {ignore: exclude});
			} catch (thrown) {
				return [];
			}
		}
	).reduce(
		(flat, list) => flat.concat(list),
		[]
	);
}

function mime(path) {
	let ext = path.toLowerCase().split('.');
	ext = ext[ext.length - 1];

	return mime[ext] ||
		'application/octet-stream';
}
Object.assign(mime, {
	appcache: 'text/cache-manifest',
	css: 'text/css',
	htm: 'text/html',
	html: 'text/html',
	js: 'application/javascript',
	json: 'application/json',
	txt: 'text/plain'
});

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rename(fn, name) {
	Object.defineProperty(fn, 'name', {
		value: name,
		configurable: true
	});

	return fn;
}

function resolve(name) {
	try {
		return require.resolve(name);
	} catch (thrown) {
		try {
			return require.resolve(process.cwd() + '/node_modules/' + name);
		} catch (thrown) {
			const path = require('requireg').resolve(name);
			if (!path) {
				throw new Error(`cannot find module '${name}'`);
			}

			return path;
		}
	}
}