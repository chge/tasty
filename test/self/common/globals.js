'use strict';

module.exports = [
	{
		name: 'globals',
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
				skip: !tasty.config.expect,
				body: () => {
					expect(() => tasty.globals()).to.throw(Error);
				}
			},
			{
				name: 'are defined after call',
				skip: !tasty.config.expect,
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
