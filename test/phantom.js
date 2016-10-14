// NOTE PhantomJS script.

var args = require('system').args,
	page = require('webpage').create(),
	verbose = args.indexOf('--verbose') !== -1,
	url = args[1];

log('phantom', url);

page.clearMemoryCache();
page.open(url, function (status) {
	log('phantom', status);
	if (status !== 'success') {
		return phantom.exit(1);
	}

	page.onNavigationRequested = function(url, type, allowed, main) {
		log('phantom', 'navigate', url, allowed ? 'allow' : 'disallow', type.toLowerCase());

		// WORKAROUND: page rendering causes PhantomJS to wait.
		page.render('tmp/phantomjs.png');
	};

	page.onLoadFinished = function(status) {
		log('phantom', 'loaded', status);
	};

	page.onResourceRequested = function(request) {
		log('phantom', 'requested', request.url);
	};

	// NOTE could be called many times for chunked response.
	page.onResourceReceived = function(response) {
		log('phantom', 'received', response.url);
	};

	page.onResourceError = function(error) {
		log('phantom', 'resource', 'error', error.errorCode, error.errorString, error.url);
	};

	page.onConsoleMessage = function(message, line, source) {
		log('phantom', message);

		// WORKAROUND
		message === 'tasty end' &&
			setTimeout(function() {
				phantom.exit(0);
			}, 1000);
	};

	page.onError = function (message, trace) {
		log('phantom', message);
		trace.forEach(function(item) {
			log('  ', item.file + ':' + item.line);
		});
	};
});

function log() {
	verbose &&
		console.log.apply(console, arguments);
}
