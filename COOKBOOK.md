# Cookbook

Either use Tasty from command line or from your code using [API](https://chge.github.io/tasty/?api=server).

Tasty can read any [configuration](https://chge.github.io/tasty/?api=server#Tasty) fields from JSON file provided by `--config <path/to/config>` flag.

See `tasty --help` for more information.

Using Tasty from command line is intended for the most simple cases only, like testing in developer's browser. For more complicated use cases it's highly recommended to write a test script and use Tasty programmatically.

# Server

Tasty server is a bridge between the clients and the test runner, it controls each client and runs tests written using Tasty tools.

Use `--url` flag to configre server's own URL.

# Runner

Tasty supports any test frameworks that support asynchronous tests.

Check out the [API available for tests](https://chge.github.io/tasty/?api=test).

There are built-in runners for [Mocha](https://mochajs.org/), [Jasmine](https://jasmine.github.io/) and [QUnit](https://qunitjs.com/). See [Known issues](/tasty/?content=issues#jest) for [Jest](https://jestjs.io/). Provide `--runner <name>` flag to use one of them. For other frameworks, use Tasty programmatically from your runner.

[Chai](http://chaijs.com/), its [plugins](http://chaijs.com/plugins) and other helper libraries are supported by providing `--addon <name>,<name>...` flag.
For example, `--addon chai,chai-as-promised,chai-http` works fine.

Use `--watch` flag to watch for changes or run on several clients.

Tasty spawns [sandboxed](https://www.npmjs.com/package/tasty-sandbox) runner and coverage tool for each client separately,
so it's easy to test in parallel.

# Client

Tasty client is a small extendable UMD module that connects to the server and executes its commands.

It has its own [API](https://chge.github.io/tasty/?api=client) and isolated polyfills for non-supporting browsers.

Load `tasty.min.js` or use `--embed min` if you don't need to debug your tests.

# Static server

You can run built-in static server on the same URL by passing `--static <path/to/root>` flag.
Use `--static-index <path/to/index>` flag for SPAs and add `--embed` flag to inject Tasty client automatically.

# Code coverage

When serving application from its own server, you should instrument JavaScript code for coverage by yourself.
Tasty's static server has built-in support for [Istanbul](https://gotwarlost.github.io/istanbul) and [NYC](https://istanbul.js.org/) (aka Istanbul 2) to automatically do it for you.

# CSP

For Tasty server running on `localhost:8765/path` you should add the following CSP directives for Tasty client to work properly:

```
connect-src ws://localhost:8765/path
script-src localhost:8765/path
```

Change `ws` to `wss` if you serve from HTTPS.

Unfortunately, both [Istanbul](https://gotwarlost.github.io/istanbul) and [NYC](https://istanbul.js.org/) instrumenters use `new Function()` to get top-level scope.
To use one of them, you have to add the following directive:

```
script-src 'unsafe-eval'
```

If you use `<meta />` for CSP, Tasty's static server automatically injects that directive into HTML files when `--coverage <name>` flag is used.

Remember, CSP allows consequently applied directives to only restrict the resulting set, i.e. meta tags can't expand/loose header directives and vice versa.

Check out a [great tool](https://report-uri.io/home/generate) for generating and validating CSP directives.

# Automation

Recommended automation setup for particular project is the following.

| Scope | Client | Assets | API | Coverage | Tasty client | Tasty server | Tasty transport |
|-------|--------|--------|-----|-------------|--------------|--------------|-----------------|
| [Debugging](#debugging) | Developer's browser | Bundler | Standalone | No | Included explicitly during build | Localhost | WS |
| [Local testing](#local_testing) | Puppeteer or similar | Tasty server or bundler | Tasty server or standalone | Tasty server or bundler | Embedded by Tasty server or included explicitly during build | Localhost | WS |
| [Browser support](#browser_support) | Selenium grid | Test server | Test server | Avoid | Included explicitly during build | Localhost with tunneling | WS(S) |
| [Release monitoring](#release_monitoring) | Puppeteer or similar | Production server | Production server | No | Evaluated by client | Localhost | Client-dependent |

### Debugging

### Local testing

It's recommended to measure code coverage on this step only.

### Mock API

It's possible to add API mocks right into Tasty's static server, but you have to use it programmatically.

```javascript
const tasty = new Tasty(...);

const onRequest = tasty.Server.prototype.onRequest;
tasty.Server.prototype.onRequest = function(request, response) {
	if (request.url.startsWith('/api')) {
		// Handle or proxy API calls here.
	} else {
		onRequest.apply(this, arguments);
	}
};

tasty.start();
```

### Browser support

Single Tasty server is able to work with multiple clients simultaneously.

### Release monitoring

In production environment, running third-party code and connecting to third-party servers are generally prohibited. To make everything work, we basically need just two things to happen.

1. Tasty client's source should be evaluated on the client side each time document is loaded.
2. Tasty client should be able to connect to the running Tasty server.

The fastest way to achieve this goals is to use Puppeteer. Its `setBypassCSP`, `evaluateOnNewDocument` and `addScriptTag` methods could be useful.

For other drivers this could be quite tricky and highly depending on a particular driver's API.

# Selenium

It's relatively hard to reliably instrument WebDriver with Tasty client script. So it's highly recommended to explicitly include `tasty.js` into your application for builds that are tested using Selenium.

Take a look at [Known issues](/tasty/?content=issues#selenium) if you use Safari or when you need console output from the client.

# Puppeteer

# PhantomJS

# SlimerJS

# Test context

It's useful to alter test context, e.g. add the ability to resize client viewport or take a screenshot.

```javascript
const tasty = new Tasty(...);

const Context = tasty.Context;
tasty.Context = function() {
	const context = Context.apply(this, arguments);
	context.globals.myGlobal = ...;

	return context;
};

tasty.start();
```

Now any test should be able to use the instrumentation.
```javascript
it('uses test context', () => {
	global.myGlobal...
});
```

# Custom Tools

```javascript
new Tasty({
	...
	include: [
		'tools.js',
		...
	]
});
```

Now `tools.js` will be included prior to any test suite.
```javascript
now.myTool = myTool;
global.myTool = tasty.wrap(myTool);

async function myTool() {
	// Properly implemented Tool always returns Promise.
}
```

```javascript
it('uses custom tool', () => {
	myTool();
	now(
		() => now.myTool()
	);

	return now();
});
```

# Security recommendations

On staging or other near-production environment, Tasty can't pass (re)CAPTCHA or two-factor authentication for you.

### Permanent secrets

Store passwords in your Continuous Integration tool and pass credentials into command line. All arguments will be available in `tasty.config` object.

If you're automatically taking screenshots or recording videos during test run, they could potentially contain passwords (e.g. typed into wrong fields because of error) or other sensitive data.

Also, Tasty logs all typed/pasted text into browser console.

### One-off secrets

Get two-factor nonces from backdoor or use paid services to mock real mobile phones.

### (re)CAPTCHA

Use [reCAPTCHA testing `sitekey` and `secret`](https://developers.google.com/recaptcha/docs/faq) for testing environment.

Instead of trying to click on iframed content, simply fake reCAPTCHA response with some suitable string, e.g.
```javascript
exec(function() {
	document.querySelector('[name="g-recaptcha-response"]').value = '03AHJ_VuvHyNQjrLnMZ6eGbmdDZQ3Qma4CBrMSWSOzTcqB8rdl3tbIN1gzAWkB4jPi1qCE-aEw-hx7ns9DuzwNe7bW4E5rCc23SDFs9fQJGqAM27AeNKeg0q6ByJEC3ig3ydkrEzwVd56fi1oyDTVAvwpGCTtg8rjBRYqwn7qDnCp8Fw6Iq6h5vQKc7KtX4mW33QUL8Y5HzJReMDqZio8Rf6zmyqGGcOurvo6Gw4_exJfwcnK0CcnQUpbjlr3-9Mm-1fKeUq_q6s6plM7-2Rc2WNgYdguvp6yxZyyxr5IUKZk1eCvwgxu97zdbM3bPjfuuccrvie4LTGjasRYobPF51H5TbSm3-FacdHJ5usgMSjII6Cba7IaH4NQDPJqyO7ltWH1uPPRybuJmJk1AWALebHTiM-4loixaiI-47JCrBUeJGPPR9A8Q1UfduaZmzP0CrDj5YfFbVzHncDh4ac_KghXgehxbEQ2eD2Qwo18wlc87U-aQQqJLBkvlRUABHDGeWcyRvEzTPnpXfsmbK7Y2WlU4_zbCqtVAdR-pmp3MALqA-njyDtRZmtHsvsVVGvtVXy9UMlGRc4YwmvSyxg0fRegX13K7lMfnY9qqoNV23ZtB3fiQTUwjZnAe0F3KKArRTAt4XFjOJKIaz6-8TxHtqcPfejehTpkOJ0M7cDB3wi9_7BxNu758D6CfqgAXGKqH-kV42K6SJ69S50Lhl3t1l7rEWXmJi5vCEvQ2yHReL1XGtNygpt-WM0qlDiGswUITnUSire2c0JU84vTQCQ3AFZLWXX3eypwRHmyWXvUQAho9LqHZuV_qXoyiyK0SbCZW6lSW4CucElsy5XOpNAFCTgxtY4gTZgnR9uB_JHCjF69ibMeQeUPGNWahECJiRp49TpZi928wvGY_';
});
```

For testing `sitekey` and `secret`, reCAPTCHA server should accept the same `g-recaptcha-response` unlimited number of times.

If example above doesn't work (e.g. response format is changed), get new fake `g-recaptcha-response` string:
* manually click on testing reCAPTCHA,
* inspect XHR response or `value` property of `<textarea name="g-recaptcha-response" />` on the page.

For other CAPTCHA implementations, get answers from backdoor.

### SSL/TLS

Do not use production certificates with Tasty: server is not intended to be accessible from external networks.

Use [Let's encrypt](https://letsencrypt.org/), self-signed non-CA certificates or set up your own CA.

# Tools

### Queue

Each tool adds corresponding action to the runner queue instead of performing that action immediately.
This allows to write tests in synchronous manner.

```javascript
click('Name');
type('John Doe');
click('Save');
```

Queue is executed after `now()` call without arguments, which returns `Promise` instance.

```javascript
it('does something', function() {
	...
	return now();
});
```

Your testing framework may prefer callback for async tests.

```javascript
it('works', function(done) {
	...
	now().then(done, done);
});
```

### Ready state

For testing SPA (or rich MPA) you can provide a method for Tasty to ensure that client is ready for the next action.

The simpliest way is to just wait before or after using some tools.

```javascript
ready('delay', 1000);
```

You may override the list of tools to wait before and after.

```javascript
ready('delay', 1000, ['exec'], ['click']);
```

You always can manually add a delay into queue.

```javascript
delay(1000);
```

There could be enough to just check if DOM is ready...

```javascript
ready('document'); // 'DOMContentLoaded' aka 'interactive' readyState
```
```javascript
ready('window'); // 'load' aka 'complete' readyState
```

...and maybe wait a little bit.

```javascript
ready('document', 300);
```
```javascript
ready('window', 300);
```

Another way is to provide some application-specific code.

```javascript
ready(
	'until',
	// This function is executed on client, test will continue when it will return true.
	function() {
		return !document.getElementsByClassName('progress').length;
	},
	...
);
```

```javascript
ready(
	'exec',
	// This function is executed on client, test will continue when promise will be resolved.
	function(tasty) {
		// utils.Promise is a built-in implementation for non-supporting browsers.
		return new this.utils.Promise(
			function(resolve, reject) {
				...
			}
		);
	},
	...
);
```

Call without arguments simply executes `ready` logic, which is useful in some cases.

```javascript
ready('exec', ...);
click('Start');
is('Loading...');
ready();
is('Done');
```

Note that ready methods cannot be combined.

### Custom logic

The `now(...)` call with function(s) allows you to add some custom logic into test, but you should use `now.*` namespace for tools.

The `now.smth()` is the same as just `smth()`, but runs immediately. You should use `now.*` tools inside `now(...)` call if you don't want to break execution order.

```javascript
it('chooses', function() {
	now(
		() => now.is(text('Welcome back'))
			.then(
				() => now.click('Log in'),
				() => now.click('Sign up')
			)
	);

	return now();
});
```

Some tools, like `during()` and `until()`, accepts functions that will be already queued, so feel free to use `now.smth()` from them.

```javascript
it('searches', function() {
	until(
		() => now.is(text('Chapter 42', 'h1'))
			.catch((error) => {
				now.click('Next');
				throw error;
			})
	);
	click('Bookmark');

	return now();
});
```
