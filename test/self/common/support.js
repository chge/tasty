'use strict';

module.exports = [
	{
		name: 'client.navigate',
		timeout: 30000,
		specs: [
			{
				name: 'navigates client',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.title('Tasty test');
					client.navigate('/other.html');
					page.title('Tasty other');
				}
			}
		]
	},
	{
		name: 'client.location',
		timeout: 30000,
		specs: [
			{
				name: 'checks client location',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					client.location('/other.html');
					client.navigate('/test.html');
					client.location('/test.html');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on wrong location',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					queue(
						() => expect(queue.client.location('/other.html'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'client.go',
		timeout: 30000,
		specs: [
			{
				name: 'navigates client through history',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					client.navigate('/other.html');
					client.go(-1);
					client.location('/test.html');
					client.go(1);
					client.location('/other.html');
				}
			}
			// TODO fail case.
		]
	},
	{
		name: 'page.loaded',
		timeout: 30000,
		specs: [
			{
				name: 'checks resources',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.loaded('/manifest.appcache');
					page.loaded('/test.css');
					page.loaded('/test.js');
					page.loaded('/favicon.png');
					client.navigate('/other.html');
					page.loaded('/manifest.appcache');
					page.loaded('/other.css');
					page.loaded('/other.js');
					page.loaded('/favicon.png');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing resources',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						// TODO manifest.
						() => expect(queue.page.loaded('/test.css'))
							.to.be.eventually.rejectedWith(Error),
						() => expect(queue.page.loaded('/test.js'))
							.to.be.eventually.rejectedWith(Error)
						// TODO favicon.
					);
				}
			}
		]
	},
	{
		name: 'page.text',
		timeout: 30000,
		specs: [
			{
				name: 'checks static text',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('Test');
					client.navigate('/other.html');
					page.text('Other');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing text',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						() => expect(queue.page.text('Text'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'checks input value',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('Value');
					page.text('42');
				}
			},
			{
				name: 'checks input placeholder',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('Placeholder');
				}
			},
			{
				skip: !global.chai,
				name: 'skips password',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					queue(
						() => expect(queue.page.text('Secret'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'input.type',
		timeout: 30000,
		specs: [
			{
				name: 'types into active input',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.type('The 5 Dollar Shake');
					page.text('The 5 Dollar Shake');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without active input',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						() => expect(queue.input.type('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
					client.navigate('/test.html');
					input.click('Value');
					queue(
						() => expect(queue.input.type('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'works for input with label',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Label');
					input.type('Vanilla Coke');
				}
			},
			{
				name: 'works for input with value',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Value', 'input');
					input.type('Burnt to a Crisp');
					input.click('42');
					input.type('Bloody as Hell');
				}
			},
			{
				name: 'works for input with placeholder',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Placeholder');
					input.type('The 5 Dollar Shake');
				}
			},
			{
				name: 'works for password input',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click(null, '[type="password"]');
					input.type('Secret');
				}
			}
		]
	}
];
