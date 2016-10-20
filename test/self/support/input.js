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
