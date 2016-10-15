// NOTE SlimerJS script.

var args = require('system').args,
	page = require('webpage').create(),
	verbose = args.indexOf('--verbose') !== -1,
	url = args[1];

log('slimer', url);

slimer.onError = function(message, trace) {
	log('slimer', message);
	trace.forEach(function(item) {
		log('  ', item.file + ':' + item.line);
	});
};

page.onNavigationRequested = function(url, type, allowed, main) {
	log('slimer', 'navigate', url, allowed ? 'allow' : 'disallow', type.toLowerCase());
};

page.onLoadStarted = function() {
	log('slimer', 'loading');
};

page.onLoadFinished = function(status) {
	log('slimer', 'loaded', status);
};

page.onResourceRequested = function(request) {
	log('slimer', 'requested', request.url);
};

page.onResourceReceived = function(response) {
	response.stage === 'end' &&
		log('slimer', 'received', response.url);
};

page.onResourceError = function(error) {
	log('slimer', 'resource', 'error', error.errorCode, error.errorString, error.url);
};

page.onConsoleMessage = function(message, line, source) {
	log('slimer', message);

	// WORKAROUND
	message === 'tasty end' &&
		slimer.exit(0);
};

page.onError = function (message, trace) {
	log('slimer', message);
	trace.forEach(function(item) {
		log('  ', item.file + ':' + item.line);
	});
};

page.open(url, function (status) {
	log('slimer', status);
	if (status !== 'success') {
		return slimer.exit(1);
	}
});

function log() {
	verbose &&
		console.log([].join.call(arguments, ' '));
}
