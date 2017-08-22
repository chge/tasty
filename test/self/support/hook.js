'use strict';

module.exports = [
	{
		name: 'hook',
		retry: 1,
		timeout: 30000,
		afterEach: () => {
			reset(false, true);
		},
		specs: [
			{
				name: 'executes function before tool',
				time: 1000,
				body: () => {
					navigate('/other.html');
					hook(
						['before.navigate'],
						function(text) {
							document.body.innerHTML.indexOf(text) === -1 &&
								tasty.fail('hook', 'before', 'navigate');
						},
						['Other']
					);
					navigate('/test.html');
				}
			},
			{
				name: 'executes function after tool',
				time: 1000,
				body: () => {
					navigate('/other.html');
					hook(
						['after.reconnect'],
						function(text) {
							document.body.innerHTML.indexOf(text) === -1 ||
								tasty.fail('hook', 'after', 'reconnect');
						},
						['Other']
					);
					navigate('/test.html');
				}
			}
		]
	}
];
