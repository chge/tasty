var args = require('system').args,
	page = require('webpage').create(),
	verbose = args.indexOf('--verbose') !== -1;

function log() {
	verbose &&
		console.log.apply(console, arguments);
}

page.clearMemoryCache();

page.open('http://localhost:5678/test.html', function (status) {
	log('phantom', status);
	if (status !== 'success') {
		return phantom.exit(1);
	}

	page.onNavigationRequested = function(url, type, allowed, main) {
		log('phantom', 'navigate', url, allowed ? 'allow' : 'disallow', type.toLowerCase());

		// WORKAROUND: page rendering causes PhantomJS to wait.
		page.render('phantomjs.png');
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
		message === 'tasty finish' &&
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
