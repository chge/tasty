'use strict';

// NOTE user must inject tool.console;

export default tool;

tool.hook = hook;

import * as dom from './dom';
import * as util from './util';

const delay = util.delay,
	escape = util.escape,
	forEach = util.forEach,
	format = util.format,
	random = util.random,
	reason = util.reason,
	thenable = util.thenable;

function tool(name, handle, callback) {
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

	if (!tool[name]) {
		throw reason('no such tool', name);
	}
	const space = name.split('.')[0],
		args = handle;

	tool.console.debug('tasty', 'tool', name, handle);

	return hook(name, 'before.tool', args)
		.then((result) => hook(result, 'before.' + space, args))
		.then((result) => hook(result, 'before.' + name, args))
		.then(() => tool[name](...args))
		.then((result) => hook(result, 'after.' + name, args))
		.then((result) => hook(result, 'after.' + space, args))
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

			result = listener.apply(this, arguments);
			if (listener.once) {
				delete hook[key];
			}
		}
	};

	return thenable(result);
}

// NOTE client.

tool('client.breakpoint', () => {
	debugger;
});

tool('client.go', (value) => {
	return thenable(() => {
		// NOTE never resolve.
		window.history.go(value);
	});
});

tool('client.location', function(what) {
	if (!arguments.length) {
		return window.location.pathname;
	}
	// TODO smart matching.
	what = what instanceof RegExp ?
		what :
		new RegExp(escape(what, true));

	if (!what.test(
			// NOTE slash is escaped.
			what.source.indexOf('\/') === 0 ?
				window.location.pathname :
				window.location.href
	)) {
		throw reason('location', window.location.pathname, 'is not', what.source);
	}
});

tool('client.navigate', (url) => {
	// TODO allow to skip navigation if url already matches.
	return thenable(() => {
		// NOTE never resolve.
		// TODO close socket first.
		window.location = url;
	});
});

tool('client.reload', () => {
	return thenable(() => {
		// NOTE never resolve.
		// TODO close socket first.
		window.location.reload(true);
	});
});

tool('client.reset', (url) => {
	const token = util.session(),
		done = () => {
			util.session(token);
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
			//document.cookie = pair.split('=')[0] + "=; expires=" + Date.now() + "; domain=" + document.domain + "; path=/";
		}
	);

	// NOTE clear Storage.
	localStorage.clear();
	sessionStorage.clear();
	// NOTE clear indexedDB.
	let chain = thenable();
	if (window.indexedDB && indexedDB.webkitGetDatabaseNames) {
		let request = indexedDB.webkitGetDatabaseNames();
		request.onsuccess = (event) => {
			forEach(
				event.target.result,
				(name) => {
					chain = chain.then(() => thenable((resolve, reject) => {
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

// NOTE page.

tool('page.font', (family, selector) => {
	// TODO window.getComputedStyle(selector).fontFamily, document.fonts.keys()
	throw reason('not implemented yet, sorry');
});

tool('page.loaded', (src) => {
	if (!src) {
		return document.readyState === 'complete';
	}

	let type = src.toLowerCase().split('.'),
		origin = location.origin ||
			location.protocol + '//' + location.host,
		url = origin + src,
		list, item, found, i;
	switch (type ? type[type.length - 1] : null) {
		case 'appcache':
			list = [];
			if (document.documentElement.getAttribute('manifest') === src) {
				return format(document.documentElement);
			}
			break;
		case 'css':
			list = document.getElementsByTagName('link');
			break;
		case 'js':
			list = document.getElementsByTagName('script');
			break;
		case 'bmp':
		case 'gif':
		case 'ico':
		case 'jpg':
		case 'jpeg':
		case 'png':
			list = [];
			forEach(
				document.getElementsByTagName('img'),
				(img) => list.push(img)
			);
			forEach(
				document.getElementsByTagName('link'),
				(img) => list.push(img)
			);
			// TODO picture, background-image, :before, :after, css states.
			break;
		// TODO more.
		default:
			list = document.getElementsByTagName('*');
	}

	for (i = 0; i < list.length; i++) {
		item = list[i];
		if (item.src === url || item.href === url) {
			// TODO try to check if loaded.
			return format(item);
		}
	}

	throw reason('resource', src, 'not found');
});

tool('page.text', (what, selector, reachable) => {
	// TODO validate args.
	what = what ?
		what instanceof RegExp ?
			what :
			new RegExp(escape(what, true)) :
		null;
	reachable = reachable !== false &&
		selector !== false;

	let found = dom.find(what, selector);
	if (!found) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'not found'
		);
	}
	found = found.nodeType === 3 ?
		found.parentNode :
		found;
	if (!dom.is(found, !reachable)) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'is not fully visible'
		);
	}
	if (reachable) {
		const [actual] = dom.reach(found);
		if (actual !== found) {
			throw reason(
				'node', format(found), 'with text', what, 'is covered by node', format(actual)
			);
		}
	}
});

tool('page.title', (what) => {
	// TODO validate args.
	what = what instanceof RegExp ?
		what :
		new RegExp(escape(what, true));

	if (!what.test(document.title)) {
		throw reason('title', document.title, 'is not', what.source);
	}
});

// NOTE input.

tool('input.click', (what, selector, reachable) => {
	// TODO validate args.
	what = what ?
		what instanceof RegExp ?
			what :
			selector === true ?
				new RegExp('^' + escape(what, true) + '$') :
				new RegExp(escape(what, true)) :
		null;
	reachable = reachable !== false &&
		selector !== false;

	let found = dom.find(what, selector);
	if (!found) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'not found'
		);
	}
	found = found.nodeType === 3 ?
		found.parentNode :
		found;
	// TODO traverse
	if (found.disabled) {
		throw reason(
			'node', format(found), 'with text', what, 'is disabled'
		);
	}
	if (!dom.is(found, !reachable)) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'is not fully visible'
		);
	}
	const [actual, x, y] = dom.reach(found);
	if (reachable && actual !== found) {
		throw reason(
			'node', format(found), 'with text', what, 'is covered by node', format(actual)
		);
	}
	dom.click(actual);
});

tool('input.hover', (what, selector, reachable) => {
	// TODO validate args.
	what = what ?
		what instanceof RegExp ?
			what :
			selector === true ?
				new RegExp('^' + escape(what, true) + '$') :
				new RegExp(escape(what, true)) :
		null;
	reachable = reachable !== false &&
		selector !== false;

	let found = dom.find(what, selector);
	if (!found) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'not found'
		);
	}
	found = found.nodeType === 3 ?
		found.parentNode :
		found;
	// TODO traverse
	if (found.disabled) {
		throw reason(
			'node', format(found), 'with text', what, 'is disabled'
		);
	}
	if (!dom.is(found, !reachable)) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'is not fully visible'
		);
	}
	const [actual, x, y] = dom.reach(found);
	if (reachable && actual !== found) {
		throw reason(
			'node', format(found), 'with text', what, 'is covered by node', format(actual)
		);
	}
	dom.hover(actual);
});

tool('input.paste', (text) => {
	const target = document.activeElement;
	if (!('value' in target)) {
		throw reason('cannot type into active node', format(target));
	}

	const value = target.value,
		start = target.selectionStart || value.length,
		end = target.selectionEnd || value.length;
	target.value = value.substr(0, start) +
		text +
		value.substr(end, value.length);

	dom.trigger(target, 'ClipboardEvent', 'paste', true, true);
	'oninput' in window ?
		dom.trigger(target, 'Event', 'input', true, false) :
		dom.trigger(target, 'Event', 'change', true, false);
});

tool('input.type', (text) => {
	const target = document.activeElement;
	if (!('value' in target)) {
		throw reason('cannot type into active node', format(target));
	}

	return thenable((resolve) => {
		let chain = thenable();
		forEach(text.split(''), (char) => {
			chain = chain
				.then(
					() => {
						const value = target.value,
							start = target.selectionStart || value.length,
							end = target.selectionEnd || value.length;
						target.value = value.substr(0, start) +
							char +
							value.substr(end, value.length);

						'oninput' in window ?
							dom.trigger(target, 'Event', 'input', true, false) :
							dom.trigger(target, 'Event', 'change', true, false);
					}
				)
				.then(
					() => delay(random(1, 100))
				);
		});

		resolve(chain);
	});
});
