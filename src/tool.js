'use strict';

// NOTE user must inject tool.console;
// NOTE user must inject tool.flaws;

export default tool;

tool.hook = hook;

import * as dom from './dom';
import * as util from './util';

const assign = util.assign,
	delay = util.delay,
	deserialize = util.deserialize,
	escape = util.escape,
	forEach = util.forEach,
	format = util.format,
	highlight = dom.highlight,
	random = util.random,
	reason = util.reason,
	thenable = util.thenable;

function tool(name, handle) {
	if (typeof handle === 'function') {
		if (!name) {
			throw reason('invalid name', name);
		}
		if (!handle || typeof handle !== 'function') {
			throw reason('invalid handle', handle);
		}

		return tool[name] = (...args) => {
			return thenable(handle(...args));
		};
	}

	const space = name.indexOf('.') === -1 ?
			null :
			name.split('.')[0],
		args = deserialize(handle);

	tool.console.log('tasty', 'tool', name, args);

	return hook(name, 'before.tool', args)
		.then((result) => space ? hook(result, 'before.' + space, args) : result)
		.then((result) => hook(result, 'before.' + name, args))
		.then(() => {
			if (tool[name]) {
				return tool[name](...args);
			} else {
				throw reason('no such tool', name);
			}
		})
		.then((result) => hook(result, 'after.' + name, args))
		.then((result) => space ? hook(result, 'after.' + space, args) : result)
		.then((result) => hook(result, 'after.tool', name, args));
}

function hook(result, key, args) {
	if (typeof key === 'function') {
		let keys = result,
			listener = key,
			title = args;

		keys = util.isArray(keys) ?
			keys :
			[keys];
		listener.title = title;
		forEach(keys, (k) => {
			hook[k] = listener;
		});

		return listener;
	}

	const listener = hook[key];
	if (listener) {
		if (listener.skip) {
			tool.console.debug('tasty', 'hook', key, 'skip');

			delete listener.skip;
		} else {
			tool.console.debug('tasty', 'hook', key, listener.title || '(anonymous)', listener.once ? 'once' : '');

			if (listener.once) {
				delete hook[key];
			}
			result = listener.apply(this, arguments);
		}
	}

	return thenable(result);
}

tool('breakpoint', () => {
	debugger; // eslint-disable-line no-debugger
});

tool('is', (what, where, options) => {
	const found = search(what, where, options, {reachable: true});
	if (found) {
		highlight(found);
	} else {
		throw reason('no', what, 'in', where);
	}
});

tool('no', (what, where, options) => {
	const found = search(what, where, options, {reachable: true});
	if (found) {
		highlight(found);
		throw reason('found', what, 'in', where, 'as', format(found));
	}
});

tool('clear', (count) => {
	const target = document.activeElement;
	if (target === document.body) {
		throw reason('no active node to clear');
	}
	if (!('value' in target)) {
		throw reason('wrong active node', target, 'to clear');
	}
	if (target.disabled) {
		throw reason('disabled active node', target, 'to clear');
	}
	if (target.readOnly) {
		throw reason('read-only active node', target, 'to clear');
	}
	tool.console.debug('tasty', 'clear', 'target', target);
	highlight(target);

	return thenable((resolve) => {
		let chain = thenable(),
			length = count === true ? 1 : (count | 0) || target.value.length,
			i;
		for (i = 0; i < length; i++) {
			chain = chain
				.then(
					() => i && delay(random(1, 100))
				)
				.then(
					() => {
						// TODO support selection?
						if (count === true) {
							target.value = '';
						} else {
							target.value = target.value.substr(0, target.value.length - 1);
						}

						'oninput' in window ?
							dom.trigger(target, 'Event', 'input', {cancellable: false}) :
							dom.trigger(target, 'Event', 'change', {cancellable: false});
					}
				);
		}

		resolve(chain);
	});
});

tool('click', (what, where, options) => {
	const target = search(what, where, options);
	if (!target) {
		throw reason('no', what, 'in', where, 'to', 'click');
	}
	tool.console.debug('tasty', 'click', 'target', target);

	highlight(target);
	dom.click(
		target,
		tool.flaws.navigation
	);
});

tool('dblclick', (what, where, options) => {
	const target = search(what, where, options);
	if (!target) {
		throw reason('no', what, 'in', where, 'to', 'dblclick');
	}
	tool.console.debug('tasty', 'dblclick', 'target', target);

	highlight(target);
	dom.dblclick(
		target,
		tool.flaws.navigation
	);
});

tool('history', (value) => {
	if (value < 0 && history.length <= -value) {
		throw reason('history', 'length', 'is', history.length);
	}

	return thenable(() => {
		// NOTE never resolve.
		window.history.go(value);
	});
});

tool('hover', (what, where, options) => {
	const target = search(what, where, options);
	if (!target) {
		throw reason('no', what, 'in', where, 'to', 'hover');
	}
	tool.console.debug('tasty', 'hover', 'target', target);

	// TODO highlight target?
	dom.hover(target);
});

tool('navigate', (url) => {
	// TODO allow to skip navigation if url already matches.
	return thenable(() => {
		// NOTE never resolve.
		window.location = url;
	});
});

tool('paste', (text) => {
	const target = document.activeElement;
	if (!('value' in target)) {
		throw reason('cannot paste into active node', target);
	}
	if (target.disabled) {
		throw reason('cannot paste into disabled node', target);
	}
	if (target.readOnly) {
		throw reason('cannot paste into read-only node', target);
	}
	tool.console.debug('tasty', 'paste', 'target', target);
	highlight(target);

	const value = target.value,
		start = target.selectionStart || value.length,
		end = target.selectionEnd || value.length;
	target.value = value.substr(0, start) +
		text +
		value.substr(end, value.length);

	dom.trigger(target, 'ClipboardEvent', 'paste');
	'oninput' in window ?
		dom.trigger(target, 'Event', 'input', {cancellable: false}) :
		dom.trigger(target, 'Event', 'change', {cancellable: false});
});

tool('reload', () => {
	return thenable(() => {
		// NOTE never resolve.
		window.location.reload(true);
	});
});

tool('reset', (url) => {
	// NOTE session is restored in window.unload;
	const done = () => {
		if (typeof url === 'string') {
			// TODO close socket first.
			window.location = url;
		} else {
			url === false ||
				// TODO close socket first.
				window.location.reload(true);
		}
	};

	// NOTE clear cookies.
	forEach(
		document.cookie.split(';'),
		(pair) => {
			document.cookie = pair.split('=')[0] + "=; expires=" + util.now() + "; domain=" + document.domain + "; path=/";
		}
	);

	// NOTE clear Storage.
	localStorage.clear();
	sessionStorage.clear();

	// NOTE this preserves session when unload event doesn't work.
	util.session();

	// NOTE clear indexedDB.
	let chain = thenable();
	if (window.indexedDB && indexedDB.webkitGetDatabaseNames) {
		let request = indexedDB.webkitGetDatabaseNames();
		request.onsuccess = (event) => {
			forEach(
				event.target.result,
				(name) => {
					chain = chain.then(() => thenable((resolve) => {
						request = indexedDB.deleteDatabase(name);
						request.onsuccess = resolve;
						request.onerror = (event) => tool.console.error('tasty', event);
						request.onblocked = (event) => tool.console.error('tasty', event);
					}));
				}
			);
		};
		request.onfailure = (event) => tool.console.error('tasty', event);
	}

	chain.then(done, done);
	// TODO other.
});

tool('type', (text) => {
	const target = document.activeElement;
	if (!('value' in target)) {
		throw reason('cannot type into active node', target);
	}
	if (target.disabled) {
		throw reason('cannot type into disabled node', target);
	}
	if (target.readOnly) {
		throw reason('cannot type into read-only node', target);
	}
	tool.console.debug('tasty', 'type', 'target', target);
	highlight(target);

	return thenable((resolve) => {
		let chain = thenable();
		forEach(text.split(''), (char, i) => {
			chain = chain
				.then(
					() => i && delay(random(1, 100))
				)
				.then(
					() => {
						const value = target.value,
							start = target.selectionStart || value.length,
							end = target.selectionEnd || value.length;
						target.value = value.substr(0, start) +
							char +
							value.substr(end, value.length);

						'oninput' in window ?
							dom.trigger(target, 'Event', 'input', {cancellable: false}) :
							dom.trigger(target, 'Event', 'change', {cancellable: false});
					}
				);
		});

		resolve(chain);
	});
});

// TODO
function thing(type, value) {
	type = type || 'unknown';

	return typeof type === 'object' ?
		type :
		typeof value === 'undefined' ?
			{
				type: type
			} :
			{
				type: type,
				value: value
			};
}

/**
 * Searches things on client.
 * @memberof tasty
 * @param {Thing|String|RegExp} what {@link /tasty/?api=test#Thing|Thing} to search.
 * @param {Thing|String} [where=window] {@link /tasty/?api=test#Thing|Thing} to search in. String means {@link /tasty/?api=test#nodes|`nodes`}.
 * @param {Object|Boolean} [options] Search options.
 * @param {Boolean} [options.strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
 * @param {Boolean} [options.reachable] Make sure found node is reachable: isn't covered with other nodes.
 * @param {Object|Boolean} [defaults] Defaults for `options`.
 */
export function search(what, where, options, defaults) {
	what = typeof what === 'string' ?
		thing('text', what) :
		thing(what);
	where = typeof where === 'string' ?
		thing('nodes', where) :
		thing(where);
	defaults = typeof defaults === 'boolean' ?
		{reachable: defaults} :
		defaults || {};
	options = typeof options === 'boolean' ?
		{strict: options} :
		assign(options || {}, defaults);

	const value = what.value,
		regexp = value instanceof RegExp ?
			value :
			new RegExp(escape(value, true)),
		source = regexp.source;

	switch (what.type) {
		case 'any':
		case 'empty':
		case 'image':
		case 'node':
		case 'nodes':
		case 'text': {
			const found = dom.find(what, where, options);
			if (!found) {
				return null;
			}

			// NOTE found could be text Node, while reached is always an Element.
			const parent = found.parentNode,
				reached = dom.reach(found);
			if (parent === document.body ||
					reached === document ||
						reached === document.documentElement ||
							reached === document.body
			) {
				return found;
			}
			if (options.reachable && reached !== found && reached !== parent) {
				throw reason('found', found, 'is covered by', reached);
			}

			return reached === parent ?
				found :
				reached;
		}
		case 'css':
			return findInList('href', regexp, document.getElementsByTagName('link'));
		case 'doctype': {
			const doctype = formatDoctype(document.doctype);
			if (!doctype) {
				throw reason('document has no doctype');
			}
			if (!regexp.test(doctype)) {
				throw reason('doctype', doctype, 'is not', regexp);
			}

			return doctype;
		}
		case 'favicon':
			throw reason(what.type, 'is not implemented yet, sorry');
		case 'font':
			return where ?
				dom.find(what, where, options) :
				document.fonts.check(value);
		case 'location': {
			// NOTE slashes are escaped.
			const location = source.indexOf('\\/') === 0 ?
				window.location.pathname :
				window.location.href;
			if (!regexp.test(location)) {
				throw reason('location', location, 'is not', value instanceof RegExp ? regexp : source);
			}

			return location;
		}
		case 'manifest': {
			let manifest = document.documentElement.getAttribute('manifest');
			if (manifest) {
				if (!regexp.test(manifest)) {
					throw reason('app cache manifest', manifest, 'is not', regexp);
				}
				return manifest;
			}
			manifest = util.find(
				dom.nodeListToArray(
					document.getElementsByTagName('link')
				),
				(link) => link.rel === 'manifest'
			);
			if (manifest) {
				if (!regexp.test(manifest.href)) {
					throw reason('web app manifest', manifest.href, 'is not', regexp);
				}
				return manifest;
			}
			throw reason('document has no manifest');
		}
		case 'script':
			return findInList('src', regexp, document.getElementsByTagName('script'));
		case 'title':
			if (!regexp.test(document.title)) {
				throw reason('title', document.title, 'is not', regexp);
			}
			return document.title;
		default:
			throw reason(what.type, 'is not supported');
	}
}

function findInList(key, regexp, list) {
	return util.find(list, (item) => {
		return regexp.test(item[key]);
	});
}

/**
 * @license CC BY-SA 3.0 http://stackoverflow.com/a/27838954
 * @license CC BY-SA 3.0 http://stackoverflow.com/a/10162353
 */
function formatDoctype(doctype) {
	if (!doctype) {
		return null;
	}

	// NOTE some browsers could fail to serialize doctype.
	const serialized = 'XMLSerializer' in window ?
		new XMLSerializer().serializeToString(doctype) :
		null;

	return serialized ||
		[
			'<!DOCTYPE ',
				doctype.name,
				doctype.publicId ? ' PUBLIC "' + doctype.publicId + '"' : '',
				!doctype.publicId && doctype.systemId ? ' SYSTEM' : '',
				doctype.systemId ? ' "' + doctype.systemId + '"' : '',
			'>'
		].join('');
}
