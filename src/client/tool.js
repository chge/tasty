'use strict';

module.exports = tool;

tool.hook = hook;

const dom = require('./dom'),
	log = require('./log'),
	util = require('./util');

const delay = util.delay,
	escape = util.escape,
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

	log.debug('tool', name, handle);

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
			listener = key;

		keys = Array.isArray(keys) ?
			keys :
			[keys];
		keys.forEach((k) => {
			hook[k] = listener;
		});

		return listener;
	}

	const listener = hook[key];
	if (listener) {
		if (listener.skip) {
			log.debug('hook', key, 'skip');

			delete listener.skip;
		} else {
			log.debug('hook', key, listener.name || '(anonymous)', listener.once ? 'once' : '');

			result = listener.apply(this, arguments);
			if (listener.once) {
				delete hook[key];
			}
		}
	};

	return thenable(result);
}

// NOTE client.

tool('client.breakpoint', function breakpoint() {
	debugger;
});

tool('client.location', function location(what) {
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

tool('client.navigate', function navigate(url) {
	// TODO allow to skip navigation if url already matches?
	return thenable(() => {
		// NOTE never resolve.
		window.location = url;
	});
});

tool('client.reload', function reload() {
	return thenable(() => {
		// NOTE never resolve.
		window.location.reload(true);
	});
});

tool('client.reset', function reset(url) {
	const token = util.session(),
		done = () => {
			util.session(token);
			if (typeof url === 'string') {
				window.location = url;
			} else {
				url === false ||
					window.location.reload(true);
			}
		};
	// NOTE clear cookies.
	document.cookie.split(';').forEach(
		(pair) => {
			document.cookie = pair.split('=')[0] + "=; expires=" + Date.now() + "; domain=" + document.domain + "; path=/";
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
			[].forEach.call(
				event.target.result,
				(name) => {
					chain = chain.then(() => thenable((resolve, reject) => {
						request = indexedDB.deleteDatabase(name);
						request.onsuccess = resolve;
						request.onerror = (event) => log.error(event);
						request.onblocked = (event) => log.error(event);
					}));
				}
			);
		};
		request.onfailure = (event) => log.error(event);
	}
	chain.then(done, done);
	// TODO other.
});

// NOTE page.

tool('page.font', function font(family, selector) {
	// TODO window.getComputedStyle(selector).fontFamily, document.fonts.keys()
	throw reason('not implemented yet, sorry');
});

tool('page.loaded', function loaded(src) {
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
			list = [].concat(
				[].slice.call(document.getElementsByTagName('img'), 0),
				[].slice.call(document.getElementsByTagName('link'), 0)
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

tool('page.text', function text(what, selector, reachable) {
	what = what instanceof RegExp ?
		what :
		new RegExp(escape(what, true));
	reachable = reachable !== false &&
		selector !== false;

	let found = dom.find(what, selector);
	if (!found) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'not found'
		);
	}
	found = found.parentNode;
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

tool('page.title', function title(what) {
	what = what instanceof RegExp ?
		what :
		new RegExp(escape(what, true));

	if (!what.test(document.title)) {
		throw reason('title', document.title, 'is not', what.source);
	}
});

// NOTE input.

tool('input.click', function click(what, selector, reachable) {
	what = what instanceof RegExp ?
		what :
		new RegExp('^' + escape(what, true) + '$');
	reachable = reachable !== false &&
		selector !== false;

	let found = dom.find(what);
	if (!found) {
		throw reason(
			selector ? 'node ' + selector + ' with text' : 'text', what, 'not found'
		);
	}
	found = found.parentNode;
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

tool('input.paste', function paste(text) {
	const target = document.activeElement;
	if (typeof target.value === 'undefined') {
		throw reason('cannot type into active node', format(target));
	}

	const value = target.value,
		start = target.selectionStart || value.length,
		end = target.selectionEnd || value.length;
	target.value = value.substr(0, start) +
		text +
		value.substr(end, value.length);

	dom.trigger(target, 'ClipboardEvent', 'paste', true, true);
	typeof window.oninput === 'undefined' ?
		dom.trigger(target, 'Event', 'change', true, false) :
		dom.trigger(target, 'Event', 'input', true, false);
});

tool('input.type', function type(text) {
	const target = document.activeElement;
	if (typeof target.value === 'undefined') {
		throw reason('cannot type into active node', format(target));
	}

	return thenable((resolve) => {
		let chain = thenable();
		[].forEach.call(text, (char) => {
			chain = chain
				.then(
					() => {
						const value = target.value,
							start = target.selectionStart || value.length,
							end = target.selectionEnd || value.length;
						target.value = value.substr(0, start) +
							char +
							value.substr(end, value.length);

						typeof window.oninput === 'undefined' ?
							dom.trigger(target, 'Event', 'change', true, false) :
							dom.trigger(target, 'Event', 'input', true, false);
					}
				)
				.then(
					delay(random(1, 100))
				);
		});

		resolve(chain);
	});
});
