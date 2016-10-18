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
	}
];
