'use strict';

module.exports = [
	{
		name: 'globals',
		skip: !tasty.config.assert || !tasty.config.expect,
		specs: [
			{
				name: 'are not defined before call',
				skip: tasty.config.globals,
				body: () => {
					Object.keys(tasty.tool).forEach((space) => {
						expect(global[space]).not.to.be.defined();
					});
				}
			},
			{
				name: 'require scope',
				body: () => {
					expect(() => tasty.globals()).to.throw(Error);
				}
			},
			{
				name: 'are defined after call',
				body: () => {
					tasty.globals(global);

					Object.keys(tasty.tool).forEach((space) => {
						assert(global[space], 'global.' + space);

						Object.keys(tasty.tool[space]).forEach((name) => {
							expect(global[space][name]).to.be.a('function');
						});
					});
				}
			}
		]
	}
];
