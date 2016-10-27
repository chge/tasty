'use strict';

module.exports = {
	delay: delay,
	glob: globs,
	mime: mime,
	parseJson: parseJson,
	random: random,
	readFile: readFile,
	rename: rename,
	resolve: resolve,
	serialize: serialize
};

const glob = require('glob').sync,
	fs = require('fs');

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

function parseJson(raw) {
	try {
		return JSON.parse(raw.toString());
	} catch (thrown) {
		return thrown;
	}
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function readFile(path) {
	return new Promise(
		(resolve, reject) => fs.readFile(
			path,
			(error, content) => error ?
				reject(error) :
				resolve(content)
		)
	);
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

function serialize(value, type) {
	if (arguments.length === 2) {
		return {
			t: type,
			v: value
		};
	}
	if (!value) {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map(
			(arg) => serialize(arg)
		);
	}

	// WORKAROUND: value comes from sandboxed VM, so built-in constructors won't the same.

	if (value.constructor.name === 'RegExp') {
		return {
			t: 're',
			v: value.flags ?
				[value.source, value.flags] :
				[value.source]
		};
	}

	return value;
}
