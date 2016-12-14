'use strict';

module.exports = [
	{
		name: 'click',
		timeout: 30000,
		specs: [
			{
				name: 'clicks on button',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click('Button');
					text('Pressed');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on disabled button',
				time: 1000,
				body: () => {
					navigate('/test.html');
					now(
						() => expect(now.click('Disabled'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'clicks on deepest child',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click('Deep');
					text('Purple');
				}
			},
			{
				name: 'clicks on link',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click('Other');
					delay(500);
					location('/other.html');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without target',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(now.click('Nothing'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'dblclick',
		timeout: 30000,
		specs: [
			{
				name: 'double-clicks on text',
				time: 1000,
				body: () => {
					navigate('/test.html');
					dblclick('Double');
					text('Triple');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without target',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(now.dblclick('Nothing'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'hover',
		timeout: 30000,
		specs: [
			{
				name: 'hovers link',
				time: 1000,
				body: () => {
					navigate('/test.html');
					hover('Link');
					text('Hovered');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without target',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(now.hover('Nothing'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
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
					click('42');
					clear();
					paste(string);
					text(string, true);
				}
			},
			{
				skip: !global.chai,
				name: 'fails without active input',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(now.paste('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
					navigate('/test.html');
					delay(100); // WORKAROUND
					click('Value');
					now(
						() => expect(now.paste('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
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
					text('The 5 Dollar Shake');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without active input',
				time: 1000,
				body: () => {
					navigate('/other.html');
					now(
						() => expect(now.type('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
					navigate('/test.html');
					delay(100); // WORKAROUND
					click('Value');
					now(
						() => expect(now.type('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'works for input with label',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click('Label');
					type('Vanilla Coke');
				}
			},
			{
				name: 'works for input with value',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click('Value', 'input');
					type('Burnt to a Crisp');
					click('42');
					type('Bloody as Hell');
				}
			},
			{
				skip: tasty.flaws.placeholder,
				name: 'works for input with placeholder',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click('Placeholder');
					type('The 5 Dollar Shake');
				}
			},
			{
				name: 'works for password input',
				time: 1000,
				body: () => {
					navigate('/test.html');
					click(null, '[type="password"]');
					type('Secret');
				}
			}
		]
	}
];
