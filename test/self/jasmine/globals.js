describe('globals', function() {
	tasty.config.globals ?
		xit('are not defined') :
		it('are not defined', function() {
			Object.keys(tasty.tool).forEach((name) => {
				if (global[name]) {
					throw new Error('global ' + name + ' is defined prematurely');
				}
			});
		});

	it('requires scope', function() {
		let thrown;
		try {
			tasty.globals();
		} catch (ex) {
			thrown = ex;
		}
		if (!thrown) {
			throw new Error('tasty.globals should throw');
		}
	});

	it('are defined after call', function() {
		tasty.globals(global);

		Object.keys(tasty.tool).forEach((name) => {
			if (!global[name]) {
				throw 'global ' + name + ' is not defined';
			}
		});
	});
});