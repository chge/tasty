'use strict';

module.exports = [
	{
		name: 'client.navigate',
		specs: [
			{
				name: 'navigates client',
				time: 500,
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
		specs: [
			{
				name: 'checks resource',
				time: 500,
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
		specs: [
			{
				name: 'checks text',
				time: 750,
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
