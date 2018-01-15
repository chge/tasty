'use strict';

module.exports = {
	delay: delay,
	describeFlaws: describeFlaws,
	formatArgs: formatArgs,
	formatConfig: formatConfig,
	formatExec: formatExec,
	glob: globs,
	instance: instance,
	mime: mime,
	parseJson: parseJson,
	parseFlaws: parseFlaws,
	random: random,
	readFile: readFile,
	rename: rename,
	resolve: resolve
};

const debug = require('debug')('tasty:util'),
	fs = require('fs'),
	glob = require('glob'),
	inspect = require('util').inspect;

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
		doctype: 'doesn\'t properly support DOM DocumentType',
		font: 'doesn\'t support Font Loading API',
		history: 'doesn\'t fully support HTML5 History API',
		navigation: 'requires emulation of anchor navigation',
		placeholder: 'doesn\'t support placeholders',
		pseudo: 'can\'t search through pseudo-elements',
		selector: 'doesn\'t support Selectors API',
		shadow: 'doesn\'t support Shadow DOM',
		validation: 'doesn\'t support HTML5 Forms API',
		websocket: 'has unsupported WebSocket implementation'
	};

	return flaws.split(',').map(
		(flaw) => DESCRIPTION[flaw] || 'has unknown flaw ' + flaw
	);
}

function formatArgs(args, indent, offset) {
	return Array.isArray(args) ?
		offset + '[\n' +
			args.map(
				(arg) => formatArgs(arg, indent, offset + indent)
			).join(',\n') +
		'\n' + offset + ']' :
		offset + (JSON.stringify(args) || args + '');
}

function formatConfig(config) {
	const filtered = Object.assign({}, config);
	Object.keys(filtered).forEach((key) => {
		if (key.length < 2 || typeof filtered[key] === 'undefined') {
			delete filtered[key];
		}
	});

	return inspect(filtered, {
		breakLength: Infinity,
		colors: debug.useColors
	});
}

function formatExec(path, code, args) {
	// TODO support different line breaks.

	code = code + '';
	let start = /\n(\s*)/.exec(code),
		end = /\n(\s*)[^\n]*$/.exec(code);
	start = start ? start[1] : '';
	end = end ? end[1] : '';
	const indent = start.indexOf('\t') === -1 ?
		start.length % 4 === 0 ?
			'    ' :
			'  ' :
		'\t';

	code = start ?
		code.replace(new RegExp(start, 'g'), indent + indent + indent) :
		code;
	code = end ?
		code.replace(new RegExp(end, 'g'), indent + indent) :
		code;
	args = formatArgs(args, indent, indent + indent);

return `try {
${indent}this['${path}'] = (
${indent}${indent}${code}
${indent}).apply(
${indent}${indent}this['${path}'],
${args}
${indent});
} catch (thrown) {
${indent}this['${path}'] = thrown;
}`;
}

function globs(include, exclude) {
	include = Array.isArray(include) ?
		include :
		[include];

	// NOTE 1, *, 1, 2 becomes 1, 3, 2;

	let magic = [];
	const deep = unique(
			include.map((pattern) => {
				try {
					const list = glob.sync(pattern, {ignore: exclude});

					return glob.hasMagic(pattern) ?
						list :
						list[0] || [];
				} catch (thrown) {
					return [];
				}
			})
		),
		flat = deep.reduce((memo, item) => {
			magic = magic.concat(
				Array.isArray(item) ?
					item :
					null
			);

			return memo.concat(item);
		}, []);

	return flat.filter((path, index) => {
		let other = flat.indexOf(path);
		other = other === index ?
			flat.indexOf(path, Math.min(index + 1, flat.length - 1)) :
			other;

		return other === index ||
			other === -1 ||
				!magic[index];
	});
}

function instance(value, ctor) {
	// WORKAROUND: constructor.name works for values from sandboxed VMs,
	// which has their own built-in constructors.
	return value instanceof ctor ||
		value && ctor && value.constructor.name === ctor.name;
}

function mime(path) {
	let ext = path.toLowerCase().split('.');
	ext = ext[ext.length - 1];

	return mime[ext] ||
		'application/octet-stream';
}

// TODO better.
Object.assign(mime, {
	appcache: 'text/cache-manifest',
	css: 'text/css',
	htm: 'text/html',
	html: 'text/html',
	js: 'application/javascript',
	json: 'application/json',
	svg: 'image/svg+xml',
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
	if (Array.isArray(name)) {
		for (let i = 0; i < name.length; i++) {
			try {
				return resolve(name[i]);
			} catch (thrown) {
				continue;
			}
		}
	}

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

function unique(array) {
	return Array.from(
		new Set(array)
	);
}
