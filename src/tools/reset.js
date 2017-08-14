import { forEach, now, thenable } from '../utils';

export default function reset(url) {
	const tasty = this,
		error = tasty.logger.error;

	// NOTE clear hooks.
	tasty.hooks.set('*', null);

	// NOTE clear cookies.
	forEach(
		document.cookie.split(';'),
		(pair) => {
			document.cookie = pair.split('=')[0] + "=; expires=" + now() + "; domain=" + document.domain + "; path=/";
		}
	);

	// NOTE clear Storage.
	window.localStorage &&
		localStorage.clear();
	window.sessionStorage &&
		window.sessionStorage.clear();

	// NOTE preserve ID when unload event handler doesn't work.
	tasty.id();

	// NOTE clear indexedDB.
	let chain = thenable();
	if (window.indexedDB && indexedDB.webkitGetDatabaseNames) {
		let request = indexedDB.webkitGetDatabaseNames();
		request.onsuccess = (event) => {
			forEach(
				event.target.result,
				(name) => {
					chain = chain.then(() => thenable((resolve) => {
						request = indexedDB.deleteDatabase(name);
						request.onsuccess = resolve;
						// TODO log errors.
						request.onerror = resolve;
						request.onblocked = resolve;
					}));
				}
			);
		};
		request.onfailure = error;
	}

	// TODO more?

	return thenable((resolve) => {
		const done = () => {
			if (typeof url === 'string') {
				window.location = url;
			} else if (url === true) {
				window.location.reload(true);
			} else {
				resolve();
			}
		};

		chain.then(done, done);
	});
}
