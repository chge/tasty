'use strict';

module.exports = [
	{
		name: 'location',
		timeout: 30000,
		specs: [
			{
				name: 'checks client location',
				time: 1000,
				body: () => {
					navigate('/other.html');
					is(location('/other.html'));
					navigate('/test.html');
					is(location('/test.html'));
				}
			},
			{
				skip: !global.chai,
				name: 'fails on wrong location',
				time: 1000,
				body: () => {
					navigate('/test.html');
					now(
						() => expect(
							now.is(location('/other.html'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	}
];
