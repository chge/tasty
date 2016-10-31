'use strict';

module.exports = [
	{
		name: 'runner.until',
		timeout: 10000,
		specs: [
			{
				name: 'blocks execution',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					runner.until(page.text, ['Async']);
					page.text('Async');
				}
			},
			{
				name: 'supports custom delay',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					runner.until(page.text, ['Async'], 250);
					page.text('Async');
				}
			},
			{
				name: 'supports custom timeout',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					runner.until(page.text, ['Async'], null, 1000);
					page.text('Async');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on invalid input',
				body: () => {
					queue(
						() => expect(queue.runner.until(null))
							.to.be.eventually.rejectedWith(TypeError)
					);
				}
			}
		]
	},
	{
		name: 'runner.while',
		timeout: 10000,
		specs: [
			{
				name: 'blocks execution',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					runner.while(page.text, ['Test']);
					page.text('Async');
				}
			},
			{
				name: 'supports custom delay',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					runner.while(page.text, ['Test'], 250);
					page.text('Async');
				}
			},
			{
				name: 'supports custom timeout',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					runner.while(page.text, ['Test'], null, 1000);
					page.text('Async');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on invalid input',
				body: () => {
					queue(
						() => expect(queue.runner.while(null))
							.to.be.eventually.rejectedWith(TypeError)
					);
				}
			}
		]
	}
];
