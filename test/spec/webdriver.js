'use strict';

const Tasty = require('../..'),
	webdriver = require('selenium-webdriver');

// NOTE https://wiki.saucelabs.com/display/DOCS/Platform+Configurator
const LINUX = 'Linux',
	OSX11 = 'OS X 10.11',
	OSX10 = 'OS X 10.10',
	OSX9 = 'OS X 10.9',
	OSX8 = 'OS X 10.8',
	WINDOWS10 = 'Windows 10',
	WINDOWS7 = 'Windows 7',
	WINDOWSXP = 'Windows XP';
const CHROME = 'chrome',
	EDGE = 'MicrosoftEdge',
	FIREFOX = 'firefox',
	IE = 'internet explorer',
	OPERA = 'opera',
	SAFARI = 'safari';
const CAPS = [
	//{appiumVersion: '1.5.3', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait', platformName: 'Android', platformVersion: '5.1'},
	//{appiumVersion: '1.5.3', browserName: 'Safari', deviceName: 'iPhone 6s Simulator', deviceOrientation: 'portrait', platformName: 'iOS', platformVersion: '9.3'},
	// TODO Android.
	// TODO iOS.
	{platform: LINUX, browserName: CHROME, version: '48.0'},
	{platform: LINUX, browserName: CHROME, version: '47.0'},
	{platform: LINUX, browserName: CHROME, version: '46.0'},
	{platform: LINUX, browserName: CHROME, version: '45.0'},
	{platform: LINUX, browserName: CHROME, version: '44.0'},
	{platform: LINUX, browserName: FIREFOX, version: '45.0'},
	{platform: LINUX, browserName: FIREFOX, version: '44.0'},
	{platform: LINUX, browserName: FIREFOX, version: '43.0'},
	{platform: LINUX, browserName: FIREFOX, version: '42.0'},
	{platform: LINUX, browserName: FIREFOX, version: '41.0'},
	{platform: LINUX, browserName: OPERA, version: '12.15'},
	{platform: OSX11, browserName: CHROME, version: '53.0'},
	{platform: OSX11, browserName: CHROME, version: '52.0'},
	{platform: OSX11, browserName: CHROME, version: '51.0'},
	{platform: OSX11, browserName: CHROME, version: '50.0'},
	{platform: OSX11, browserName: CHROME, version: '49.0'},
	{platform: OSX11, browserName: FIREFOX, version: '49.0'},
	{platform: OSX11, browserName: FIREFOX, version: '48.0'},
	{platform: OSX11, browserName: FIREFOX, version: '47.0'},
	{platform: OSX11, browserName: FIREFOX, version: '46.0'},
	{platform: OSX11, browserName: FIREFOX, version: '45.0'},
	{platform: OSX11, browserName: SAFARI, version: '9.0'},
	{platform: OSX10, browserName: SAFARI, version: '8.0'},
	{platform: OSX9, browserName: SAFARI, version: '7.0'},
	{platform: OSX8, browserName: SAFARI, version: '6.0'},
	{platform: WINDOWS10, browserName: IE, version: '11.103'},
	{platform: WINDOWS7, browserName: IE, version: '11.0'},
	{platform: WINDOWS7, browserName: IE, version: '10.0'},
	{platform: WINDOWS7, browserName: IE, version: '9.0'},
	{platform: WINDOWSXP, browserName: IE, version: '9.0'},
	{platform: WINDOWS10, browserName: CHROME, version: '53.0'},
	{platform: WINDOWS10, browserName: CHROME, version: '52.0'},
	{platform: WINDOWS10, browserName: CHROME, version: '51.0'},
	{platform: WINDOWS10, browserName: CHROME, version: '50.0'},
	{platform: WINDOWS10, browserName: CHROME, version: '49.0'},
	{platform: WINDOWS7, browserName: CHROME, version: '53.0'},
	{platform: WINDOWS7, browserName: CHROME, version: '52.0'},
	{platform: WINDOWS7, browserName: CHROME, version: '51.0'},
	{platform: WINDOWS7, browserName: CHROME, version: '50.0'},
	{platform: WINDOWS7, browserName: CHROME, version: '49.0'},
	{platform: WINDOWSXP, browserName: CHROME, version: '49.0'},
	{platform: WINDOWS10, browserName: EDGE, version: '13.10586'},
	{platform: WINDOWS10, browserName: FIREFOX, version: '49.0'},
	{platform: WINDOWS10, browserName: FIREFOX, version: '48.0'},
	{platform: WINDOWS10, browserName: FIREFOX, version: '47.0'},
	{platform: WINDOWS10, browserName: FIREFOX, version: '46.0'},
	{platform: WINDOWS10, browserName: FIREFOX, version: '45.0'},
	{platform: WINDOWS7, browserName: FIREFOX, version: '49.0'},
	{platform: WINDOWS7, browserName: FIREFOX, version: '48.0'},
	{platform: WINDOWS7, browserName: FIREFOX, version: '47.0'},
	{platform: WINDOWS7, browserName: FIREFOX, version: '46.0'},
	{platform: WINDOWS7, browserName: FIREFOX, version: '45.0'},
	{platform: WINDOWSXP, browserName: FIREFOX, version: '45.0'},
	{platform: WINDOWS7, browserName: OPERA, version: '11.64'},
	{platform: WINDOWS7, browserName: OPERA, version: '12.12'},
	{platform: WINDOWS7, browserName: SAFARI, version: '5.1'},
];

// NOTE each Travis job checks 3 browsers, each on different test framework.
const env = process.env,
	number = (env.TRAVIS_JOB_NUMBER || '0.1').split('.')[1] | 0,
	version = env.npm_package_version;

describe(clientName(number * 3 - 2), function() {
	this.timeout(300000);

	let tasty, driver;
	afterEach(() => teardown(tasty, driver));

	it('passes Jasmine suite', function() {
		this.slow(20000);

		tasty = new Tasty({
			coverage: 'istanbul',
			format: 'lcovonly',
			include: 'test/self/jasmine/*.js',
			runner: 'jasmine',
			reporter: 'jasmine-spec-reporter',
			static: 'test/root'
		});
		driver = setup(clientCaps(number * 3 - 2));

		return run(tasty, driver);
	});
});

describe(clientName(number * 3 - 1), function() {
	this.timeout(300000);

	let tasty, driver;
	afterEach(() => teardown(tasty, driver));

	it('passes Mocha suite', function() {
		this.slow(20000);

		tasty = new Tasty({
			assert: 'chai',
			coverage: 'istanbul',
			format: 'lcovonly',
			expect: 'chai',
			include: 'test/self/mocha/*.js',
			static: 'test/root'
		});
		driver = setup(clientCaps(number * 3 - 1));

		return run(tasty, driver);
	});
});

describe(clientName(number * 3), function() {
	this.timeout(300000);

	let tasty, driver;
	afterEach(() => teardown(tasty, driver));

	it('passes QUnit suite', function() {
		this.slow(20000);

		tasty = new Tasty({
			coverage: 'istanbul',
			format: 'lcovonly',
			include: 'test/self/qunit/*.js',
			runner: 'qunit',
			static: 'test/root'
		});
		driver = setup(clientCaps(number * 3));

		return run(tasty, driver);
	});
});

function setup(caps) {
	const driver = new webdriver.Builder()
		.usingServer(`http://${env.SAUCE_USERNAME}:${env.SAUCE_ACCESS_KEY}@localhost:4445/wd/hub`)
		.withCapabilities(Object.assign(
			{
				// NOTE seconds.
				'commandTimeout': 300,
				'idleTimeout': 300,
				'maxDuration': 300,
				'tunnel-identifier': env.TRAVIS_JOB_NUMBER
			},
			caps
		))
		.build();

	driver.executeScript(`sauce:job-info=${JSON.stringify({name: clientName(caps), build: version})}`);

	return driver;
}

function run(tasty, driver) {
	return tasty.start()
		.then(
			() => driver.get('http://localhost:8765/test.html')
		)
		.then(
			() => new Promise((resolve, reject) => {
				tasty.once(
					'end',
					(token, error) => driver.executeScript(`sauce:job-result=${!error}`)
						.then(
							() => error ?
								reject(error) :
								resolve(),
							reject
						)
				);
			})
		);
}

function teardown(tasty, driver) {
	return Promise.resolve(
		tasty ?
			tasty.stop() :
			null
	)
		.then(
			() => driver.manage().logs().get('browser')
		)
		.then(
			(entries) => entries.map(
				(entry) => entry.level.name_ === 'ERROR' &&
					console.error(entry.message)
			),
			(error) => {} // NOTE noop.
		)
		.then(
			() => driver.quit()
		)
		.catch(
			(error) => {} // NOTE noop.
		);
}

function clientName(index) {
	const caps = isNaN(index) ?
		index :
		clientCaps(index);

	return [
		caps.browserName.substr(0, 1).toUpperCase() + caps.browserName.substr(1),
		caps.version,
		'on',
		caps.platform
	].join(' ');
}

function clientCaps(index) {
	return index ?
		CAPS[index % (CAPS.length - 1)] :
		CAPS[random(0, CAPS.length - 1)];
}

function random(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
