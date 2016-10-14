# Tasty

[![npm](https://img.shields.io/npm/v/tasty.svg)](https://www.npmjs.com/package/tasty)
[![build](https://travis-ci.org/chge/tasty.svg?branch=master)](https://travis-ci.org/chge/tasty)
[![windows](https://ci.appveyor.com/api/projects/status/github/chge/tasty?branch=master&svg=true)](https://ci.appveyor.com/project/chge/tasty)
[![coverage](https://coveralls.io/repos/github/chge/tasty/badge.svg?branch=master)](https://coveralls.io/github/chge/tasty?branch=master)
[![code climate](https://codeclimate.com/github/chge/tasty/badges/gpa.svg)](https://codeclimate.com/github/chge/tasty)

Tasty helps test fully assembled web applications in nearly-production environment on real clients as real users.

```shell
npm install -g tasty
```

Tasty supports both multiple and single page applications (with server rendering too) and code coverage.
It respects [Content Security Policy](https://www.w3.org/TR/CSP/) and SSL/TLS.

# How it works

Tasty server controls Tasty clients to run your tests against your application.

1. Add `tasty.js` module to your assembly or markup.
2. Assemble and serve your application from staging server.
3. Provide CSP directives for Tasty and use test certificates, if needed.
4. Write tests for your preferred test framework using Tasty async tools.
5. Run Tasty server. Open application in any of your clients.
6. For every client Tasty will run your tests and return all output.
7. Edit tests, Tasty will re-run them automatically, if needed.

# Is [Selenium](https://github.com/SeleniumHQ/selenium) server needed?

No.

However, you can use Selenium-driven clients to run your tests using Tasty.

# Why Tasty?

The main purpose is to emulate real user experience. Interact with text and graphics, not with heartless HTML elements.

Tasty provides you with only high-level tools to help treat your application as a black box, just like real user does.
Don't use knowledge of your application's markup, assume you're helping a real person to achieve his/her goals.

# Similar tools

[Protractor](http://www.protractortest.org/) and [WebdriverIO](http://webdriver.io/) are [Selenium](https://github.com/SeleniumHQ/selenium)-based end-to-end test frameworks useful for intergration testing. Also take a look at [Appium](http://appium.io/) and [Selendroid](http://selendroid.io/).

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
		<form>
			Welcome!
			<input name="login" type="text" />
			<input name="pass" type="password" />
			<input type="submit" text="Login" />
		</form>
	</body>
</html>
```

Write a test (this one uses [Mocha](https://mochajs.org/)).

```javascript
describe('login form', function() {
	it('allows user to log in', function() {
		page.text('Welcome!');
		input.enter('login', 'test');
		input.enter('pass', tasty.config.pass);
		input.click('Login');
		client.location('/dashboard');

		return queue();
	});
});
```

Run Tasty server.

```shell
tasty --runner mocha --include test.js --pass secret
```

Open your application in your client. Tasty will run the test, print all output and exit.

# Server

Tasty server is a bridge between the clients and the test runner, it controls each client and runs tests written using Tasty tools.

# Client

Tasty client is a small extendable UMD module that connects to the server and executes its commands.

# Runner

Tasty supports any test frameworks that support asynchronous tests.

There are built-in runners for [Mocha](https://mochajs.org/), [Jasmine](https://jasmine.github.io/) and [QUnit](https://qunitjs.com/). Provide `--runner <name>` flag to use one of them. For other frameworks, use Tasty programmatically from your runner.

[Chai](http://chaijs.com/), its [plugins](http://chaijs.com/plugins) and other helper libraries are supported by providing `--addon <name>,<name>...` flags.
For example, `--addon chai,chai-as-promised,chai-http` works fine.

Use `--watch` flag to watch for changes or run on several clients. See `tasty --help` for more information.

# Static server

You can run built-in static server on the same URL by passing `--static <path/to/root>` flag.
The `--static` flag without path serves content from CWD.

# Code coverage

When serving application from own server, you should instrument JavaScript code for coverage by yourself.
Tasty's static server has built-in support for [Istanbul](https://gotwarlost.github.io/istanbul) and [NYC](https://istanbul.js.org/) (aka Istanbul 2) to automatically do it for you.

# CSP

For Tasty server running on `localhost:8765/path` you should add the following CSP directives for Tasty client to work properly:

```
connect-src localhost:8765/path ws://localhost:8765/path wss://localhost:8765/path
script-src localhost:8765/path/*.js
```

Unfortunately, both [Istanbul](https://gotwarlost.github.io/istanbul) and [NYC](https://istanbul.js.org/) instrumenters use `new Function()` to get top-level scope.
To use one of them, you have to add the following directive:

```
script-src 'unsafe-eval'
```

Remember, CSP allows consequently applied directives to only restrict the resulting set, i.e. meta tags can't expand/loose header directives and vice versa.

Check out a [great tool](https://report-uri.io/home/generate) for generating and validating CSP directives.

# Browser support

[![Sauce Test Status](https://saucelabs.com/browser-matrix/tasty.svg)](https://saucelabs.com/u/tasty)

# Tools

### Queue

Each tool adds corresponding action to the runner queue instead of performing that action immediately. This allows to write tests in synchronous manner.

```javascript
client.click('Name');
client.type('John Doe');
client.click('Save');
```

Queue is executed after `queue()` call without arguments, which returns `Promise` instance.

```javascript
it('does something', function() {
	...
	return queue();
});
```

Your testing framework may prefer callback for async tests.

```javascript
it('works', function(done) {
	...
	queue().then(done, done.fail);
});
```

### Data from client

Some tools could be called without arguments to get data from client.

```javascript
it('reads', function() {
	page.text(
		page.title(),
		'h1'
	);

	return queue();
});
```

```javascript
it('remembers', function() {
	runner.push(
		page.read('h1')
	);
	input.click('Edit');
	input.click('Save');
	page.text(
		runner.pop(),
		'h1'
	);

	return queue();
});
```

```javascript
it('remembers', function() {
	runner.set(
		'title',
		page.read('h1')
	);
	runner.set(
		'subtitle',
		page.read('h2')
	);
	input.click('Edit');
	input.click('Title');
	input.type('blah');
	input.click('Save');
	page.text(
		runner.get('title')
			.then(
				(value) => value + 'blah'
			),
		'h1'
	);
	page.text(
		runner.get('subtitle'),
		'h2'
	);

	return queue();
});
```

### Ready state

For testing SPA (or rich MPA) you can provide a method for Tasty to ensure that client is ready for the next action.

Note that built-in methods cannot be combined. Call `client.ready(...)` to register persistent method and use `page.ready(...)` for temporary methods.

The simpliest way is to just wait after using some tools.

```javascript
client.ready('delay', 1000);
```

You may override the list of tools to wait after.

```javascript
client.ready('delay', 1000, [
	'input.click'
]);
```

You always can manually add a delay into queue.

```javascript
runner.delay(1000);
```

There could be enough to just check if DOM is ready and wait a little bit.

```javascript
client.ready('document');
```

Another way is to provide some application-specific code.

```javascript
client.ready(
	'until',
	// This function is executed on client, test will continue when it return true.
	function() {
		return !document.getElementsByClassName('progress').length;
	},
	[...]
);
```

```javascript
client.ready(
	'exec',
	// This function is executed on client.
	function(tasty) {
		// tasty.thenable is a builtin Promise for non-supporting browsers.
		return tasty.thenable(
			function(resolve, reject) {
				...
			}
		);
	},
	[...]
);
```

### Custom logic

The `queue(...)` call with function allows you to add some custom logic into test, but you should use `queue.*` namespace for tools.

```javascript
it('chooses', function() {
	queue(
		() => queue.page.text('Welcome back')
			.then(
				() => queue.input.click('Log in'),
				() => queue.input.click('Sign up')
			)
	);

	return queue();
});
```

The `queue.namespace.tool` is the same as `namespace.tool`, but runs immediately. You should use `queue.*` tools only inside `queue(...)` call if you want to preserve execution order.

```javascript
it('searches', function() {
	runner.until(
		queue(
			() => queue.page.text('Chapter 42', 'h1')
				.catch(
					() => queue.input.click('Next')
				)
		)
	);
	input.click('Bookmark');

	return queue();
});
```

# Reference

To be described.

```typescript
page.font(family: string, selector?: string): void
page.ready(method: string, value: number | function, filter?: string[]): void
page.loaded(): boolean
page.loaded(src?: string): void
page.text(what?: string | RegExp, selector?: string): void
page.title(what?: string | RegExp): string
client.ready(method: string, value: number | function, filter?: string[]): void
client.location(): string
client.location(what?: string | RegExp): void
client.navigate(url: string): void
client.reload(): void
input.click(what?: string | RegExp, selector?: string, reachable = true): void
input.paste(text: string): void
input.type(text: string): void
runner.get(key: string): any
runner.pop(): any
runner.push(value: any): void
runner.set(key: string, value: any): void
runner.until(tool: function, ...args: any[]): void
runner.while(tool: function, ...args: any[]): void
```

# Security recommendations

On staging or other near-production environment, Tasty can't pass (re)CAPTCHA or two-factor authentication for you.

### Permanent secrets

Store passwords in CIS and pass credentials into command line.

### One-off secrets

Get two-factor nonces from backdoor or use paid services to mock real mobile phones.

### (re)CAPTCHA

Use [reCAPTCHA testing key](https://developers.google.com/recaptcha/docs/faq) or get answers from backdoor.

### SSL/TLS

Use [Let's encrypt](https://letsencrypt.org/) or self-signed certificates.

# Building

```shell
npm run prepublish
```

# Testing

Automated for [SauceLabs](https://saucelabs.com/) environment.

```shell
npm test
```

Main tests require `phantomjs` executable to be accessible in the command line.
Make sure to clear PhantomJS persistent cache located in user home.

`AppData\Local\Ofi Labs\PhantomJS`

`Library/Caches/Ofi Labs/PhantomJS`

`.local/share/Ofi Labs/PhantomJS`

Real-browser tests require `TRAVIS_JOB_NUMBER`, `SAUCE_USERNAME` and `SAUCE_ACCESS_KEY` environment variables, which are provided by [TravisCI](https://docs.travis-ci.com/user/sauce-connect) automatically.

# Windows

Everything works fine, yay!
