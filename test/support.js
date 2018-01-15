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
	OSX13 = 'OS X 10.13',
	OSX12 = 'OS X 10.12',
	OSX11 = 'OS X 10.11',
	OSX10 = 'OS X 10.10',
	OSX9 = 'OS X 10.9',
	OSX8 = 'OS X 10.8',
	WINDOWS10 = 'Windows 10',
	WINDOWS81 = 'Windows 8.1',
	WINDOWS8 = 'Windows 8',
	WINDOWS7 = 'Windows 7';
const CHROME = 'chrome',
	EDGE = 'MicrosoftEdge',
	EXPLORER = 'internet explorer',
	FIREFOX = 'firefox',
	SAFARI = 'safari';
// NOTE Caps <= Travis Node versions.
const CAPS = [
	{browserName: ANDROID, version: '7.1', platform: LINUX, deviceName: 'Android GoogleAPI Emulator', deviceOrientation: 'portrait', title: 'Browser'},
	{browserName: ANDROID, version: '7.0', platform: LINUX, deviceName: 'Android GoogleAPI Emulator', deviceOrientation: 'portrait', title: 'Browser'},
	{platformName: ANDROID, platformVersion: '6.0', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '5.1', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '5.0', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '4.4', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{browserName: CHROME, version: 'dev', platform: WINDOWS10},
	{browserName: CHROME, version: 'beta', platform: OSX13},
	{browserName: CHROME, version: '63.0', platform: OSX12},
	{browserName: CHROME, version: '62.0', platform: OSX11},
	{browserName: CHROME, version: '61.0', platform: OSX10},
	{browserName: CHROME, version: '60.0', platform: WINDOWS10},
	{browserName: CHROME, version: '55.0', platform: WINDOWS81},
	{browserName: CHROME, version: '50.0', platform: WINDOWS8},
	{browserName: CHROME, version: '49.0', platform: WINDOWS7}, // NOTE max on XP
	{browserName: CHROME, version: '48.0', platform: LINUX}, // NOTE max on Linux
	{browserName: CHROME, version: '40.0', platform: WINDOWS7},
	{browserName: CHROME, version: '35.0', platform: LINUX},
	{browserName: CHROME, version: '30.0', platform: WINDOWS7},
	{browserName: CHROME, version: '26.0', platform: LINUX}, // NOTE min
	{browserName: EDGE, version: '16', platform: WINDOWS10},
	{browserName: EDGE, version: '15', platform: WINDOWS10},
	{browserName: EDGE, version: '14', platform: WINDOWS10},
	{browserName: EDGE, version: '13', platform: WINDOWS10},
	{browserName: EXPLORER, version: '11.0', platform: WINDOWS10},
	{browserName: EXPLORER, version: '11.0', platform: WINDOWS81},
	{browserName: EXPLORER, version: '11.0', platform: WINDOWS8},
	{browserName: EXPLORER, version: '11.0', platform: WINDOWS7},
	{browserName: EXPLORER, version: '10.0', platform: WINDOWS10},
	{browserName: EXPLORER, version: '10.0', platform: WINDOWS81},
	{browserName: EXPLORER, version: '10.0', platform: WINDOWS8},
	{browserName: EXPLORER, version: '10.0', platform: WINDOWS7}, // NOTE min with WebSocket
	{browserName: FIREFOX, version: 'dev', platform: WINDOWS10},
	{browserName: FIREFOX, version: 'beta', platform: OSX13},
	{browserName: FIREFOX, version: '57.0', platform: OSX12},
	{browserName: FIREFOX, version: '56.0', platform: OSX11},
	{browserName: FIREFOX, version: '55.0', platform: OSX10},
	{browserName: FIREFOX, version: '52.0', platform: WINDOWS7}, // NOTE max on Vista
	{browserName: FIREFOX, version: '50.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '45.0', platform: WINDOWS7}, // NOTE max on XP
	{browserName: FIREFOX, version: '35.0', platform: LINUX},
	{browserName: FIREFOX, version: '30.0', platform: WINDOWS8},
	{browserName: FIREFOX, version: '20.0', platform: LINUX},
	{browserName: FIREFOX, version: '10.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '4.0', platform: LINUX}, // NOTE min
	{platformName: IOS, platformVersion: '11.1', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '11.0', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.3', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.2', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.0', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.3', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.2', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.1', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.0', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.4', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.3', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.2', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.1', deviceName: 'iPad Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '11.1', deviceName: 'iPhone X Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '11.0', deviceName: 'iPhone X Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.3', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.2', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '10.0', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.3', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.2', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.1', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '9.0', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.4', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.3', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.2', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{platformName: IOS, platformVersion: '8.1', deviceName: 'iPhone Simulator', browserName: 'Safari', deviceOrientation: 'portrait'},
	{browserName: SAFARI, version: '11.0', platform: OSX13},
	{browserName: SAFARI, version: '10.0', platform: OSX12},
	{browserName: SAFARI, version: '9.0', platform: OSX11},
	{browserName: SAFARI, version: '8.0', platform: OSX10},
	{browserName: SAFARI, version: '7.0', platform: OSX9},
	{browserName: SAFARI, version: '6.0', platform: OSX8},
	{browserName: SAFARI, version: '5.1', platform: WINDOWS7},
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
			quiet: false,
			static: 'test/root',
			url: 'tasty.local:8765',
			watch: true
		});

		return run(driver, tasty);
	});

	after(
		() => teardown(driver, tasty)
	);
});

function setup(caps) {
	caps = Object.assign({
		build: VERSION,
		// NOTE seconds.
		commandTimeout: 330,
		idleTimeout: 330,
		maxDuration: 330,
		name: clientName(caps),
		recordScreenshots: false,
		'tunnel-identifier': JOB
	}, caps);

	console.log('\n');
	console.log(caps);

	return new webdriver.Builder()
		.usingServer(`http://${env.SAUCE_USERNAME}:${env.SAUCE_ACCESS_KEY}@localhost:4445/wd/hub`)
		.withCapabilities(caps)
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
				() => driver.get('http://tasty.local:8765/test.html')
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
		caps.title ?
			null :
			caps.version,
		'on',
		device === platform ?
			null :
			device,
		device === browser ?
			null :
			platform,
		caps.title ?
			caps.version :
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
