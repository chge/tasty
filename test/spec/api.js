const tasty = require('../..');

describe('tasty', function() {
	it('exports API', function() {
		tasty({static: true, logger: null}).start();
		tasty.finish();
	});
});
