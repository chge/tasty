export default Flaws;

/**
 * Client flaws.
 * @name Tasty#flaws
 * @type {Object}
 * @readonly
 * @prop {boolean} doctype Client doesn't properly support DOM DocumentType. History-related tools won't work.
 * @prop {boolean} font Client doesn't support Font Loading API. Font-related tools won't work.
 * @prop {boolean} history Client doesn't fully support HTML5 History API. History-related tools won't work.
 * @prop {boolean} navigation Client requires emulation of anchor navigation. Tasty will emulate navigation along with click.
 * @prop {boolean} placeholder Client doesn't support placeholders. Search will skip input placeholders.
 * @prop {boolean} pseudo Client can't search through pseudo-elements. Search will skip such elements, e.g. `:before` and `:after`.
 * @prop {boolean} selector Client doesn't support Selectors API. Search with selectors won't work.
 * @prop {boolean} shadow Client doesn't support Shadow DOM.
 * @prop {boolean} validation Client doesn't support HTML5 Forms.
 * @prop {boolean} websocket Client has unsupported WebSocket implementation. Tasty will use XHR polling, which is slower.
 */

class Flaws {
	/**
	 * @private
	 */
	constructor() {
		return {
			doctype: !('doctype' in document) ||
				!document.doctype &&
					document.documentElement.previousSibling &&
						document.documentElement.previousSibling.nodeType === 8,
			font: !('fonts' in document),
			history: !('pushState' in history) ||
				// WORKAROUND: PhantomJS as of 2.1.1 incorrectly reports history length.
				navigator.userAgent.indexOf('PhantomJS') !== -1,
			navigation: !('click' in document.createElement('a')),
			placeholder: !('placeholder' in document.createElement('input')),
			pseudo: 'attachEvent' in window, // TODO better.
			selector: !('querySelector' in document),
			shadow: !('ShadowRoot' in window),
			validation: !('validity' in document.createElement('input')),
			websocket: !('WebSocket' in window) ||
				navigator.appVersion.indexOf('MSIE 10') !== -1 // TODO better.
		};
	}

	static format(flaws) {
		const array = [];
		for (let key in flaws) {
			flaws.hasOwnProperty(key) &&
				flaws[key] &&
					array.push(key);
		}

		return array.toString();
	}
}
