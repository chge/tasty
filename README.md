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
tasty test.js --runner mocha --username 'John Doe' --password 'secret!'
```

Open your application in your client. Tasty will run the test, print all output and exit.

# Documentation

* [Introduction](https://chge.github.io/tasty/)
* [Cookbook](https://chge.github.io/tasty/cookbook)
* [Known issues](https://chge.github.io/tasty/issues)
* [Client API](https://chge.github.io/tasty/?api=client)
* [Server API](https://chge.github.io/tasty/?api=server)
* [Test API](https://chge.github.io/tasty/?api=test)

# Browser support

[![sauce labs](https://saucelabs.com/buildstatus/tasty)](https://saucelabs.com/u/tasty)

[![browser support](https://saucelabs.com/browser-matrix/tasty.svg)](https://saucelabs.com/u/tasty)

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
