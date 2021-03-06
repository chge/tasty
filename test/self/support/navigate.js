'use strict';

module.exports = [
	{
		name: 'navigate',
		retry: 1,
		timeout: 30000,
		specs: [
			{
				name: 'navigates client',
				time: 1000,
				body: () => {
					navigate('/test.html');
					is(title('Tasty test'));
					navigate('/other.html');
					is(title('Tasty other'));
				}
			}
		]
	}
];
