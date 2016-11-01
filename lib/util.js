'use strict';

module.exports = {
	delay: delay,
	describeFlaws: describeFlaws,
	glob: globs,
	mime: mime,
	parseJson: parseJson,
	parseFlaws: parseFlaws,
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

function describeFlaws(flaws) {
	if (!flaws) {
		return [];
	}
	const DESCRIPTION = {
		pseudo: 'can\'t search through pseudo-elements',
		selector: 'doesn\'t support Selectors API'
	};

	return flaws.split(',').map(
		(flaw) => DESCRIPTION[flaw] || 'has unknown flaw ' + flaw
	);
}

function globs(include, exclude) {
	include = Array.isArray(include) ?
		include :
		[include];

	const all = include.map(
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

	// NOTE unique.
	return Array.from(
		new Set(all)
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

function parseFlaws(flaws) {
	if (!flaws) {
		return {};
	}

	const flags = {};
	flaws.split(',').forEach(
		(flaw) => {
			flags[flaw] = true;
		}
	);

	return flags;
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
		// NOTE respect the elders.
		const flags = 'flags' in value ?
			value.flags :
			[
				value.global ? 'g' : '',
				value.ignoreCase ? 'i' : '',
				value.multiline ? 'm' : '',
				value.unicode ? 'u' : '',
				value.sticky ? 'y' : ''
			].join('');

		return {
			t: 're',
			v: flags ?
				[value.source, flags] :
				[value.source]
		};
	}

	return value;
}
