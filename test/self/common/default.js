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
					dom.title('Tasty test');
					client.navigate('/other.html');
					client.location('/other.html');
					dom.title('Tasty other');
				}
			}
		]
	},
	{
		name: 'dom.loaded',
		specs: [
			{
				name: 'checks resource',
				time: 500,
				body: () => {
					client.navigate('/test.html');
					dom.loaded('/manifest.appcache');
					dom.loaded('/test.css');
					dom.loaded('/test.js');
					dom.loaded('/favicon.png');
					client.navigate('/other.html');
					dom.loaded('/manifest.appcache');
					dom.loaded('/test.css');
					dom.loaded('/test.js');
					dom.loaded('/favicon.png');
				}
			}
		]
	},
	{
		name: 'dom.text',
		specs: [
			{
				name: 'checks text',
				time: 750,
				body: () => {
					client.navigate('/test.html');
					dom.text('Test');
					client.navigate('/other.html');
					dom.text('Other');
				}
			}
		]
	}
];
