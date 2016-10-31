'use strict';

module.exports = [
	{
		name: 'input.click',
		timeout: 30000,
		specs: [
			{
				name: 'clicks on button',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Button');
					page.text('Pressed');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on disabled button',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					queue(
						() => expect(queue.input.click('Disabled'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'clicks on link',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Other');
					runner.delay(500);
					client.location('/other.html');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without target',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						() => expect(queue.input.click('Nothing'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'input.dblclick',
		timeout: 30000,
		specs: [
			{
				name: 'double-clicks on text',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.dblclick('Double');
					page.text('Triple');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without target',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						() => expect(queue.input.dblclick('Nothing'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'input.hover',
		timeout: 30000,
		specs: [
			{
				name: 'hovers link',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.hover('Link');
					page.text('Hovered');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without target',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						() => expect(queue.input.hover('Nothing'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'input.paste',
		timeout: 30000,
		specs: [
			{
				name: 'pastes into active input after clear',
				time: 1000,
				body: () => {
					const text = 'Zed\'s dead, baby';
					client.navigate('/test.html');
					input.click('42');
					input.clear();
					input.paste(text);
					page.text(text, true);
				}
			},
			{
				skip: !global.chai,
				name: 'fails without active input',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						() => expect(queue.input.paste('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
					client.navigate('/test.html');
					runner.delay(100); // WORKAROUND
					input.click('Value');
					queue(
						() => expect(queue.input.paste('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'input.type',
		timeout: 30000,
		specs: [
			{
				name: 'types into active input',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.type('The 5 Dollar Shake');
					page.text('The 5 Dollar Shake');
				}
			},
			{
				skip: !global.chai,
				name: 'fails without active input',
				time: 1000,
				body: () => {
					client.navigate('/other.html');
					queue(
						() => expect(queue.input.type('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
					client.navigate('/test.html');
					runner.delay(100); // WORKAROUND
					input.click('Value');
					queue(
						() => expect(queue.input.type('Error'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			},
			{
				name: 'works for input with label',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Label');
					input.type('Vanilla Coke');
				}
			},
			{
				name: 'works for input with value',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Value', 'input');
					input.type('Burnt to a Crisp');
					input.click('42');
					input.type('Bloody as Hell');
				}
			},
			{
				name: 'works for input with placeholder',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click('Placeholder');
					input.type('The 5 Dollar Shake');
				}
			},
			{
				name: 'works for password input',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					input.click(null, '[type="password"]');
					input.type('Secret');
				}
			}
		]
	}
];
