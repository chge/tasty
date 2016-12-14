'use strict';

module.exports = [
	{
		name: 'loaded',
		timeout: 30000,
		specs: [
			{
				name: 'checks resources',
				time: 1000,
				body: () => {
					navigate('/test.html');
					loaded('/manifest.appcache');
					loaded('/test.css');
					loaded('/test.js');
					loaded('/favicon.png');
					navigate('/other.html');
					loaded('/manifest.appcache');
					loaded('/other.css');
					loaded('/other.js');
					loaded('/favicon.png');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing resources',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						// TODO manifest.
						() => expect(now.loaded('/test.css'))
							.to.be.eventually.rejectedWith(Error),
						() => expect(now.loaded('/test.js'))
							.to.be.eventually.rejectedWith(Error)
						// TODO favicon.
					);
				}
			}
		]
	},
	{
		name: 'text',
		timeout: 30000,
		specs: [
			{
				name: 'checks static text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('Test');
					navigate('/other.html');
					text('Other');
				}
			},
			{
				name: 'checks text fragment',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('est');
					navigate('/other.html');
					text('ther');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing text',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(now.text('Text'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'skips not displayed text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('None');
				}
			},
			{
				name: 'skips hidden text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('Hidden');
				}
			},
			{
				name: 'checks input value',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('Value');
					text('42');
				}
			},
			{
				skip: tasty.flaws.placeholder,
				name: 'checks input placeholder',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('Placeholder');
				}
			},
			{
				skip: tasty.flaws.pseudo,
				name: 'checks pseudo-elements',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('Before Before');
					text('inner Inner');
					text('after After');
					text('Before Beforeinner Innerafter After');
				}
			},
			{
				skip: !global.chai,
				name: 'skips password',
				time: 1000,
				body: () => {
					navigate('/test.html');
					now(
						() => expect(now.text('Secret'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'works with strict flag',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text('Value', true);
					text('42', true);
					text('inner Inner', true);
				}
			},
			{
				name: 'works with regexp',
				time: 1000,
				body: () => {
					navigate('/test.html');
					text(/Value/);
					text(/^value$/i);
					text(/\d\d/);
				}
			}
		]
	}
];
