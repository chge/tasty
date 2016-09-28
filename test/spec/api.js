const tasty = require('../..');

describe('tasty', function() {
	it('exports API', function() {
		tasty({static: true, log: false}).start();
		tasty.finish();
	});
});
