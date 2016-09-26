/* Tasty client */
(function(name, root, factory) {
	if (typeof module !== 'undefined' && module['exports']) {
		module['exports'] = factory();
	} else if (typeof define === 'function' && define['amd']) {
		define(name, factory);
	} else {
		root[name] = factory();
	}
})('tasty', this, function() {
	'use strict';

	tasty.tool = tool;
	tasty.key = function key(value) {
		if (arguments.length) {
			if (value) {
				sessionStorage.tasty = value;
			} else {
				delete sessionStorage.tasty;
			}
		}

		return sessionStorage.tasty;
	};

	[].forEach.call(document.getElementsByTagName('script'), function(script) {
		if (script.src.indexOf('tasty.js') !== -1) {
			var server = script.getAttribute('data-server') ||
				script.src.split('tasty.js')[0];
			server &&
				init(server);
		}
	});

	function tasty(config) {
		config = typeof config === 'string' ?
			{server: config} :
			config || {};

		if (config.log) {
			tasty.log = config.log;
		}
		config.server &&
			init(config.server);
	}

	function init(server) {
		tasty.key() ||
			log('tasty', 'server', server);

		var script = document.createElement('script');
		script.src = server + 'socket.io.js';
		script.onload = function() {
			var io = typeof define === 'function' && define['amd'] ?
				require('socket.io') :
				window.io;
			ready(io(server, {multiplex: false}));
		};
		document.getElementsByTagName('head')[0].appendChild(script);
	}

	function ready(socket) {
		log('tasty', tasty.key() ? 'reconnected' : 'connected');

		socket.on('tool', function(data, callback) {
			// NOTE code is inlined to make stack trace clean.
			try {
				var name = data[0],
					args = data.slice(1);
				if (!tasty.tool[name]) {
					throw new Error('no such tool ' + name);
				}

				log.debug('tasty', 'tool', name, args);

				var result = tasty.tool[name].apply(tasty, args);
				if (result && typeof result.then === 'function') {
					result.then(
						function(result) {
							if (result instanceof Error) {
								log.error(result);
								callback([undefined, formatError(result)]);
							} else {
								callback([result]);
							}
						},
						function(error) {
							log.error(error);
							callback([undefined, formatError(error)]);
						}
					);
				} else {
					if (result instanceof Error) {
						log.error(result);
						callback([undefined, formatError(result)]);
					} else {
						callback([result]);
					}
				}
			} catch (thrown) {
				log.error(thrown);
				callback([undefined, formatError(thrown)]);
			}
		});

		// TODO use cookies to store key?
		socket.on('ready', function(key, callback) {
			if (tasty.key()) {
				log.debug('tasty', 'ready', tasty.key());
			} else {
				log.info('tasty', 'ready', key);
				tasty.key(key);
			}
			callback([tasty.key()]);
		});

		socket.on('finish', function(data, callback) {
			log.info('tasty', 'finish');
			tasty.key(null);
			callback([]);
			socket.close();
		});
	}

	function formatError(error) {
		return error instanceof Error ?
			{
				name: error.name,
				message: error.message,
				stack: error.stack ?
					error.stack
						.replace(/\s*at Socket[\s\S]*/m, '') :
					undefined
			} :
			error;
	}

	function formatNode(node) {
		return node.outerHTML.replace(/>[\s\S]*$/m, '>');
	}

	function log() {
		(tasty.console || console).log.apply(null, arguments);
	}
	log.debug = function debug() {
		(tasty.console || console).debug.apply(null, arguments);
	};
	log.info = function info() {
		(tasty.console || console).info.apply(null, arguments);
	};
	log.error = function error() {
		(tasty.console || console).error.apply(null, arguments);
	};

	function tpl() {
		var result = '';
		[].forEach.call(arguments, function(chunk) {
			result += Array.isArray(chunk) ?
				chunk.length ?
					tpl.apply(null, chunk) :
					'' :
				typeof chunk === 'undefined' || chunk === null ?
					'' :
					chunk.toString ?
						chunk.toString() :
						chunk;
		});

		return result;
	}

	function escape(source, regexp) {
		source = source.replace(/\./g, '\\.')
			.replace(/\,/g, '\\,')
			.replace(/\*/g, '\\*')
			.replace(/\+/g, '\\+')
			.replace(/\?/g, '\\?')
			.replace(/\(/g, '\\(')
			.replace(/\)/g, '\\)')
			.replace(/\[/g, '\\[')
			.replace(/\]/g, '\\]');

		return regexp ?
			source :
			source.replace(/\$/g, '\\$')
				.replace(/\^/g, '\\^')
				.replace(/\"/g, '\\"')
				.replace(/\//g, '\\/')
				.replace(/\r/g, '\\r')
				.replace(/\n/g, '\\n')
				.replace(/\t/g, '\\t');
	}

	function nextTick(fn) {
		setTimeout(fn, 0);
	}

	function random(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function tool(name, handle) {
		tasty.tool[name] = handle;
	}

	tool('click', function click(value, selector) {
		value = value instanceof RegExp ?
			value :
			new RegExp('^' + escape(value, true) + '$');

		var list = document.querySelectorAll(selector || '*'),
			found;
		for (var i = 0; i < list.length; i++) {
			var node = list[i];
			if (value.test(node.innerText)) {
				found = node;
				break;
			}
		}
		if (!found) {
			throw new Error(tpl(
				'node ', selector ? [selector, ' '] : null,
				'with text ', value, ' not found'
			));
		}

		var rect = found.getBoundingClientRect(),
			x = random(rect.left, rect.left + rect.width),
			y = random(rect.top, rect.top + rect.height),
			actual = document.elementFromPoint(x, y),
			parent = actual;
		while (parent !== found) {
			if (!(parent = parent.parentElement)) {
				throw new Error(tpl(
					'node ', formatNode(found),
					' with text ', value, ' is covered by node ',
					formatNode(actual)
				));
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

	tool('font', function font(family, selector) {
		// TODO window.getComputedStyle(selector).fontFamily, document.fonts.keys()
		throw new Error('not implemented yet, sorry');
	});

	tool('loaded', function loaded(src) {
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
					return formatNode(document.documentElement);
				}
				break;
			case 'css':
				list = document.getElementsByTagName('link');
				break;
			case 'js':
				list = document.getElementsByTagName('script');
				break;
			// TODO more.
			default:
				list = document.getElementsByTagName('*');
		}
		for (i = 0; i < list.length; i++) {
			item = list[i];
			if (item.src === url || item.href === url) {
				// TODO try to check if loaded.
				return formatNode(item);
			}
		}

		throw new Error('resource ' + src + ' not found');
	});

	tool('location', function location(path) {
		if (!arguments.length) {
			return window.location.pathname;
		}
		if (window.location.pathname !== path) {
			throw new Error('location ' + window.location.pathname + ' is not ' + path);
		}
	});

	tool('navigate', function navigate(url) {
		nextTick(function() {
			window.location = url;
		});
	});

	tool('reload', function reload() {
		nextTick(function() {
			window.location.reload(true);
		});
	});

	tool('text', function text(value, selector) {
		value = value instanceof RegExp ?
			value :
			new RegExp(escape(value, true));

		var walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, null, false),
			node, found;
		while (node = walker.nextNode()) {
			if (value.test(node.parentElement.innerText)) {
				found = node;
				break;
			}
		}
		if (!found) {
			throw new Error(tpl(
				selector ? ['node ', selector, ' with '] : null,
				'text ', value, ' not found'
			));
		}
	});

	tool('title', function title(value) {
		if (document.title !== value) {
			throw new Error('title ' + document.title + ' is not ' + value);
		}
	});

	return tasty;
});
