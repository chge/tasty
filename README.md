# Tasty

[![npm](https://img.shields.io/npm/v/tasty.svg)](https://www.npmjs.com/package/tasty)
[![build](https://travis-ci.org/chge/tasty.svg?branch=master)](https://travis-ci.org/chge/tasty)
[![windows](https://ci.appveyor.com/api/projects/status/github/chge/tasty?branch=master&svg=true)](https://ci.appveyor.com/project/chge/tasty)
[![coverage](https://coveralls.io/repos/github/chge/tasty/badge.svg?branch=master)](https://coveralls.io/github/chge/tasty?branch=master)
[![code climate](https://codeclimate.com/github/chge/tasty/badges/gpa.svg)](https://codeclimate.com/github/chge/tasty)

Tasty helps to test fully assembled web applications in near-production environments on real web clients by emulating real users.

```shell
npm install -g tasty
```

Tasty supports both multiple and single page applications (with server rendering too) and code coverage.
It respects [Content Security Policy](https://www.w3.org/TR/CSP/) and SSL/TLS.

# How it works

Tasty server controls connected web clients to run your tests in runner of your choice against your application.

![console](https://github.com/chge/tasty/raw/master/test/demo/console.gif)

Client can emulate real user: navigate, fill forms, check page contents.

![browser](https://github.com/chge/tasty/raw/master/test/demo/browser.gif)

1. Add `tasty.js` module to your assembly or markup.
2. Assemble and serve your application from staging server.
3. Provide CSP directives for Tasty and use test certificates, if needed.
4. Write tests for your preferred test framework using Tasty async tools.
5. Run Tasty server. Open application in any of your clients.
6. For each client Tasty will run your tests and return all output.
7. Edit tests, Tasty will re-run them automatically, if needed.

# Is [Selenium](https://github.com/SeleniumHQ/selenium) server required?

No. Tasty client is intended to run inside browser environment without WebDriver.

But you'll probably need [Selenium](https://github.com/SeleniumHQ/selenium)-driven clients or tools like [PhantomJS](http://phantomjs.org/), [Puppeteer](https://github.com/GoogleChrome/puppeteer) and [SlimerJS](https://slimerjs.org/) for automation.

# Why Tasty?

The main purposes are:

1. Emulate real user experience.
2. Support any web client without WebDriver.
3. Keep test scripts as simple as possible.


Tasty gives you only high-level tools to help treat your application as a black box, just like real user does.
Interact with text and graphics, not with heartless HTML elements.
Try not to use knowledge of your application's markup, assume you're helping a real person to achieve some goals.

# Similar tools

[Protractor](http://www.protractortest.org/) and [WebdriverIO](http://webdriver.io/) are [Selenium](https://github.com/SeleniumHQ/selenium)-based end-to-end test frameworks useful for intergration testing. Also take a look at [Appium](http://appium.io/), [CasperJS](http://casperjs.org/) and [Selendroid](http://selendroid.io/).

[Karma](https://karma-runner.github.io/1.0/index.html) and [Testee](https://github.com/bitovi/testee) are great tools for cross-browser unit testing.

# Example

Serve your application.

```html
<html>
	<head>
		...
		<script src="//localhost:8765/tasty.js"></script>
	</head>
	<body>
		<form action="/dashboard">
			Welcome!
			<input placeholder="Username" type="text" />
			<input placeholder="Password" type="password" />
			<input value="Log in" type="submit" />
		</form>
	</body>
</html>
```

Write a test (this one uses [Mocha](https://mochajs.org/)).

```javascript
describe('login form', function() {
	it('logs user in', function() {
		is(text('Welcome!'));
		click(text('Username'));
		type(tasty.config.username);
		click(text('Password'));
		type(tasty.config.password);
		click(text('Log in'));
		is(location('/dashboard'));

		return now();
	});
});
```

Run Tasty server.

```shell
tasty test.js --username 'John Doe' --password 'secret!'
```

Open your application in your client. Tasty will run the test, print all output and exit.

# Configuration

Either use Tasty from command line or from your code using [API](https://chge.github.io/tasty/?api=server).

Tasty can read any [configuration](https://chge.github.io/tasty/?api=server#Tasty) fields from JSON file provided by `--config <path/to/config>` flag.

See `tasty --help` for more information.

# Server

Tasty server is a bridge between the clients and the test runner, it controls each client and runs tests written using Tasty tools.

Use `--url` flag to configre server's own URL.

# Runner

Tasty supports any test frameworks that support asynchronous tests.

Check out the [API available for tests](https://chge.github.io/tasty/?api=test).

There are built-in runners for [Mocha](https://mochajs.org/), [Jasmine](https://jasmine.github.io/) and [QUnit](https://qunitjs.com/). Provide `--runner <name>` flag to use one of them. For other frameworks, use Tasty programmatically from your runner.

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

# API reference

* [Introduction](https://chge.github.io/tasty/)
* [Client API](https://chge.github.io/tasty/?api=client)
* [Server API](https://chge.github.io/tasty/?api=server)
* [Test API](https://chge.github.io/tasty/?api=test)

# Browser support

[![sauce labs](https://saucelabs.com/buildstatus/tasty)](https://saucelabs.com/u/tasty)

[![browser support](https://saucelabs.com/browser-matrix/tasty.svg)](https://saucelabs.com/u/tasty)

# Known issues

### Sandbox

Tasty client runs inside JavaScript sandbox, so it simply can't emulate *real* interaction,
as [debugging](https://developer.chrome.com/devtools/docs/debugger-protocol) [protocols](https://wiki.mozilla.org/Remote_Debugging_Protocol) or [WebDriver](https://www.w3.org/TR/webdriver/) can.

### Highly fragmented text

Currently Tasty can't find text `+1 123 456-78-90` in the following case:

```html
+1 <input type="tel" placeholder="123 456-78-90" />
```

In other words, it's too hard to join text fragments of `textContent`, `value/placeholder`, `:before/:after` etc.

Also, search cannot detect text from `alt` attribute yet.

### Media

Border images are currently skipped.

Also, `<audio />`, `<video />`, `<picture />`, `<object />` and `<embed />` are not supported out-of-the-box.

### Auto-focus elements

When using auto-focus elements (such as `<input />`), you could encounter `cannot type into active node <body />` error when window loses its focus, which causes `type` and `paste` tools to fail.

If you don't want to focus such elements explicitly (using `click` or something else), make sure that client window remain focused during tests.
For WebDriver clients you could [maximize window](https://www.w3.org/TR/webdriver/#maximize-window) or use [`alert()` workaround](http://stackoverflow.com/a/19170779) to focus reliably.

Additionally, [Chrome DevTools](https://developer.chrome.com/devtools) could force current tab to lose focus, with the same results.

Remember, you can always click on something to reset autofocus when you don't need to test it.

### Shadow DOM

Not supported yet.

### Browser UI

Some elements of browser itself, such as tooltips from `title` attribute or HTML5 Form validation messages, could be potentially detected, but currently aren't supported.

### Arrow functions

```javascript
exec(() => {
	...
});
```

The lambda above will be called on the client "as is", so if it doesn't support arrow functions, the call will fail. It's more safe to always use `function` literals in such cases.

### Console

Tasty console output could be wrong or confusing if `window.console` is modified by your application. If this is the case, make sure Tasty client code is runnig prior to application code.

### HTTP + HTTPS on the same port

Not supported yet.

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

# Building

```shell
npm run prepublish
```

# Testing

```shell
npm test
```

Main tests use [SlimerJS](https://slimerjs.org/) and [PhantomJS](http://phantomjs.org/). SlimerJS itself requires [Firefox](https://www.mozilla.org/firefox) to be installed. PhantomJS suite requires `phantomjs` to be available via command prompt.

Because of tests for obsolete AppCache manifest, PhantomJS could put HTML page into persistent cache and then ignore `clearMemoryCache` API calls. This may require to delete cache files manually from the following locations:
* `%HOMEDRIVE%%HOMEPATH%\AppData\Local\Ofi Labs\PhantomJS`
* `~/Library/Caches/Ofi Labs/PhantomJS`
* `~/.local/share/Ofi Labs/PhantomJS/`

### Browser support

```shell
npm run support
```

Real-browser support tests are made possible by [SauceLabs](https://saucelabs.com/). Automation requires `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` environment variables,
which are kindly provided by [TravisCI](https://docs.travis-ci.com/user/sauce-connect).

# Windows

[![windows](https://ci.appveyor.com/api/projects/status/github/chge/tasty?branch=master&svg=true)](https://ci.appveyor.com/project/chge/tasty)

Everything works fine, yay!
