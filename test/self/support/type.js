'use strict';

module.exports = [
	{
		name: 'type',
		timeout: 30000,
		specs: [
			{
				name: 'types into active input',
				time: 1000,
				body: () => {
					navigate('/test.html');
					type('The 5 Dollar Shake');
					is(text('The 5 Dollar Shake'));
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
							now.type('Error')
						).to.be.eventually.rejectedWith(Error)
					);
					navigate('/test.html');
					click(text('Value'));
					now(
						() => expect(
							now.type('Error')
						).to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'works for input with label',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click(text('Label'));
					type('Vanilla Coke');
				}
			},
			{
				name: 'works for input with value',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click(text('Value'), nodes('input'));
					type('Burnt to a Crisp');
					click(text('42'));
					type('Bloody as Hell');
				}
			},
			{
				skip: tasty.flaws.placeholder,
				name: 'works for input with placeholder',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click(text('Placeholder'));
					type('The 5 Dollar Shake');
				}
			},
			{
				name: 'works for password input',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click('••••••');
					type('Secret');
					no(text('Secret'));
				}
			}
		]
	}
];
