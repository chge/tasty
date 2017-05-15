'use strict';

module.exports = [
	{
		name: 'history',
		retry: 1,
		timeout: 30000,
		specs: [
			{
				skip: tasty.flaws.history,
				name: 'navigates client through history',
				time: 1000,
				body: () => {
					navigate('/test.html');
					navigate('/other.html');
					history(-1);
					is(location('/test.html'));
					history(1);
					is(location('/other.html'));
				}
			}
			// TODO fail case.
		]
	}
];
