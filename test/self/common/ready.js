'use strict';

module.exports = [
	{
		name: 'ready',
		timeout: 50000,
		afterEach: () => {
			reset(false);
		},
		specs: [
			{
				name: 'supports delay',
				time: 500 + 100,
				body: () => {
					ready('delay', 500);
					navigate('/async.html');
					text('Async');
				}
			},
			{
				name: 'supports document',
				time: 500 + 100,
				body: () => {
					ready('document');
					navigate('/async.html');
					text('Test');
					delay(500);
					text('Async');
				}
			},
			{
				name: 'supports document with delay',
				time: 500 + 100,
				body: () => {
					ready('document', 500);
					navigate('/async.html');
					text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 500 + 100,
				body: () => {
					ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 500);
						});
					});
					navigate('/async.html');
					text('Async');
				}
			},
			{
				name: 'supports until',
				time: 500 + 100,
				body: () => {
					ready('until', function() {
						return document.body.innerHTML.indexOf('Async') !== -1;
					});
					navigate('/async.html');
					text('Async');
				}
			},
			{
				name: 'supports window',
				time: 500 + 100,
				body: () => {
					ready('window');
					navigate('/async.html');
					text('Test');
					delay(500);
					text('Async');
				}
			},
			{
				name: 'supports window with delay',
				time: 500 + 100,
				body: () => {
					ready('window', 500);
					navigate('/async.html');
					text('Async');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on unknown method',
				body: () => {
					now(
						() => expect(now.ready('unknown'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	},
	{
		name: 'ready',
		timeout: 5000,
		specs: [
			{
				name: 'supports delay',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					ready('delay', 500, ['text']);
					text('Test');
					ready('delay', 0, ['text']); // WORKAROUND: skip delay after last check.
					text('Async');
				}
			},
			{
				name: 'supports document',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					ready('document');
					text('Test');
					delay(500);
					text('Async');
				}
			},
			{
				name: 'supports document with delay',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					ready('document', 500);
					text('Async');
				}
			},
			{
				name: 'supports exec',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					ready('exec', function(tasty) {
						return tasty.thenable(function(resolve) {
							setTimeout(resolve, 500);
						});
					}, ['text']);
					text('Test');
					ready('delay', 0, ['text']); // WORKAROUND: skip delay after last check.
					text('Async');
				}
			},
			{
				name: 'supports until',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					ready('until', function() {
						return document.body.innerHTML.indexOf('Async') !== -1;
					}, ['text']);
					text('Test');
					ready('delay', 0, ['text']); // WORKAROUND: skip delay after last check.
					text('Async');
				}
			},
			{
				name: 'supports window',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					ready('window');
					text('Test');
					delay(500);
					text('Async');
				}
			},
			{
				name: 'supports window with delay',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					ready('window', 500);
					text('Async');
				}
			},
			{
				skip: !global.chai,
				name: 'fails on unknown method',
				body: () => {
					now(
						() => expect(now.ready('unknown'))
							.to.be.eventually.rejectedWith(Error)
					);
				}
			}
		]
	}
];
