# Known issues

### Sandbox

Tasty client runs inside JavaScript sandbox, so it simply can't emulate *real* interaction,
as [debugging](https://developer.chrome.com/devtools/docs/debugger-protocol) [protocols](https://wiki.mozilla.org/Remote_Debugging_Protocol) or [WebDriver](https://www.w3.org/TR/webdriver/) can.

### WebSocket

Currently Tasty can't run on clients without native WebSocket support.

However, the transport layer could be separated and implemented for special purposes. Take a look at client configuration and `Server.onConnection` method if this is the case.

### Auto-focus elements

When using auto-focus elements (such as `<input />`), you could encounter `cannot type into active node <body />` error when window loses its focus, which causes `type` and `paste` tools to fail.

If you don't want to focus such elements explicitly (using `click` or something else), make sure that client window remain focused during tests.
For WebDriver clients you could [maximize window](https://www.w3.org/TR/webdriver/#maximize-window) or use [`alert()` workaround](http://stackoverflow.com/a/19170779) to focus reliably.

Additionally, [Chrome DevTools](https://developer.chrome.com/devtools) could force current tab to lose focus, with the same results.

Remember, you can always click on something to reset autofocus when you don't need to test it.

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

### Arrow functions

```javascript
exec(() => {
	...
});
```

The lambda above will be called on the client "as is", so if it doesn't support arrow functions, the call will fail. It's more safe to always use `function` literals in such cases.

### Console

Tasty console output could be wrong or confusing if `window.console` is modified by your application. If this is the case, make sure Tasty client code is runnig prior to application code.

### Selenium

Tasty server uses port `8765` by default, which could be unavailable on remote MacOS or iOS devices. Try to set different port if you use Selenium hub with tunneling.

[ChromeDriver](http://chromedriver.chromium.org/) has an [ancient bug](https://bugs.chromium.org/p/chromedriver/issues/detail?id=669) that prevents logs to be fully captured. You can force Tasty client to log every message as a single string, by at least two ways.

Either pass a logger configuration to the client...

```javascript
const server = new Tasty(...);
server.on('client', (id, client) => {
	client.config.logger = {stringify: true};
});
```

...or provide the same configuration (or even a custom logger) to the client constructor.

```javascript
const client = new Tasty({
	...
	logger: {stringify: true}
});
```

### Jest

Unfortunately, [Jest](https://jestjs.io/) has [no documented API](https://github.com/facebook/jest/issues/5048) to use its runner programmatically.

See [Runner](/tasty/?api=server#Runner) base class.

### Browser UI

Some elements of browser itself, such as tooltips from `title` attribute or HTML5 Form validation messages, could be potentially detected, but currently aren't supported.

### Parallel logs

Tasty server is able to work with several clients simultaneously. But there are no clear way to separate logs from different clients yet.

### Duplicated clients

Tasty client currently can't detect that `tasty.js` is loaded more than once on the page, e.g. included during build and then embedded by Tasty static server. This leads to duplicated clients which obviously fail all the tests.

### HTTP + HTTPS on the same port

Not supported yet.

### Shadow DOM

Not supported yet.
