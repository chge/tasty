'use strict';

module.exports = [
	{
		name: 'until',
		timeout: 10000,
		specs: [
			{
				name: 'blocks execution',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					until(text, ['Async']);
					text('Async');
				}
			},
			{
				name: 'supports custom delay',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					until(text, ['Async'], 250);
					text('Async');
				}
			},
			{
				name: 'supports custom timeout',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					until(text, ['Async'], null, 1000);
					text('Async');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on invalid input',
				body: () => {
					now(
						() => expect(now.until(null))
							.to.be.eventually.rejectedWith(TypeError)
					);
				}
			}
		]
	},
	{
		name: 'during',
		timeout: 10000,
		specs: [
			{
				name: 'blocks execution',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					during(text, ['Test']);
					text('Async');
				}
			},
			{
				name: 'supports custom delay',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					during(text, ['Test'], 250);
					text('Async');
				}
			},
			{
				name: 'supports custom timeout',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					during(text, ['Test'], null, 1000);
					text('Async');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on invalid input',
				body: () => {
					now(
						() => expect(now.while(null))
							.to.be.eventually.rejectedWith(TypeError)
					);
				}
			}
		]
	}
];
