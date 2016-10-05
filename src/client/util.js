'use strict';

// NOTE user must inject include.server;

module.exports = {
	delay: delay,
	escape: escape,
	format: format,
	include: include,
	random: random,
	reason: reason,
	session: session,
	thenable: thenable
};

const Promise = global.Promise ||
	require('./promise').Promise;

function include(src, callback) {
	const script = document.createElement('script');
	script.src = include.server + src;
	script.onload = callback;
	document.getElementsByTagName('head')[0].appendChild(script);
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
		value instanceof Node ?
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
