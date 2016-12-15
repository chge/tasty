'use strict';

module.exports = [
	{
		name: 'paste',
		timeout: 30000,
		specs: [
			{
				name: 'pastes into active input after clear',
				time: 1000,
				body: () => {
					const string = 'Zed\'s dead, baby';
					navigate('/test.html');
					click(text('42'));
					clear();
					paste(string);
					is(text(string));
				}
			},
			{
				skip: !global.chai,
				name: 'fails without active input',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(
							now.paste('Error')
						).to.be.eventually.rejectedWith(Error)
					);
					navigate('/test.html');
					delay(100); // WORKAROUND
					click(text('Value'));
					now(
						() => expect(
							now.paste('Error')
						).to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	}
];
