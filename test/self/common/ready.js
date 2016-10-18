'use strict';

module.exports = [
	{
		name: 'client.ready',
		timeout: 50000,
		afterEach: () => {
			client.reset(false);
		},
		specs: [
			{
				name: 'supports delay',
				time: 500 + 100,
				body: () => {
					client.ready('delay', 500);
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports document',
				time: 500 + 100,
				body: () => {
					client.ready('document');
					client.navigate('/async.html');
					page.text('Test');
					runner.delay(500);
					page.text('Async');
				}
			},
			{
				name: 'supports document with delay',
				time: 500 + 100,
				body: () => {
					client.ready('document', 500);
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 500 + 100,
				body: () => {
					client.ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 500);
						});
					});
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports until',
				time: 500 + 100,
				body: () => {
					client.ready('until', function() {
						return document.body.innerHTML.indexOf('Async') !== -1;
					});
					client.navigate('/async.html');
					page.text('Async');
				}
			},
			{
				name: 'supports window',
				time: 500 + 100,
				body: () => {
					client.ready('window');
					client.navigate('/async.html');
					page.text('Test');
					runner.delay(500);
					page.text('Async');
				}
			},
			{
				name: 'supports window with delay',
				time: 500 + 100,
				body: () => {
					client.ready('window', 500);
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
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					page.ready('delay', 500, ['page.text']);
					page.text('Test');
					page.ready('delay', 0, ['page.text']); // WORKAROUND: skip delay after last check.
					page.text('Async');
				}
			},
			{
				name: 'supports document',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					page.ready('document');
					page.text('Test');
					runner.delay(500);
					page.text('Async');
				}
			},
			{
				name: 'supports document with delay',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					page.ready('document', 500);
					page.text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					page.ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 500);
						});
					}, ['page.text']);
					page.text('Test');
					page.ready('delay', 0, ['page.text']); // WORKAROUND: skip delay after last check.
					page.text('Async');
				}
			},
			{
				name: 'supports until',
				time: 500 + 100,
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
				name: 'supports window',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					page.ready('window');
					page.text('Test');
					runner.delay(500);
					page.text('Async');
				}
			},
			{
				name: 'supports window with delay',
				time: 500 + 100,
				body: () => {
					client.navigate('/async.html');
					page.ready('window', 500);
					page.text('Async');
				}
			}
		]
	}
];
