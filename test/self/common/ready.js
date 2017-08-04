'use strict';

module.exports = [
	{
		name: 'ready',
		retry: 1,
		timeout: 50000,
		afterEach: () => {
			reset(false, true);
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
					ready('exec', function() {
						return this.utils.thenable(function(resolve) {
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
				name: 'runs without arguments',
				time: 500 + 100,
				body: () => {
					navigate('/async.html');
					// WORKAROUND: hooks are executed after reconnection,
					// so we need to run any tool to reset reconnection flag.
					is('Test');
					ready('window', 500);
					is('Test');
					ready();
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
