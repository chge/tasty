'use strict';

// NOTE user must inject include.url;

module.exports = {
	delay: delay,
	escape: escape,
	forEach: forEach,
	format: format,
	include: include,
	isArray: isArray,
	map: map,
	random: random,
	reason: reason,
	session: session,
	thenable: thenable
};

const Promise = global.Promise ||
	require('./promise').Promise;

// NOTE jQuery Core 1.12.4
function include(src, callback) {
	const script = document.createElement('script'),
		head = document.head ||
			document.getElementsByTagName('head')[0] ||
				document.documentElement;
	script.async = true;
	script.src = include.url + src;
	script.onload = script.onreadystatechange = function() {
		if (!script.readyState || /loaded|complete/.test(script.readyState)) {
			script.onload = script.onreadystatechange = null;
			script.parentNode &&
				script.parentNode.removeChild(script);
			script = null;
			callback();
		}
	};
	head.insertBefore(script, head.firstChild);
}

function thenable(value) {
	return value instanceof Promise ?
		value :
		typeof value === 'function' ?
			new Promise(value) :
			Promise.resolve(value);
}

// TODO store session in cookie?
function session(value) {
	session.key = session.key || '__tasty';
	if (arguments.length) {
		if (value) {
			sessionStorage.setItem(session.key, value);
		} else {
			sessionStorage.removeItem(session.key);
		}
	}

	return sessionStorage.getItem(session.key);
}

function reason() {
	return new Error([].join.call(arguments, ' '));
}

function format(value) {
	return value instanceof Error ?
		{
			name: value.name,
			message: value.message,
			stack: value.stack ?
				value.stack
					.replace(/\s*at Socket[\s\S]*/m, '') :
				undefined
		} :
		value instanceof window.Node || value instanceof window.Element ?
			value.outerHTML.replace(/>[\s\S]*$/m, '>') :
			value;
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

function delay(ms) {
	return () => thenable(
		(resolve) => setTimeout(resolve, ms | 0)
	);
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// NOTE polyfills.

// https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
function forEach(array, callback, scope) {
	var fn = Array.prototype.forEach || function polyfill(callback, scope) {
		var T, k;
		if (this == null) {
			throw new TypeError('this is null or not defined');
		}
		var O = Object(this);
		var len = O.length >>> 0;
		if (typeof callback !== 'function') {
				throw new TypeError(callback + ' is not a function');
		}
		if (arguments.length > 1) {
			T = scope;
		}
		k = 0;
		while (k < len) {
			var kValue;
			if (k in O) {
				kValue = O[k];
				callback.call(T, kValue, k, O);
			}
			k++;
		}
	};

	return fn.call(array, callback, scope);
}

// https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
function isArray(value) {
	var fn = Array.isArray || function polyfill(value) {
		return Object.prototype.toString.call(value) === '[object Array]';
	};

	return fn(value);
}

// https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/map
function map(array, callback, scope) {
	var fn = Array.prototype.map || function polyfill(callback, scope) {
		var T, A, k;
		if (this == null) {
			throw new TypeError('this is null or not defined');
		}
		var O = Object(this);
		var len = O.length >>> 0;
		if (typeof callback !== 'function') {
			throw new TypeError(callback + ' is not a function');
		}
		if (arguments.length > 1) {
			T = scope;
		}
		A = new Array(len);
		k = 0;
		while (k < len) {
			var kValue, mappedValue;
			if (k in O) {
				kValue = O[k];
				mappedValue = callback.call(T, kValue, k, O);
				A[k] = mappedValue;
			}
			k++;
		}
		return A;
	};

	return fn.call(array, callback, scope);
}
