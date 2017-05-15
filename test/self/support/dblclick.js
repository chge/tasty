'use strict';

module.exports = [
	{
		name: 'dblclick',
		retry: 1,
		timeout: 30000,
		specs: [
			{
				name: 'double-clicks on text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					dblclick(text('Double'));
					is(text('Triple'));
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
							now.dblclick(text('Nothing'))
						).to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	}
];
