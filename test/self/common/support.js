'use strict';

module.exports = [
	{
		name: 'client.navigate',
		timeout: 30000,
		specs: [
			{
				name: 'navigates client',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					client.location('/test.html');
					page.title('Tasty test');
					client.navigate('/other.html');
					client.location('/other.html');
					page.title('Tasty other');
				}
			}
		]
	},
	{
		name: 'page.loaded',
		timeout: 30000,
		specs: [
			{
				name: 'checks resources',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.loaded('/manifest.appcache');
					page.loaded('/test.css');
					page.loaded('/test.js');
					page.loaded('/favicon.png');
					client.navigate('/other.html');
					page.loaded('/manifest.appcache');
					page.loaded('/other.css');
					page.loaded('/other.js');
					page.loaded('/favicon.png');
				}
			}
		]
	},
	{
		name: 'page.text',
		timeout: 30000,
		specs: [
			{
				name: 'checks text',
				time: 1000,
				body: () => {
					client.navigate('/test.html');
					page.text('Test');
					client.navigate('/other.html');
					page.text('Other');
				}
			}
		]
	}
];
