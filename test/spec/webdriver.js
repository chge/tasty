'use strict';

const SauceLabs = require('saucelabs'),
	Tasty = require('../..'),
	webdriver = require('selenium-webdriver');

// NOTE https://wiki.saucelabs.com/display/DOCS/Platform+Configurator
const LINUX = 'Linux',
	OSX = 'OS X 10.11',
	WINDOWS = 'Windows 10';
const CHROME = 'chrome',
	EDGE = 'MicrosoftEdge',
	FIREFOX = 'firefox',
	IE = 'internet explorer',
	OPERA = 'opera',
	SAFARI = 'safari';
const CASE = [
	//{appiumVersion: '1.5.3', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait', platformName: 'Android', platformVersion: '5.1'},
	//{appiumVersion: '1.5.3', browserName: 'Safari', deviceName: 'iPhone 6s Simulator', deviceOrientation: 'portrait', platformName: 'iOS', platformVersion: '9.3'},
	// TODO Android.
	// TODO iOS.
	{platform: WINDOWS, browserName: IE, version: '11.103'},
	{platform: LINUX, browserName: CHROME, version: '48.0'},
	{platform: LINUX, browserName: CHROME, version: '47.0'},
	{platform: LINUX, browserName: CHROME, version: '46.0'},
	{platform: LINUX, browserName: CHROME, version: '45.0'},
	{platform: LINUX, browserName: FIREFOX, version: '45.0'},
	{platform: LINUX, browserName: FIREFOX, version: '44.0'},
	{platform: LINUX, browserName: FIREFOX, version: '43.0'},
	{platform: LINUX, browserName: OPERA, version: '12.15'},
	{platform: OSX, browserName: CHROME, version: '53.0'},
	{platform: OSX, browserName: CHROME, version: '52.0'},
	{platform: OSX, browserName: CHROME, version: '51.0'},
	{platform: OSX, browserName: FIREFOX, version: '49.0'},
	{platform: OSX, browserName: FIREFOX, version: '48.0'},
	{platform: OSX, browserName: FIREFOX, version: '47.0'},
	{platform: OSX, browserName: SAFARI, version: '9.0'},
	{platform: WINDOWS, browserName: CHROME, version: '53.0'},
	{platform: WINDOWS, browserName: CHROME, version: '52.0'},
	{platform: WINDOWS, browserName: CHROME, version: '51.0'},
	{platform: WINDOWS, browserName: CHROME, version: '50.0'},
	{platform: WINDOWS, browserName: EDGE, version: '13.10586'},
	{platform: WINDOWS, browserName: FIREFOX, version: '49.0'},
	{platform: WINDOWS, browserName: FIREFOX, version: '48.0'},
	{platform: WINDOWS, browserName: FIREFOX, version: '47.0'},
	{platform: WINDOWS, browserName: FIREFOX, version: '46.0'},
];

const env = process.env,
	saucelabs = new SauceLabs({
		username: env.SAUCE_USERNAME,
		password: env.SAUCE_ACCESS_KEY
	});
let number = (env.TRAVIS_JOB_NUMBER || '1').split('.');
number = (number[1] || number[0]) | 0;

function run(config, name) {
	return new Promise((resolve, reject) => {
		const tasty = new Tasty(config);

		const driver = new webdriver.Builder()
			.usingServer(`http://${env.SAUCE_USERNAME}:${env.SAUCE_ACCESS_KEY}@localhost:4445/wd/hub`)
			.withCapabilities(Object.assign(
				{
					'tunnel-identifier': env.TRAVIS_JOB_NUMBER
				},
				CASE[number - 1] || CASE[random(0, CASE.length - 1)]
			))
			.build();

		// WORKAROUND: keepalive for Selenium.
		const keepalive = () => {
			try {
				// TODO check if driver is still connected.
				driver.getTitle();
				setTimeout(keepalive, 30000);
			} catch (thrown) {
				// NOTE noop.
			}
		};
		setTimeout(keepalive, 30000);

		let job;
		driver.getSession()
			.then((session) => {
				job = session.id_;

				return tasty.start();
			})
			.then(
				() => driver.get('http://localhost:8765/test.html')
			)
			.then(
				() => tasty.once('end', (token, error) => {
					saucelabs.updateJob(
						job,
						{
							name: name,
							passed: !error
						},
						(err) => {
							Promise.all([
								tasty.close(),
								quit(driver)
							]).then(
								() => error ?
									reject(error) :
									resolve(),
								reject
							);
						}
					);
				})
			);;
	});
}

function quit(driver) {
	return driver.manage().logs().get('browser')
		.then(
			(entries) => entries.map(
				(entry) => entry.level.name_ === 'ERROR' &&
					console.log(entry.message)
			),
			// NOTE noop.
			(error) => {}
		)
		.then(
			() => driver.quit()
		)
		.then(
			() => {},
			// NOTE noop.
			(error) => {}
		);
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('client', function() {
	this.timeout(300000);

	it('passes jasmine suite', function() {
		this.slow(20000);

		return run({
			coverage: 'istanbul',
			format: 'lcovonly',
			include: 'test/self/jasmine/*.js',
			runner: 'jasmine',
			reporter: 'jasmine-spec-reporter',
			static: 'test/root'
		}, this.test.fullTitle());
	});

	it('passes mocha suite', function() {
		this.slow(20000);

		return run({
			assert: 'chai',
			coverage: 'istanbul',
			format: 'lcovonly',
			expect: 'chai',
			include: 'test/self/mocha/*.js',
			static: 'test/root'
		}, this.test.fullTitle());
	});

	it('passes qunit suite', function() {
		this.slow(20000);

		return run({
			coverage: 'istanbul',
			format: 'lcovonly',
			log: true,
			include: 'test/self/qunit/*.js',
			runner: 'qunit',
			static: 'test/root'
		}, this.test.fullTitle());
	});
});
