import Promise from 'es6-promise';

export { Promise };

/**
 * Utility functions.
 * @member {Object} Tasty#utils
 */

/**
 * Returns `Promise` that will resolve/reject after delay.
 * @function delay
 * @memberof Tasty#utils
 * @param {number} ms Pause in milliseconds.
 * @param {*} [value] Value/reason to resolve/reject `Promise` with.
 * @example
 * .then(() => tasty.delay(42))
 * @example
 * .then((result) => tasty.delay(42, result)); // same as .then((result) => tasty.delay(42).then(() => result));
 */
export function delay(ms, value) {
	return thenable(
		(resolve) => setTimeout(
			() => resolve(value),
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

	return typeof value.v === 'undefined' ?
		{
			type: value.t
		} :
		{
			type: value.t,
			value: isArray(value.v) ?
				value.v[1] ?
					new RegExp(value.v[0], value.v[1]) :
					new RegExp(value.v[0]) :
				value.v
		}
}

export function escape(source, regexp) {
	source = (source + '')
		.replace(/\./g, '\\.')
		.replace(/,/g, '\\,')
		.replace(/\*/g, '\\*')
		.replace(/\+/g, '\\+')
		.replace(/\?/g, '\\?')
		.replace(/\(/g, '\\(')
		.replace(/\)/g, '\\)')
		.replace(/\[/g, '\\[')
		.replace(/\]/g, '\\]')
		.replace(/\$/g, '\\$')
		.replace(/\^/g, '\\^');

	return regexp ?
		source :
		desequence(
			source.replace(/"/g, '\\"')
				.replace(/\//g, '\\/')
		);
}

export function desequence(source) {
	return source = (source + '')
		.replace(/[\b]/g, '\\b')
		.replace(/\f/g, '\\f')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
		.replace(/\v/g, '\\v')
		.replace(/\0/g, '\\0');
}

export function format(value) {
	if (typeof value === 'undefined' || value === null) {
		return value + '';
	}
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack ?
				value.stack :
				undefined
		};
	}
	if (value.nodeType) {
		if (value.nodeType === 3) {
			let text = value.textContent;
			text = text.length > 30 ?
				text.substr(0, 27) + '...' :
				text;

			return text.length ?
				'#text ' + desequence(text) :
				'empty #text';
		}

		return value.outerHTML ?
			desequence(
				value.outerHTML
					.replace(/>[\s\S]*$/m, ' />')
					.replace(/\n/g, '')
			) :
			'<' + value.nodeName + ' ... />';
	}

	return value.type ?
		value.type === 'text' && isArray(value.value) ?
			'{' + value.type + ' ' +
				new RegExp(value.value[0], value.value[1]) + '}' :
			value.hasOwnProperty('value') ?
				'{' + value.type + ' ' + value.value + '}' :
				'{' + value.type + '}' :
		value + '';
}

export function include(src) {
	return thenable((resolve, reject) => {
		// LICENSE MIT jQuery Core 1.12.4
		const head = document.head ||
				document.getElementsByTagName('head')[0] ||
					document.documentElement;
		let script = document.createElement('script');
		script.async = true;
		script.src = src;
		script.onload = script.onreadystatechange = () => {
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

export function now() {
	return Date.now ?
		Date.now() :
		+new Date();
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
	return new Error(
		map(args, format)
			.join(' ')
	);
}

export function thenable(value) {
	return value instanceof Promise ?
		value :
		typeof value === 'function' ?
			new Promise(value) :
			Promise.resolve(value);
}

// NOTE polyfills.

/**
 * Implementation of `Object.assign`.
 * @function assign
 * @memberof Tasty#utils
 * @param {Object} target Target object.
 * @param {...Object} sources Source object(s).
 * @returns {Object}
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign|MDN}
 */
export function assign(target) {
	if (target == null) {
		throw new TypeError('Cannot convert undefined or null to object');
	}
	var to = Object(target);
	for (var index = 1; index < arguments.length; index++) {
		var nextSource = arguments[index];

		if (nextSource != null) {
			for (var nextKey in nextSource) {
				if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
					to[nextKey] = nextSource[nextKey];
				}
			}
		}
	}

	return to;
}

/**
 * Implementation of `Array.prototype.filter`.
 * @function filter
 * @memberof Tasty#utils
 * @param {Array} array Array.
 * @returns {Array}
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
 * Implementation of `Array.prototype.find`.
 * @function find
 * @memberof Tasty#utils
 * @param {Array} array Array.
 * @returns {*}
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
 * Implementation of `Array.prototype.forEach`.
 * @function forEach
 * @memberof Tasty#utils
 * @param {Array} array Array.
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
 * Implementation of `Array.isArray`.
 * @function isArray
 * @memberof Tasty#utils
 * @param {*} value Value to check.
 * @returns {boolean}
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray|MDN}
 */
export function isArray(value) {
	if (Array.isArray) {
		return Array.isArray(value);
	}

	return Object.prototype.toString.call(value) === '[object Array]';
}

/**
 * Implementation of `Object.keys`.
 * @function keys
 * @memberof Tasty#utils
 * @param {Object} value Value to check.
 * @returns {boolean}
 * @license CC-BY-SA v2.5 {@link https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Object/keys|MDN}
 */
const hasOwnProperty = Object.prototype.hasOwnProperty,
	hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
	dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	],
	dontEnumsLength = dontEnums.length;

export function keys(obj) {
	if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
		throw new TypeError('Object.keys called on non-object');
	}
	var result = [], prop, i;
	for (prop in obj) {
		if (hasOwnProperty.call(obj, prop)) {
			result.push(prop);
		}
	}
	if (hasDontEnumBug) {
		for (i = 0; i < dontEnumsLength; i++) {
			if (hasOwnProperty.call(obj, dontEnums[i])) {
				result.push(dontEnums[i]);
			}
		}
	}

	return result;
}

/**
 * Implementation of `Array.prototype.map`.
 * @function map
 * @memberof Tasty#utils
 * @param {Array} array Array.
 * @returns {Array}
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
 * Implementation of `Array.prototype.reduce`.
 * @function reduce
 * @memberof Tasty#utils
 * @param {Array} array Array.
 * @returns {*}
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

/**
 * Trims given `string`.
 * @function trim
 * @memberof Tasty#utils
 * @param {string} string String to trim.
 * @returns {string}
 * @license Copyright Steven Levithan {@link http://blog.stevenlevithan.com/archives/faster-trim-javascript}
 */
export function trim(string) {
	string = string.replace(/^\s\s*/, '');
	let space = /\s/,
		index = string.length;

	while (space.test(
		string.charAt(--index)
	));

	return string.slice(0, index + 1);
}
