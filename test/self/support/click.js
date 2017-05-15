'use strict';

module.exports = [
	{
		name: 'click',
		retry: 1,
		timeout: 30000,
		specs: [
			{
				name: 'clicks on button',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click(text('Button'));
					is(text('Pressed'));
				}
			},
			{
				skip: !global.chai,
				name: 'fails on disabled button',
				time: 1000,
				body: () => {
					navigate('/test.html');
					now(
						() => expect(
							now.click(text('Disabled'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'clicks on deepest child',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click(text('Deep'));
					is(text('Purple'));
				}
			},
			{
				name: 'clicks on link',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click(text('Other'));
					delay(500);
					is(location('/other.html'));
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
							now.click(text('Nothing'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	}
];
