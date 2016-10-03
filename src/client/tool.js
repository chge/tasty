'use strict';

module.exports = tool;

tool.hook = hook;

// NOTE user must inject tool.sync(callback);

const log = require('./log'),
	util = require('./util');

const escape = util.escape,
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

// NOTE page.

tool('page.font', function font(family, selector) {
	// TODO window.getComputedStyle(selector).fontFamily, document.fonts.keys()
	throw reason('not implemented yet, sorry');
});

tool('page.loaded', function loaded(src) {
	if (!src) {
		return document.readyState === 'complete';
	}

	var type = src.toLowerCase().split('.'),
		origin = location.origin ||
			location.protocol + '//' + location.host,
		url = origin + src,
		list, item, found, i;
	switch (type ? type[type.length - 1] : null) {
		case 'appcache':
			list = [];
			if (document.documentElement.getAttribute('manifest') === src) {
				return util.format(document.documentElement);
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
			return util.format(item);
		}
	}

	throw reason('resource', src, 'not found');
});

tool('page.text', function text(what, selector) {
	what = what instanceof RegExp ?
		what :
		new RegExp(escape(what, true));

	// NOTE Node.textContent doesn't respect CSS text-transform, while HTMLElement.innerText does.

	const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
			null,
			false
		),
		precursor = new RegExp(what.source, 'i'),
		node, found;
	while (node = walker.nextNode()) {
		if (precursor.test(node.textContent) && what.test(node.parentElement.innerText)) {
			found = node;
			break;
		}
	}
	if (!found) {
		throw reason(
			selector ? 'node ' + selector + ' with' : '',
			'text', what, 'not found'
		);
	}
});

tool('page.title', function title(what) {
	what = what instanceof RegExp ?
		what :
		new RegExp(escape(what, true));

	if (!what.test(document.title)) {
		throw reason('title', document.title, 'is not', what);
	}
});

// NOTE client.

tool('client.location', function location(what) {
	if (!arguments.length) {
		return window.location.pathname;
	}
	// TODO smart matching.
	what = what instanceof RegExp ?
		what :
		new RegExp(escape(what, true));

	if (!what.test(
			what.source.indexOf('/') === 0 ?
				window.location.pathname :
				window.location.href
	)) {
		throw reason('location', window.location.pathname, 'is not', what);
	}
});

tool('client.navigate', function navigate(url) {
	// TODO allow to skip navigation if url already matches.
	return tool.sync(function() {
		window.location = url;
	});
});

tool('client.reload', function reload() {
	return tool.sync(function() {
		window.location.reload(true);
	});
});

// NOTE input.

tool('input.click', function click(what, selector) {
	what = what instanceof RegExp ?
		what :
		new RegExp('^' + escape(what, true) + '$');

	var list = document.querySelectorAll(selector || '*'),
		found;
	for (var i = 0; i < list.length; i++) {
		var node = list[i];
		if (what.test(node.innerText)) {
			found = node;
			break;
		}
	}
	if (!found) {
		throw reason(
			'node', selector ? selector : '',
			'with text', what, 'not found'
		);
	}
	if (found.disabled) {
		throw reason('node', util.format(found), 'is disabled');
	}

	var rect = found.getBoundingClientRect(),
		x = util.random(rect.left, rect.left + rect.width),
		y = util.random(rect.top, rect.top + rect.height),
		actual = document.elementFromPoint(x, y),
		parent = actual;
	while (parent !== found) {
		if (!(parent = parent.parentElement)) {
			throw reason(
				'node', util.format(found),
				'with text', what, 'is covered by node',
				util.format(actual)
			);
		}
	}

	actual.dispatchEvent(
		new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			screenX: x,
			screenY: y
		})
	);
});

tool('input.press', function press() {
	throw reason('not implemented yet, sorry');
});

tool('input.type', function type(text) {
	var actual = document.activeElement;

	return thenable(function(resolve) {
		[].forEach.call(text, function(char) {
			actual.value = actual.value + char;
			if (document.createEvent) {
				var event = document.createEvent('HTMLEvents');
				event.initEvent('change', false, true);
				actual.dispatchEvent(event);
			} else {
				actual.fireEvent('onchange');
			}
		});

		resolve();
	});
});
