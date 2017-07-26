// NOTE SlimerJS script.

var args = require('system').args,
	page = require('webpage').create(),
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

var lastError;
page.onConsoleMessage = function(message, line, source) {
	log(message);

	// WORKAROUND
	message === 'tasty fail' &&
		screenshot(lastError || message);
	message === 'tasty end' &&
		slimer.exit(0);
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
	log('slimer', status);
	if (status !== 'success') {
		return slimer.exit(1);
	}
});

function log() {
	console.log([].join.call(arguments, ' '));
}

function screenshot(name) {
	name = ['slimer', name, Date.now(), 'png'].join('.')
		.replace(/"/g, '\'')
		.replace(/\.\./g, '.')
		.replace(/[^a-z0-9.'()$\-_ ]/gi, '');
	log('slimer', 'screenshot', name);

	page.render(name);
}
