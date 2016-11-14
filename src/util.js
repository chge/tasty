'use strict';

// NOTE user must inject format.console;

import Promise from 'es6-promise';

/**
 * @memberof tasty
 * @function delay
 * @param {Number} ms
 * @param {*} [result]
 * @example
 * .then(() => tasty.delay(42))
 * @example
 * .then((result) => tasty.delay(42, result)); // same as .then((result) => tasty.delay(42).then(() => result));
 */
export function delay(ms, result) {
	return thenable(
		(resolve) => setTimeout(
			() => resolve(result),
			ms | 0
		)
	);
}

export function deserialize(value) {
	if (isArray(value)) {
		return map(
			value,
			(arg) => deserialize(arg)
		);
	}
	if (!value || !value.t) {
		return value;
	}

	switch (value.t) {
		case 're':
			return new RegExp(value.v[0], value.v[1] || '');
		default:
			return value.v;
	}
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
		value && value.nodeType ?
			value.nodeType === 3 ?
				'#text' :
				value.outerHTML ?
					value.outerHTML.replace(/>[\s\S]*$/m, ' />').replace(/\n/g, '') :
					'<' + value.nodeName + ' ... />' :
			value;
}

export function flaws(object) {
	const array = [];
	for (let key in object) {
		object.hasOwnProperty(key) &&
			object[key] &&
				array.push(key);
	}

	return array.toString();
}

// NOTE user must inject include.url;
export function include(src) {
	return thenable((resolve, reject) => {
		// LICENSE MIT jQuery Core 1.12.4
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
				resolve();
			}
		};
		script.onerror = reject;
		head.insertBefore(script, head.firstChild);
	});
}

export function parseJson(raw) {
	try {
		return JSON.parse(raw.toString());
	} catch (thrown) {
		return thrown;
	}
}

export function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function reason(...args) {
	reason.console.warn('tasty', ...args);

	return new Error(
		map(args, format)
			.join(' ')
	);
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

/**
 * @memberof tasty
 * @function thenable
 * @param {*|Error|Function} value
 * @return {Promise}
 * @example
 * tasty.thenable(42); // same as Promise.resolve(42);
 * @example
 * tasty.thenable(new Error()); // same as Promise.reject(new Error());
 * @example
 * tasty.thenable((resolve, reject) => {}); // same as new Promise((resolve, reject) => {});
 */
export function thenable(value) {
	return value instanceof Promise ?
		value :
		typeof value === 'function' ?
			new Promise(value) :
			Promise.resolve(value);
}

// NOTE polyfills.

/**
 * @function filter
 * @memberof tasty
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter|MDN}
 */
export function filter(array, callback, scope) {
	if (Array.prototype.filter) {
		return Array.prototype.filter.call(array, callback, scope);
	}

	if (array === void 0 || array === null) {
		throw new TypeError('array is null or not defined');
	}
	var t = Object(array);
	var len = t.length >>> 0;
	if (typeof callback !== 'function') {
		throw new TypeError(callback + ' is not a function');
	}
	var res = [];
	for (var i = 0; i < len; i++) {
		if (i in t) {
			var val = t[i];

			if (callback.call(scope, val, i, t)) {
				res.push(val);
			}
		}
	}

	return res;
}

/**
 * @function find
 * @memberof tasty
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find|MDN}
 */
export function find(array, predicate, scope) {
	if (Array.prototype.find) {
		return Array.prototype.find.call(array, predicate, scope);
	}

	if (array === void 0 || array == null) {
		throw new TypeError('array is null or not defined');
	}
	if (typeof predicate !== 'function') {
		throw new TypeError(predicate + ' is not a function');
	}
	var list = Object(array);
	var length = list.length >>> 0;
	var value;
	for (var i = 0; i < length; i++) {
		value = list[i];
		if (predicate.call(scope, value, i, list)) {
			return value;
		}
	}

	return undefined;
}

/**
 * @function forEach
 * @memberof tasty
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach|MDN}
 */
export function forEach(array, callback, scope) {
	if (Array.prototype.forEach) {
		return Array.prototype.forEach.call(array, callback, scope);
	}

	if (array === void 0 || array == null) {
		throw new TypeError('array is null or not defined');
	}
	var T, k;
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

/**
 * @function isArray
 * @memberof tasty
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray|MDN}
 */
export function isArray(value) {
	if (Array.isArray) {
		return Array.isArray(value);
	}

	return Object.prototype.toString.call(value) === '[object Array]';
}

/**
 * @function map
 * @memberof tasty
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map|MDN}
 */
export function map(array, callback, scope) {
	if (Array.prototype.map) {
		return Array.prototype.map.call(array, callback, scope);
	}

	if (array === void 0 || array == null) {
		throw new TypeError('array is null or not defined');
	}
	var T, A, k;
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

/**
 * @function reduce
 * @memberof tasty
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce|MDN}
 */
export function reduce(array, callback, memo) {
	if (Array.prototype.reduce) {
		return Array.prototype.reduce.call(array, callback, memo);
	}

	if (array === void 0 || array == null) {
		throw new TypeError('array is null or not defined');
	}
	if (typeof callback !== 'function') {
		throw new TypeError(callback + ' is not a function');
	}
	var t = Object(array), len = t.length >>> 0, k = 0, value;
	if (arguments.length >= 3) {
		value = arguments[2];
	} else {
		while (k < len && ! (k in t)) {
			k++;
		}
		if (k >= len) {
			throw new TypeError('reduce of empty array with no initial value');
		}
		value = t[k++];
	}
	for (; k < len; k++) {
		if (k in t) {
			value = callback(value, t[k], k, t);
		}
	}

	return value;
}
