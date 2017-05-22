// NOTE PhantomJS script.

var args = require('system').args,
	page = require('webpage').create(),
	url = args[1];

log('phantom', url);

phantom.onError = function(message, trace) {
	log(message);
	trace.forEach(function(item) {
		log('  ', item.file + ':' + item.line);
	});
};

page.onNavigationRequested = function(url, type, allowed, main) {
	log('phantom', 'navigate', url, allowed ? 'allow' : 'disallow', type.toLowerCase());
};

page.onLoadStarted = function() {
	log('phantom', 'loading');
};

page.onLoadFinished = function(status) {
	log('phantom', 'loaded', status);
};

page.onResourceRequested = function(request) {
	log('phantom', 'requested', request.url);
};

page.onResourceReceived = function(response) {
	response.stage === 'end' &&
		log('phantom', 'received', response.url);
};

page.onResourceError = function(error) {
	log('phantom', 'resource', 'error', error.errorCode, error.errorString, error.url);
};

var lastError;
page.onConsoleMessage = function(message, line, source) {
	log(message);

	// WORKAROUND
	message === 'tasty fail' &&
		screenshot(lastError || message);
	message === 'tasty end' &&
		phantom.exit(0);
};

page.onError = function(message, trace) {
	log(message);
	trace.forEach(function(item) {
		log('  ', item.file + ':' + item.line);
	});
	lastError = message;
};

page.clearMemoryCache &&
	page.clearMemoryCache();

page.open(url, function(status) {
	log('phantom', status);

	if (status !== 'success') {
		return phantom.exit(1);
	}
});

function log() {
	console.log([].join.call(arguments, ' '));
}

function screenshot(name) {
	name = ['phantom', name, Date.now(), 'png'].join('.')
		.replace(/"/g, '\'')
		.replace(/\.\./g, '.')
		.replace(/[^a-z0-9.'()$\- ]/gi, '');
	log('phantom', 'screenshot', name);

	page.render(name);
}
