'use strict';

const fs = require('fs'),
	http = require('http'),
	puppeteer = require('puppeteer'),
	Tasty = require('../..');

const URL = 'http://localhost:8765',
	URL1 = URL + '/test.html',
	URL2 = 'http://localhost:9876/path/path.html';

describe('Puppeteer', function() {
	// WORKAROUND
	if (process.argv.indexOf('--headful') !== -1) {
		return it.skip('spec skipped');
	}

	this.retries(1);
	this.timeout(60000);

	let server, browser, tasty;
	afterEach(() => {
		server && server.close();
		browser && browser.close();

		return tasty && tasty.stop().catch(() => {});
	});

	it('works with custom path', function(done) {
		this.slow(10000);

		server = http.createServer(
			(request, response) => fs.createReadStream(__dirname + '/../root/path.html').pipe(response)
		).listen(9876);
		tasty = new Tasty({
			quiet: false,
			url: URL + '/path'
		});

		tasty.once('end', (id, error) => done(error));
		tasty.start()
			.then(
				() => spawn('path', URL2)
			)
			.then((spawned) => {
				browser = spawned;
			})
	});

	// NOTE this one produces maximum client coverage.
	it('passes Mocha suite', function(done) {
		this.slow(20000);

		tasty = new Tasty({
			addon: 'chai,chai-as-promised,chai-spies',
			coverage: 'nyc',
			coverageReporter: 'lcovonly',
			include: 'test/self/mocha/*.js',
			quiet: false,
			static: 'test/root',
			embed: true
		});

		tasty.once('end', (id, error) => done(error));
		tasty.start()
			.then(
				() => spawn('mocha', URL1)
			)
			.then((spawned) => {
				browser = spawned;
			})
	});
});

function spawn(name, url) {
	name = name || 'unknown';

	return puppeteer.launch({
		headless: true,
		args: [
			'--disable-infobars',
			// NOTE currently required for headless mode.
			'--no-sandbox'
		]
	}).then(
		(browser) => browser.newPage()
			.then(
				(page) => browser.pages()
					// NOTE close useless first run page.
					.then(
						(pages) => pages[0].close()
					)
					.then(
						() => page.goto(url)
					)
					.then(
						() => browser
					)
			)
	);
}
