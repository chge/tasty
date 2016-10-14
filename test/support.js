'use strict';

const env = process.env,
	number = (env.TRAVIS_JOB_NUMBER || '').split('.')[1] | 0,
	version = env.npm_package_version;

// TODO skip for pull requests.
if (!number) {
	describe('webdriver', function() {
		it.skip('suite skipped');
	});

	return;
}

const Tasty = require('..'),
	webdriver = require('selenium-webdriver');

// NOTE https://wiki.saucelabs.com/display/DOCS/Platform+Configurator
const ANDROID = 'Android',
	LINUX = 'Linux',
	IOS = 'iOS',
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
	FIREFOX = 'firefox',
	IE = 'internet explorer',
	OPERA = 'opera',
	SAFARI = 'safari',
	WEBVIEW = 'WebView';
// NOTE Caps <= Travis Node versions x 3.
const CAPS = [
	// NOTE Appium.
	{platformName: ANDROID, platformVersion: '5.1', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '5.0', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	{platformName: ANDROID, platformVersion: '4.4', browserName: 'Browser', deviceName: 'Android Emulator', deviceOrientation: 'portrait'},
	// NOTE Selendroid.
	{title: WEBVIEW, browserName: 'android', version: '4.3', platform: LINUX, deviceName: 'Android Emulator', deviceType: 'phone', deviceOrientation: 'portrait'},
	{title: WEBVIEW, browserName: 'android', version: '4.2', platform: LINUX, deviceName: 'Android Emulator', deviceType: 'phone', deviceOrientation: 'portrait'},
	{title: WEBVIEW, browserName: 'android', version: '4.1', platform: LINUX, deviceName: 'Android Emulator', deviceType: 'phone', deviceOrientation: 'portrait'},
	{title: WEBVIEW, browserName: 'android', version: '4.0', platform: LINUX, deviceName: 'Android Emulator', deviceType: 'phone', deviceOrientation: 'portrait'},
	// NOTE Appium.
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
	// NOTE Selenium.
	{browserName: CHROME, version: '53.0', platform: OSX11},
	{browserName: CHROME, version: '53.0', platform: WINDOWS10},
	{browserName: CHROME, version: '53.0', platform: WINDOWS81},
	{browserName: CHROME, version: '53.0', platform: WINDOWS8},
	{browserName: CHROME, version: '53.0', platform: WINDOWS7},
	{browserName: CHROME, version: '52.0', platform: OSX11},
	{browserName: CHROME, version: '52.0', platform: WINDOWS10},
	{browserName: CHROME, version: '52.0', platform: WINDOWS81},
	{browserName: CHROME, version: '52.0', platform: WINDOWS8},
	{browserName: CHROME, version: '52.0', platform: WINDOWS7},
	{browserName: CHROME, version: '51.0', platform: OSX11},
	{browserName: CHROME, version: '51.0', platform: WINDOWS10},
	{browserName: CHROME, version: '51.0', platform: WINDOWS81},
	{browserName: CHROME, version: '51.0', platform: WINDOWS8},
	{browserName: CHROME, version: '51.0', platform: WINDOWS7},
	{browserName: CHROME, version: '50.0', platform: OSX11},
	{browserName: CHROME, version: '50.0', platform: WINDOWS10},
	{browserName: CHROME, version: '50.0', platform: WINDOWS81},
	{browserName: CHROME, version: '50.0', platform: WINDOWS8},
	{browserName: CHROME, version: '50.0', platform: WINDOWS7},
	{browserName: CHROME, version: '49.0', platform: OSX11},
	{browserName: CHROME, version: '49.0', platform: WINDOWS10},
	{browserName: CHROME, version: '49.0', platform: WINDOWS81},
	{browserName: CHROME, version: '49.0', platform: WINDOWS8},
	{browserName: CHROME, version: '49.0', platform: WINDOWS7},
	{browserName: CHROME, version: '49.0', platform: WINDOWSXP},
	{browserName: CHROME, version: '48.0', platform: LINUX},
	{browserName: CHROME, version: '48.0', platform: WINDOWSXP},
	{browserName: CHROME, version: '47.0', platform: LINUX},
	{browserName: CHROME, version: '47.0', platform: WINDOWSXP},
	{browserName: CHROME, version: '46.0', platform: LINUX},
	{browserName: CHROME, version: '46.0', platform: WINDOWSXP},
	{browserName: CHROME, version: '45.0', platform: LINUX},
	{browserName: CHROME, version: '45.0', platform: WINDOWSXP},
	{browserName: CHROME, version: '44.0', platform: LINUX},
	{browserName: CHROME, version: '44.0', platform: WINDOWSXP},
	{browserName: EDGE, version: '14', platform: WINDOWS10},
	{browserName: EDGE, version: '13', platform: WINDOWS10},
	{browserName: FIREFOX, version: '49.0', platform: OSX11},
	{browserName: FIREFOX, version: '49.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '49.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '49.0', platform: WINDOWS8},
	{browserName: FIREFOX, version: '49.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '48.0', platform: OSX11},
	{browserName: FIREFOX, version: '48.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '48.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '48.0', platform: WINDOWS8},
	{browserName: FIREFOX, version: '48.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '47.0', platform: OSX11},
	{browserName: FIREFOX, version: '47.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '47.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '47.0', platform: WINDOWS8},
	{browserName: FIREFOX, version: '47.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '46.0', platform: OSX11},
	{browserName: FIREFOX, version: '46.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '46.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '46.0', platform: WINDOWS8},
	{browserName: FIREFOX, version: '46.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '45.0', platform: OSX11},
	{browserName: FIREFOX, version: '45.0', platform: WINDOWS10},
	{browserName: FIREFOX, version: '45.0', platform: WINDOWS81},
	{browserName: FIREFOX, version: '45.0', platform: WINDOWS8},
	{browserName: FIREFOX, version: '45.0', platform: WINDOWS7},
	{browserName: FIREFOX, version: '45.0', platform: WINDOWSXP},
	{browserName: FIREFOX, version: '45.0', platform: LINUX},
	{browserName: FIREFOX, version: '45.0', platform: WINDOWSXP},
	{browserName: FIREFOX, version: '44.0', platform: LINUX},
	{browserName: FIREFOX, version: '44.0', platform: WINDOWSXP},
	{browserName: FIREFOX, version: '43.0', platform: LINUX},
	{browserName: FIREFOX, version: '43.0', platform: WINDOWSXP},
	{browserName: FIREFOX, version: '42.0', platform: LINUX},
	{browserName: FIREFOX, version: '42.0', platform: WINDOWSXP},
	{browserName: FIREFOX, version: '41.0', platform: LINUX},
	{browserName: FIREFOX, version: '41.0', platform: WINDOWSXP},
	{browserName: IE, version: '11', platform: WINDOWS10},
	{browserName: IE, version: '11.0', platform: WINDOWS81},
	{browserName: IE, version: '11.0', platform: WINDOWS8},
	{browserName: IE, version: '11.0', platform: WINDOWS7},
	{browserName: IE, version: '10.0', platform: WINDOWS8},
	{browserName: IE, version: '10.0', platform: WINDOWS7},
	{browserName: IE, version: '9.0', platform: WINDOWS7},
	{browserName: IE, version: '8.0', platform: WINDOWS7},
	{browserName: IE, version: '8.0', platform: WINDOWSXP},
	{browserName: OPERA, version: '12.15', platform: LINUX},
	{browserName: OPERA, version: '12.12', platform: WINDOWSXP},
	{browserName: OPERA, version: '11.64', platform: WINDOWSXP},
	{browserName: SAFARI, version: '9.0', platform: OSX11},
	{browserName: SAFARI, version: '8.0', platform: OSX10},
	{browserName: SAFARI, version: '7.0', platform: OSX9},
	{browserName: SAFARI, version: '6.0', platform: OSX8},
	{browserName: SAFARI, version: '5.1', platform: WINDOWS7},
];

describe(clientName(number * 3 - 2), function() {
	this.timeout(300000);

	let tasty, driver;
	afterEach(() => teardown(tasty, driver));

	it('passes Jasmine suite', function() {
		this.slow(20000);

		tasty = new Tasty({
			include: 'test/self/jasmine/support.js',
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
			expect: 'chai',
			include: 'test/self/mocha/support.js',
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
			include: 'test/self/qunit/support.js',
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
				'name': clientName(caps),
				'tunnel-identifier': env.TRAVIS_JOB_NUMBER,
				'build': version
			},
			caps
		))
		.build();

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
			(entries) => entries.forEach(
				(entry) => console.log(entry.level.name_, entry.message.replace(/\n+$/, ''))
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
			clientCaps(index),
		device = caps.deviceName ?
			caps.deviceName.split(' ')[0] :
			null,
		platform = caps.platform ||
			caps.platformName;

	return [
		caps.title || capitalize(caps.browserName),
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
	return CAPS[index % (CAPS.length - 1) - 1];
}

function capitalize(string) {
	return string ?
		string.substr(0, 1).toUpperCase() + string.substr(1) :
		string;
}
