'use strict';

module.exports = [
	{
		name: 'after',
		timeout: 30000,
		afterEach: () => {
			reset(false);
		},
		specs: [
			{
				name: 'executes function after tool',
				time: 1000,
				body: () => {
					navigate('/other.html');
					// NOTE currently reconnect flag is being reset after first tool.
					text('Other');
					hook(
						'after',
						function(text) {
							debugger;
							document.body.innerHTML.indexOf(text) === -1 ||
								tasty.fail('after', 'reconnect');
						},
						['Other'],
						['reconnect']
					);
					navigate('/test.html');
				}
			}
		]
	},
	{
		name: 'before',
		timeout: 30000,
		afterEach: () => {
			reset(false);
		},
		specs: [
			{
				name: 'executes function before tool',
				time: 1000,
				body: () => {
					navigate('/other.html');
					hook(
						'before',
						function(text) {
							document.body.innerHTML.indexOf(text) === -1 &&
								tasty.fail('before', 'navigate');
						},
						['Other'],
						['navigate']
					);
					navigate('/test.html');
				}
			}
		]
	},
	{
		name: 'navigate',
		timeout: 30000,
		specs: [
			{
				name: 'navigates client',
				time: 1000,
				body: () => {
					navigate('/test.html');
					title('Tasty test');
					navigate('/other.html');
					title('Tasty other');
				}
			}
		]
	},
	{
		name: 'location',
		timeout: 30000,
		specs: [
			{
				name: 'checks client location',
				time: 1000,
				body: () => {
					navigate('/other.html');
					location('/other.html');
					navigate('/test.html');
					location('/test.html');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on wrong location',
				time: 1000,
				body: () => {
					navigate('/test.html');
					now(
						() => expect(now.location('/other.html'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'history',
		timeout: 30000,
		specs: [
			{
				name: 'navigates client through history',
				time: 1000,
				body: () => {
					navigate('/test.html');
					navigate('/other.html');
					history(-1);
					location('/test.html');
					history(1);
					location('/other.html');
				}
			}
			// TODO fail case.
		]
	}
];
