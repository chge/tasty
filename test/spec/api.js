describe('tasty', function() {
	let tasty = require('requireg')('tasty-js');

	it('exports API', function() {
		tasty({static: true}).listen();
		tasty.io.server.close();
		tasty.static.close();
	});
});