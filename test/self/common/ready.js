'use strict';

module.exports = [
	{
		name: 'client.ready',
		timeout: 60000,
		afterEach: () => {
			client.reset(false);
		},
		specs: [
			{
				name: 'supports delay',
				time: 5000 + 200,
				body: () => {
					client.ready('delay', 5000);
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports document',
				time: 5000 + 200,
				body: () => {
					client.ready('document');
					client.navigate('/async.html');
					page.text('Test');
					runner.delay(5000);
					page.text('Async');
				}
			},
			{
				name: 'supports until',
				time: 5000 + 200,
				body: () => {
					client.ready('until', function() {
						return document.body.innerHTML.indexOf('Async') !== -1;
					});
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 5000 + 200,
				body: () => {
					client.ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 5000);
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
		timeout: 60000,
		specs: [
			{
				name: 'supports delay',
				time: 5000 + 200,
				body: () => {
					client.navigate('/async.html');
					page.ready('delay', 5000, ['page.text']);
					page.text('Test');
					page.ready('delay', 0, ['page.text']); // WORKAROUND: skip delay after last check.
					page.text('Async');
				}
			},
			{
				name: 'supports document',
				time: 5000 + 200,
				body: () => {
					client.navigate('/async.html');
					page.ready('document');
					page.text('Test');
					runner.delay(5000);
					page.text('Async');
				}
			},
			{
				name: 'supports until',
				time: 5000 + 200,
				body: () => {
					client.navigate('/async.html');
					page.ready('until', function() {
						return document.body.innerHTML.indexOf('Async') !== -1;
					}, ['page.text']);
					page.text('Test');
					page.ready('delay', 0, ['page.text']); // WORKAROUND: skip delay after last check.
					page.text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 5000 + 200,
				body: () => {
					client.navigate('/async.html');
					page.ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 5000);
						});
					}, ['page.text']);
					page.text('Test');
					page.ready('delay', 0, ['page.text']); // WORKAROUND: skip delay after last check.
					page.text('Async');
				}
			}
		]
	}
];
