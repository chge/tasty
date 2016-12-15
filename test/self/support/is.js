'use strict';

module.exports = [
	{
		name: 'is',
		timeout: 30000,
		specs: [
			{
				name: 'checks css',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(css('/test.css'));
					navigate('/other.html');
					is(css('/other.css'));
				}
			},
			{
				name: 'checks doctype',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(doctype('html'));
					navigate('/other.html');
					is(doctype('html'));
				}
			},
			{
				name: 'checks location',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(location('/test.html'));
					// TODO href
					navigate('/other.html');
					is(location('/other.html'));
					// TODO href
				}
			},
			{
				name: 'checks manifest',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(manifest('/manifest.appcache'));
					navigate('/other.html');
					is(manifest('/manifest.appcache'));
				}
			},
			{
				name: 'checks script',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(script('/test.js'));
					navigate('/other.html');
					is(script('/other.js'));
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing css',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.is(css('/test.css'))
						).to.be.eventually.rejectedWith(Error),
						() => expect(
							now.is(css('/no.css'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				skip: !global.chai,
				name: 'fails on wrong doctype',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.is(doctype('HTML'))
						).to.be.eventually.rejectedWith(Error),
						() => expect(
							now.is(doctype('HTML'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				skip: !global.chai,
				name: 'fails on wrong location',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.is(location('/test.html'))
						).to.be.eventually.rejectedWith(Error),
						() => expect(
							now.is(location('localhost/test.html'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing manifest',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.is(manifest('/no.appcache'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing script',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.is(script('/test.js'))
						).to.be.eventually.rejectedWith(Error),
						() => expect(
							now.is(script('/no.js'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'is',
		timeout: 30000,
		specs: [
			{
				name: 'checks static text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text('Test'));
					navigate('/other.html');
					is(text('Other'));
				}
			},
			{
				name: 'checks text fragment',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text('est'));
					navigate('/other.html');
					is(text('ther'));
				}
			},
			{
				skip: !global.chai,
				name: 'fails on missing text',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.is(text('Text'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'skips not displayed text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text('None'));
				}
			},
			{
				name: 'skips hidden text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text('Hidden'));
				}
			},
			{
				name: 'checks input value',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text('Value'));
					is(text('42'));
					is(text(42));
				}
			},
			{
				skip: tasty.flaws.placeholder,
				name: 'checks input placeholder',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text('Placeholder'));
				}
			},
			{
				skip: tasty.flaws.pseudo,
				name: 'checks pseudo-elements',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text('Before Before'));
					is(text('inner Inner'));
					is(text('after After'));
					is(text('Before Beforeinner Innerafter After'));
				}
			},
			{
				skip: !global.chai,
				name: 'skips password',
				time: 1000,
				body: () => {
					navigate('/test.html');
					now(
						() => expect(
							now.is(text('Secret'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'works with regexp',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(text(/Value/));
					is(text(/^value$/i));
					is(text(/\d\d/));
				}
			}
		]
	}
];
