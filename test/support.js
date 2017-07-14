'use strict';

const env = process.env;
if (!env.SAUCE_USERNAME || !env.SAUCE_ACCESS_KEY) {
	throw new Error('no SauceLabs credentials');
}

const JOB = env.TRAVIS_JOB_NUMBER || '0.1',
	NUMBER = JOB.split('.'),
	INDEX = (NUMBER[0] | 0) + (NUMBER[1] | 0) - 1,
	VERSION = env.npm_package_version;

const Tasty = require('..'),
	webdriver = require('selenium-webdriver');

// NOTE https://wiki.saucelabs.com/display/DOCS/Platform+Configurator
const ANDROID = 'Android',
	LINUX = 'Linux',
	IOS = 'iOS',
	OSX12 = 'OS X 10.12',
	OSX11 = 'OS X 10.11',
	OSX10 = 'OS X 10.10',
	OSX9 = 'OS X 10.9',
	OSX8 = 'OS X 10.8',
	WINDOWS10 = 'Windows 10',
	WINDOWS81 = 'Windows 8.1',
	WINDOWS8 = 'Windows 8',
	WINDOWS7 = 'Windows 7',
	WINDOWSXP = 'Windows XP';
const CHROME = 'chrome',
	EDGE = 'MicrosoftEdge',
	EXPLORER = 'internet explorer',
	FIREFOX = 'firefox',
	OPERA = 'opera',
	SAFARI = 'safari';
// NOTE Caps <= Travis Node versions.
const CAPS = [
	{browserName: CHROME, version: 'dev', platform: WINDOWS10},
	{browserName: CHROME, version: 'beta', platform: OSX12},
	{browserName: CHROME, version: '59.0', platform: OSX11},
	{browserName: CHROME, version: '58.0', platform: WINDOWS10},
	{browserName: CHROME, version: '57.0', platform: WINDOWS81},
	{browserName: CHROME, version: '56.0', platform: WINDOWS8},
	{browserName: CHROME, version: '55.0', platform: WINDOWS7},
	{browserName: CHROME, version: '54.0', platform: OSX12},
	{browserName: CHROME, version: '53.0', platform: OSX11},
	{browserName: CHROME, version: '52.0', platform: WINDOWS10},
	{browserName: CHROME, version: '51.0', platform: WINDOWS81},
	{browserName: CHROME, version: '50.0', platform: WINDOWS8},
	{browserName: CHROME, version: '49.0', platform: WINDOWS7},
	{browserName: CHROME, version: '49.0', platform: WINDOWSXP},
	{browserName: CHROME, version: '48.0', platform: LINUX},
	{browserName: CHROME, version: '47.0', platform: WINDOWSXP},
	{browserName: CHROME, version: '26.0', platform: LINUX},
	{browserName: CHROME, version: '26.0', platform: WINDOWSXP},
	{browserName: EDGE, version: '15', platform: WINDOWS10},
	{browserName: EDGE, version: '14', platform: WINDOWS10},
	{browserName: EDGE, version: '13', platform: WINDOWS10},
	{browserName: EXPLORER, version: '11', platform: WINDOWS10},
	{browserName: EXPLORER, version: '11.0', platform: WINDOWS81},
	{browserName: EXPLORER, version: '11.0', platform: WINDOWS7},
	{browserName: EXPLORER, version: '10.0', platform: WINDOWS8},
	{browserName: EXPLORER, version: '10.0', platform: WINDOWS7},
	{browserName: EXPLORER, version: '9.0', platform: WINDOWS7},
	{browserName: EXPLORER, version: '8.0', platform: WINDOWS7},
	{browserName: EXPLORER, version: '8.0', platform: WINDOWSXP},
	{browserName: FIREFOX, version: 'dev', platform: WINDOWS10},
	{browserName: FIREFOX, version: 'beta', platform: OSX12},
	{browserName: FIREFOX, version: '54.0', platform: OSX11},
	{browserName: FIREFOX, version: '53.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '52.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '51.0', platform: WINDOWS8},
	{browserName: FIREFOX, version: '50.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '49.0', platform: OSX12},
	{browserName: FIREFOX, version: '48.0', platform: OSX11},
	{browserName: FIREFOX, version: '47.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '46.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '45.0', platform: LINUX},
	{browserName: FIREFOX, version: '44.0', platform: OSX12},
	{browserName: FIREFOX, version: '43.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '42.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '41.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '4.0', platform: LINUX},
	{browserName: FIREFOX, version: '4.0', platform: WINDOWSXP},
	{browserName: OPERA, version: '12.15', platform: LINUX},
	{browserName: OPERA, version: '12.12', platform: WINDOWSXP},
	{browserName: OPERA, version: '11.64', platform: WINDOWSXP},
	{browserName: SAFARI, version: '10.0', platform: OSX12},
	{browserName: SAFARI, version: '9.0', platform: OSX11},
	{browserName: SAFARI, version: '8.0', platform: OSX10},
	{browserName: SAFARI, version: '7.0', platform: OSX9},
	{browserName: SAFARI, version: '6.0', platform: OSX8},
	{browserName: SAFARI, version: '5.1', platform: WINDOWS7},
	{platformName: ANDROID, platformVersion: '7.0', browserName: 'Browser', deviceName: 'Android GoogleAPI Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '6.0', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '5.1', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '5.0', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '4.4', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.3', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.2', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.0', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.3', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.2', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.1', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.0', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.4', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.3', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.2', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.1', browserName: 'Safari', deviceName: 'iPad Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.3', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.2', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.1', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.0', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.4', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.3', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.2', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.1', browserName: 'Safari', deviceName: 'iPhone Simulator', deviceOrientation: 'portrait'},
];

describe(clientName(INDEX), function() {
	this.timeout(300000);

	let driver, tasty;

	it('passes Mocha suite', function() {
		this.slow(20000);

		driver = setup(clientCaps(INDEX));

		tasty = new Tasty({
			addon: 'chai,chai-as-promised,chai-spies',
			include: 'test/self/mocha/support.js',
			static: 'test/root',
			quiet: false,
			watch: true
		});

		return run(driver, tasty);
	});

	after(
		() => teardown(driver, tasty)
	);
});

function setup(caps) {
	return new webdriver.Builder()
		.usingServer(`http://${env.SAUCE_USERNAME}:${env.SAUCE_ACCESS_KEY}@localhost:4445/wd/hub`)
		.withCapabilities(Object.assign(
			{
				build: VERSION,
				// NOTE seconds.
				commandTimeout: 300,
				idleTimeout: 300,
				loggingPrefs: {
					'browser': 'DEBUG'
				},
				maxDuration: 300,
				name: clientName(caps),
				recordScreenshots: false,
				'tunnel-identifier': JOB
			},
			caps
		))
		.build();
}

function run(driver, tasty) {
	return new Promise((resolve, reject) => {
		tasty.once(
			'end',
			(token, error) => {
				// WORKAROUND: allow some flaky tests to fail.
				error = error && error.code > 1 ?
					error :
					null;

				driver.executeScript(`sauce:job-result=${!error}`)
					.then(
						() => error ?
							reject(error) :
							resolve(),
						reject
					);
			}
		);

		tasty.start()
			.then(
				() => driver.get('http://localhost:8765/test.html')
			)
			.catch(reject)
	});
}

function teardown(driver, tasty) {
	return driver.manage().logs().get('browser')
		.then(
			(entries) => entries.forEach(
				(entry) => console.log.apply(
					console,
					[entry.level.name_].concat(
						formatMessage(
							entry.message
						)
					)
				)
			),
			(error) => {} // NOTE noop.
		)
		.then(
			() => driver.quit()
		)
		.catch(
			(error) => {} // NOTE noop.
		)
		.then(
			() => tasty.stop()
		)
		.catch(
			(error) => {} // NOTE noop.
		);
}

function clientName(index) {
	const caps = isNaN(index) ?
			index :
			clientCaps(index),
		browser = caps.browserName ?
			capitalize(
				caps.browserName
					.replace('internet ', '')
					.replace('Microsoft', '')
			) :
			null,
		device = caps.deviceName ?
			caps.deviceName.split(' ')[0] :
			null,
		platform = caps.platform ||
			caps.platformName;

	return [
		caps.title || browser,
		caps.version,
		'on',
		device === platform ?
			null :
			device,
		platform,
		caps.platformVersion
	].filter(
		(item) => !!item
	).join(' ');
}

function clientCaps(index) {
	return CAPS[index % CAPS.length];
}

function capitalize(string) {
	return string ?
		string.substr(0, 1).toUpperCase() + string.substr(1) :
		string;
}

function formatMessage(message, url, line, col) {
	// NOTE ChromeDriver loses all chunks except first one:
	// https://bugs.chromium.org/p/chromedriver/issues/detail?id=669
	const wrapped = parseJson(message).message;

	return wrapped ?
		formatMessage(wrapped.text, wrapped.url, wrapped.line, wrapped.column) :
		[
			url,
			line ? line + ':' + col : null,
			message.replace(/\n+$/, '')
		].filter(
			(item) => !!item
		);
}

function parseJson(raw) {
	try {
		return JSON.parse(raw);
	} catch (thrown) {
		return raw;
	}
}
