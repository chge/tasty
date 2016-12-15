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
					is('Async');
				}
			},
			{
				name: 'supports document',
				time: 500 + 100,
				body: () => {
					ready('document');
					navigate('/async.html');
					is('Test');
					delay(500);
					is('Async');
				}
			},
			{
				name: 'supports document with delay',
				time: 500 + 100,
				body: () => {
					ready('document', 500);
					navigate('/async.html');
					is('Async');
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
					is('Async');
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
					is('Async');
				}
			},
			{
				name: 'supports window',
				time: 500 + 100,
				body: () => {
					ready('window');
					navigate('/async.html');
					is('Test');
					delay(500);
					is('Async');
				}
			},
			{
				name: 'supports window with delay',
				time: 500 + 100,
				body: () => {
					ready('window', 500);
					navigate('/async.html');
					is('Async');
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
