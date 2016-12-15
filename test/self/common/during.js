'use strict';

module.exports = [
	{
		name: 'during',
		timeout: 10000,
		specs: [
			{
				name: 'blocks execution',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					during(is, ['Test']);
					is('Async');
				}
			},
			{
				name: 'supports custom delay',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					during(is, ['Test'], 250);
					is('Async');
				}
			},
			{
				name: 'supports custom timeout',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					during(is, ['Test'], null, 1000);
					is('Async');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on invalid input',
				body: () => {
					now(
						() => expect(now.during(null))
							.to.be.eventually.rejectedWith(TypeError)
					);
				}
			}
		]
	}
];
