'use strict';

import Promise from 'es6-promise';

// NOTE user must inject include.url;
// LICENSE MIT jQuery Core 1.12.4
export function include(src, callback) {
	const head = document.head ||
			document.getElementsByTagName('head')[0] ||
				document.documentElement;
	let script = document.createElement('script');
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

export function thenable(value) {
	return value instanceof Promise ?
		value :
		typeof value === 'function' ?
			new Promise(value) :
			Promise.resolve(value);
}

// TODO store session in cookie?
export function session(value) {
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

export function reason() {
	return new Error([].join.call(arguments, ' '));
}

export function format(value) {
	return value instanceof Error ?
		{
			name: value.name,
			message: value.message,
			stack: value.stack ?
				value.stack
					.replace(/\s*at Socket[\s\S]*/m, '') :
				undefined
		} :
		window.Node && value instanceof window.Node ||
			window.Element && value instanceof window.Element ?
				value.outerHTML ?
					value.outerHTML.replace(/>[\s\S]*$/m, '>').replace(/\n/g, '') :
					'<' + value.nodeName.toLowerCase() + ' ...>' :
				value;
}

export function escape(source, regexp) {
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

export function delay(ms, result) {
	return thenable(
		(resolve) => setTimeout(
			() => resolve(result),
			ms | 0
		)
	);
}

export function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// NOTE polyfills.

// LICENSE CC-BY-SA v2.5 https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
export function forEach(array, callback, scope) {
	if (Array.prototype.forEach) {
		return Array.prototype.forEach.call(array, callback, scope);
	}

	var T, k;
	if (array == null) {
		throw new TypeError('array is null or not defined');
	}
	var O = Object(array);
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
}

// LICENSE CC-BY-SA v2.5 https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
export function isArray(value) {
	var fn = Array.isArray || function polyfill(value) {
		return Object.prototype.toString.call(value) === '[object Array]';
	};

	return fn(value);
}

// LICENSE CC-BY-SA v2.5 https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/map
export function map(array, callback, scope) {
	if (Array.prototype.map) {
		return Array.prototype.map.call(array, callback, scope);
	}

	var T, A, k;
	if (array == null) {
		throw new TypeError('array is null or not defined');
	}
	var O = Object(array);
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
}
