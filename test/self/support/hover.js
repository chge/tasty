'use strict';

module.exports = [
	{
		name: 'hover',
		retry: 1,
		timeout: 30000,
		specs: [
			{
				name: 'hovers link',
				time: 1000,
				body: () => {
					navigate('/test.html');
					hover(text('Link'));
					is(text('Hovered'));
				}
			},
			{
				skip: !global.chai,
				name: 'fails without target',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.hover(text('Nothing'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	}
];
