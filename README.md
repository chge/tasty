# Tasty

[![Build Status](https://travis-ci.org/chge/tasty.svg?branch=master)](https://travis-ci.org/chge/tasty)

Tasty helps test assembled web applications in nearly-production environments on real clients as a real user.

```shell
npm install -g tasty-js
```

Tasty supports both multiple and single page applications (with server rendering too) and code coverage.
It respects [Content Security Policy](https://www.w3.org/TR/CSP/) and SSL/TLS.

# How it works

Tasty server runs your tests using Tasty client to execute them inside your application.

1. Add `tasty.js` script to your assembly or markup.
2. Assemble and serve your application from staging server.
3. Provide CSP directives for Tasty and use test certificates, if needed.
4. Write tests for your preferred test framework using Tasty async tools.
5. Run Tasty server. Open application in any of your clients.
6. For every client Tasty will run your tests and return all output.
7. Edit tests, Tasty will re-run them automatically, if needed.

# Is [Selenium](https://github.com/SeleniumHQ/selenium) needed?

No.

However, it's a good idea to use Selenium as a client for Tasty.

# Similar tools

[Protractor](http://www.protractortest.org/) is a [Selenium](https://github.com/SeleniumHQ/selenium/wiki/WebDriverJs)-based end-to-end test framework that could be used for intergration tests.

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

Write a test.

```javascript
describe('login form', function() {
	it('allows user to log in', function() {
		page.text('Welcome!');
		page.enter('login', 'test');
		page.enter('pass', tasty.config.pass);
		page.click('Login');
		client.location('/dashboard');

		return queue();
	});
});
```

Run Tasty server.

```shell
tasty --runner=mocha --include=test.js --pass=secret --exit=false
```

Open your application in your clients. Tasty will run tests, print all output and exit.

# Server

Tasty server is a bridge between client and test runner, that runs tests written using Tasty tools.

You can run built-in static server by passing `--static` flag. Use `--exit=false` flag to run on several clients.

See `tasty --help` for more information.

# Client

Tasty client is a small extendable UMD module that connects to the server and executes tests with the same set of tools.

# Runner

Tasty supports any test frameworks that support asynchronous tests.

There are built-in runners for [Mocha](https://mochajs.org/), [Jasmine](https://jasmine.github.io/) and [QUnit](https://qunitjs.com/). Provide `--runner=name` flag to use one of them. For other frameworks, use Tasty programmatically from your runner.

[Chai](http://chaijs.com/) and other assertion/expectation libraries are supported by providing `--assert=name` and/or `--expect=name` flags.

# CSP

For Tasty server running on `localhost:8765/path` you should add the following CSP directives for Tasty client to work properly:

```
connect-src localhost:8765/path ws://localhost:8765/path wss://localhost:8765/path
script-src localhost:8765/path/*.js
```

Remember, CSP allows consequently applied directives to only restrict the resulting set, i.e. meta tags can't expand/loose header directives and vice versa.

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
it('reads', function(done) {
	page.text(
		page.title(),
		'h1'
	);

	return queue();
});
```

```javascript
it('remembers', function(done) {
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
it('remembers', function(done) {
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
		'h1'
	);

	return queue();
});
```

### Ready state

For testing SPA (or rich MPA) you can provide a method for Tasty to ensure that client is ready for the next action.

Note that built-in methods cannot be combined. To register persistent method(s) call `client.ready(...)`, for temporary methods use `page.ready(...)`.

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
	function() {
		return !document.getElementsByClassName('progress').length;
	},
	[...]
);
```

```javascript
client.ready(
	'exec',
	function(tasty) {
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
it('chooses', function(done) {
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
it('searches', function(done) {
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
input.click(what?: string | RegExp, selector?: string): void
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

Use [Let's encrypt](https://letsencrypt.org/).

# Building

In order to build client module, you'll need [Browserify](http://browserify.org/) and [TypeScript](https://www.typescriptlang.org/) installed (globally or locally).

```shell
npm install -g browserify typescript
```

```shell
npm install
```

# Self-testing

```shell
npm run selftest
```
