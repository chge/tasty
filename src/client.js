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

	tasty.connect = connect;
	tasty.tool = tool;
	tasty.token = function token(value) {
		if (arguments.length) {
			if (value) {
				sessionStorage.__tasty = value;
			} else {
				delete sessionStorage.__tasty;
			}
		}

		return sessionStorage.__tasty;
	};

	[].forEach.call(document.getElementsByTagName('script'), function(script) {
		if (script.src.indexOf('tasty.js') !== -1) {
			var server = script.getAttribute('data-server') ||
				script.src.split('tasty.js')[0];
			server &&
				tasty({server: server}).connect();
		}
	});

	function tasty(config) {
		config = typeof config === 'string' ?
			{server: config} :
			config || {};
		tasty.config = config;

		tasty.log = config.hasOwnProperty('log') && config.log !== true ?
			config.log :
			window.console;

		tasty.token = config.token ||
			tasty.token;

		return tasty;
	}

	function connect() {
		var server = tasty.config.server;

		tasty.token() ||
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
		log('tasty', tasty.token() ? 'reconnected' : 'connected');

		tasty.socket = socket;

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
								log.error(name, result);
								callback([undefined, formatError(result)]);
							} else {
								callback([result]);
							}
						},
						function(error) {
							log.error(name, error);
							callback([undefined, formatError(error)]);
						}
					);
				} else {
					if (result instanceof Error) {
						log.error(name, result);
						callback([undefined, formatError(result)]);
					} else {
						callback([result]);
					}
				}
			} catch (thrown) {
				log.error(name, thrown);
				callback([undefined, formatError(thrown)]);
			}
		});

		// TODO use cookies to store token?
		socket.on('ready', function(token, callback) {
			if (tasty.token()) {
				log.debug('tasty', 'ready', tasty.token());
			} else {
				log.info('tasty', 'ready', token);
				tasty.token(token);
			}
			callback([tasty.token()]);
		});

		socket.on('finish', function(data, callback) {
			log.info('tasty', 'finish');
			tasty.token(null);
			callback([]);
			socket.close();
		});
	}

	function sync(callback) {
		return {
			then: function(resolved) {
				resolved();
				tasty.socket.emit('sync', tasty.token(), callback);
			}
		};
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
		tasty.log &&
			tasty.log.log.apply(tasty.log, arguments);
	}
	log.debug = function debug() {
		tasty.log &&
			tasty.log.debug.apply(tasty.log, arguments);
	};
	log.info = function info() {
		tasty.log &&
			tasty.log.info.apply(tasty.log, arguments);
	};
	log.error = function error() {
		tasty.log &&
			tasty.log.error.apply(tasty.log, arguments);
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
		setTimeout(fn, 1);
	}

	function random(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function tool(name, handle) {
		tasty.tool[name] = handle;
	}

	tool('dom.font', function font(family, selector) {
		// TODO window.getComputedStyle(selector).fontFamily, document.fonts.keys()
		throw new Error('not implemented yet, sorry');
	});
	tool('dom.loaded', function loaded(src) {
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
				return formatNode(item);
			}
		}

		throw new Error('resource ' + src + ' not found');
	});
	tool('dom.text', function text(what, selector) {
		what = what instanceof RegExp ?
			what :
			new RegExp(escape(what, true));

		var walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, null, false),
			node, found;
		while (node = walker.nextNode()) {
			if (what.test(node.parentElement.innerText)) {
				found = node;
				break;
			}
		}
		if (!found) {
			throw new Error(tpl(
				selector ? ['node ', selector, ' with '] : null,
				'text ', what, ' not found'
			));
		}
	});
	tool('dom.title', function title(what) {
		what = what instanceof RegExp ?
			what :
			new RegExp(escape(what, true));

		if (!what.test(document.title)) {
			throw new Error(tpl(
				'title ', document.title, ' is not ', what
			));
		}
	});

	tool('client.location', function location(what) {
		if (!arguments.length) {
			return window.location.pathname;
		}
		what = what instanceof RegExp ?
			what :
			new RegExp('^' + escape(what, true) + '$');

		if (what.test(window.location.href)) {
			throw new Error(tpl(
				'location ', window.location.pathname, ' is not ', path
			));
		}
	});
	tool('client.navigate', function navigate(url) {
		return sync(function() {
			window.location = url;
		});
	});
	tool('client.reload', function reload() {
		return sync(function() {
			window.location.reload(true);
		});
	});

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
			throw new Error(tpl(
				'node ', selector ? [selector, ' '] : null,
				'with text ', what, ' not found'
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
					' with text ', what, ' is covered by node ',
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
	tool('input.press', function press() {
		throw new Error('not implemented yet, sorry');
	});
	tool('input.type', function type() {
		throw new Error('not implemented yet, sorry');
	});

	return tasty;
});
