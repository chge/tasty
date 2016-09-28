# Tasty

[![Build Status](https://travis-ci.org/chge/tasty.svg?branch=master)](https://travis-ci.org/chge/tasty)

Tasty helps test assembled web applications in nearly-production environments on real clients: browsers and webviews.

```shell
$ npm install -g tasty-js
```

Tasty supports both multiple and single page applications (with server rendering too) and code coverage.
It uses [Socket.IO](https://socket.io/) for client-server communication.
Tasty respects [Content Security Policy](https://www.w3.org/TR/CSP/) and SSL/TLS.

# How it works

1. Add `tasty.js` script to your assembly or markup.
2. Assemble and serve your application from staging server. Add CSP directives for Tasty, if needed.
3. Write tests for your preferred test framework using Tasty async tools.
4. Run Tasty server. Open application in any of your clients.
5. For every client Tasty will run your tests and print output.
6. Edit tests, Tasty will re-run them automatically, if needed.

# Example

Serve your application.

```html
<html>
	<head>
		<script src="tasty.js"></script>
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
	it('allows user to log in', function(done) {
		navigate('/login');
		text('Welcome!');
		enter('test', 'login');
		enter(tasty.config.pass);
		click('Login');
		location('/dashboard');

		queue(done);
	});
});
```

Run Tasty server.

```shell
$ tasty --runner=mocha --include=test.js --pass=secret --exit=false
```

Open your application in your client. Tasty will run tests, print all output and exit.

# Server

Server is a bridge between client and test runner, that runs tests written using Tasty tools.

You can run built-in static server by passing `--static` flag. Use `--exit=false` flag to run on several clients.

See `tasty-js --help` for more information.

# Client

Client is a small extendable library that connects to server and executes tests with the same set of tools.

# Runner

Tasty supports any test frameworks that support asynchronous tests.

There are built-in runners for [Mocha](https://mochajs.org/) and [Jasmine](https://jasmine.github.io/).

# CSP

For Tasty server running on `localhost:8765/path` you should add the following CSP directives for Tasty client to work properly:

```
connect-src localhost:8765/path ws://localhost:8765/path wss://localhost:8765/path
script-src localhost:8765/path/*.js
```

Remember, CSP allows consequently applied directives to only restrict the resulting set, i.e. meta tags can't expand/loose header directives and vice versa.

# Tools

To be described.

```
dom.font(family: string, selector?: string): void
dom.loaded(src?: string): void
dom.text(what?: string | RegExp, selector?: string): void
dom.title(what?: string | RegExp): string
client.location(): string
client.location(what?: string | RegExp): void
client.navigate(url: string): void
client.reload(): void
input.click(what?: string | RegExp, selector?: string): void
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
