'use strict';

module.exports = [
	{
		name: 'client.ready',
		timeout: 5000,
		afterEach: () => {
			delete tasty.tool.server.exec.persistent;
		},
		specs: [
			{
				name: 'supports delay',
				time: 2000,
				body: () => {
					client.ready('delay', 1000);
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports document',
				time: 2000,
				body: () => {
					client.ready('document');
					client.navigate('/async.html');
					page.text('Test');
					runner.delay(1000);
					page.text('Async');
				}
			},
			{
				name: 'supports until',
				time: 2000,
				body: () => {
					client.ready('until', function() {
						return document.body.innerText.indexOf('Async') !== -1;
					});
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 2000,
				body: () => {
					client.ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 1100);
						});
					});
					client.navigate('/async.html');
					page.text('Async');
				}
			}
		]
	},
	{
		name: 'page.ready',
		timeout: 5000,
		specs: [
			{
				name: 'supports delay',
				time: 2000,
				body: () => {
					client.navigate('/async.html');
					page.ready('delay', 1000, ['page.text']);
					page.text('Test');
					runner.delay(1000);
					page.text('Async');
				}
			},
			{
				name: 'supports document',
				time: 2000,
				body: () => {
					client.navigate('/async.html');
					page.ready('document');
					page.text('Test');
					runner.delay(1000);
					page.text('Async');
				}
			},
			{
				name: 'supports until',
				time: 2000,
				body: () => {
					client.navigate('/async.html');
					page.ready('until', function() {
						return document.body.innerText.indexOf('Async') !== -1;
					}, ['page.text']);
					page.text('Test');
					page.text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 2000,
				body: () => {
					client.navigate('/async.html');
					page.ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 1100);
						});
					}, ['page.text']);
					page.text('Test');
					page.text('Async');
				}
			}
		]
	}
];
