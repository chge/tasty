describe('globals', function() {
	tasty.config.globals ?
		xit('are not defined before call') :
		it('are not defined before call', function() {
			Object.keys(tasty.tool).forEach((space) => {
				if (global[space]) {
					throw new Error('global.' + space + ' is defined prematurely');
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

		Object.keys(tasty.tool).forEach((space) => {
			if (!global[space]) {
				throw new Error('global.' + name + ' is not defined');
			}
			Object.keys(tasty.tool[space]).forEach((name) => {
				if (!global[space][name]) {
					throw new Error('global.' + space + '.' + name + ' is not defined');
				}
			});
		});
	});
});