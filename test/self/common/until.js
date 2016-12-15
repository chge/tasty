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
					until(is, ['Async']);
					is('Async');
				}
			},
			{
				name: 'supports custom delay',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					until(is, ['Async'], 250);
					is('Async');
				}
			},
			{
				name: 'supports custom timeout',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					until(is, ['Async'], null, 1000);
					is('Async');
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
	}
];
