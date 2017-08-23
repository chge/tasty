import thing from '../thing';
import * as dom from '../dom';
import { assign, escape, find as arrayFind, reason } from '../utils';

/**
 * Searches things on client.
 * @function find
 * @memberof Tools#all
 * @param {Thing|string|RegExp} what {@link /tasty/?api=test#Thing|Thing} to search.
 * @param {Thing|string} [where=window] {@link /tasty/?api=test#Thing|Thing} to search in. String means {@link /tasty/?api=test#nodes|`nodes`}.
 * @param {Object|boolean} [options] Search options.
 * @param {boolean} [options.strict] Strict flag: `true` for exact match, `false` for loose search and `undefined` for default behavior.
 * @param {boolean} [options.reachable] Make sure found node is reachable: isn't covered with other nodes.
 * @param {Object|boolean} [defaults] Defaults for `options`.
 */
export default function find(what, where, options, defaults) {
	what = typeof what === 'string' ?
		thing('text', what) :
		thing(what);
	where = typeof where === 'string' ?
		thing('nodes', where) :
		thing(where);
	defaults = typeof defaults === 'boolean' ?
		{reachable: defaults} :
		defaults || {};
	options = typeof options === 'boolean' ?
		{strict: options} :
		assign(options || {}, defaults);

	const value = what.value,
		method = find[what.type],
		regexp = value instanceof RegExp ?
			value :
			new RegExp(escape(value, true));
	if (method) {
		return method(what, where, options, regexp);
	} else {
		throw reason(what.type, 'is not supported');
	}
}

find.any = find.empty = find.image = find.node = find.nodes = find.text = common;
find.css = css;
find.doctype = doctype;
find.favicon = favicon;
find.font = font;
find.location = location;
find.manifest = manifest;
find.script = script;
find.title = title;

function common(what, where, options) {
	const found = dom.find(what, where, options),
		first = found[0];
	if (!first) {
		return null;
	}
	// TODO better?

	// NOTE any found could be text Node, while reached is always an Element (or null).
	const parent = first.parentNode,
		reached = dom.reach(first);
	if (reached === first || reached === parent || reached === document ||
			reached === document.documentElement || reached === document.body
	) {
		return first;
	}

	if (options.reachable) {
		if (reached && found.length > 1) {
			const other = arrayFind(found, (node) => {
				const common = dom.commonAncestor(reached, node);

				return common && common !== document &&
					common !== document.documentElement && common !== document.body;
			});
			if (other) {
				return other;
			}
		}

		throw reached ?
			reason('found', first, 'is covered by', reached) :
			reason('found', first, 'is not reachable');
	}

	return reached;
}

function css(what, where, options, regexp) {
	return findInList('href', regexp, document.getElementsByTagName('link'));
}

function doctype(what, where, options, regexp) {
	const doctype = formatDoctype(document.doctype);
	if (!doctype) {
		throw reason('document has no doctype');
	}
	if (!regexp.test(doctype)) {
		throw reason('doctype', doctype, 'is not', regexp);
	}

	return doctype;
}

function favicon(what) {
	throw reason(what.type, 'is not implemented yet, sorry');
}

function font(what, where, options) {
	return where ?
		dom.find(what, where, options)[0] :
		document.fonts.check(what.value);
}

function location(what, where, options, regexp) {
	// NOTE slashes are escaped.
	const source = regexp.source,
		location = source.indexOf('\\/') === 0 ?
			window.location.pathname :
			window.location.href;
	if (!regexp.test(location)) {
		throw reason('location', location, 'is not', what.value instanceof RegExp ? regexp : source);
	}

	return location;
}

function manifest(what, where, options, regexp) {
	let manifest = document.documentElement.getAttribute('manifest');
	if (manifest) {
		if (!regexp.test(manifest)) {
			throw reason('app cache manifest', manifest, 'is not', regexp);
		}
		return manifest;
	}
	manifest = arrayFind(
		dom.nodeListToArray(
			document.getElementsByTagName('link')
		),
		(link) => link.rel === 'manifest'
	);
	if (manifest) {
		if (!regexp.test(manifest.href)) {
			throw reason('web app manifest', manifest.href, 'is not', regexp);
		}
		return manifest;
	}

	throw reason('document has no manifest');
}

function script(what, where, options, regexp) {
	return findInList('src', regexp, document.getElementsByTagName('script'));
}

function title(what, where, options, regexp) {
	if (!regexp.test(document.title)) {
		throw reason('title', document.title, 'is not', regexp);
	}

	return document.title;
}

function findInList(key, regexp, list) {
	return arrayFind(
		list,
		(item) => regexp.test(item[key])
	);
}

/**
 * @license CC BY-SA 3.0 http://stackoverflow.com/a/27838954
 * @license CC BY-SA 3.0 http://stackoverflow.com/a/10162353
 */
function formatDoctype(doctype) {
	if (!doctype) {
		return null;
	}

	// NOTE some browsers could fail to serialize doctype.
	const serialized = 'XMLSerializer' in window ?
		new XMLSerializer().serializeToString(doctype) :
		null;

	return serialized ||
		[
			'<!DOCTYPE ',
				doctype.name,
				doctype.publicId ? ' PUBLIC "' + doctype.publicId + '"' : '',
				!doctype.publicId && doctype.systemId ? ' SYSTEM' : '',
				doctype.systemId ? ' "' + doctype.systemId + '"' : '',
			'>'
		].join('');
}
