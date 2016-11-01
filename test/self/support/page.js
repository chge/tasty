'use strict';

module.exports = [
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
				name: 'checks text fragment',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('est');
					client.navigate('/other.html');
					page.text('ther');
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
				name: 'skips not displayed text',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('None');
				}
			},
			{
				name: 'skips hidden text',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('Hidden');
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
				skip: tasty.flaws.pseudo,
				name: 'checks pseudo-elements',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('Before Before');
					page.text('inner Inner');
					page.text('after After');
					page.text('Before Beforeinner Innerafter After');
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
			},
			{
				name: 'works with strict flag',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('Value', true);
					page.text('42', true);
					page.text('inner Inner', true);
				}
			},
			{
				name: 'works with regexp',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text(/Value/);
					page.text(/^value$/i);
					page.text(/\d\d/);
				}
			}
		]
	}
];
