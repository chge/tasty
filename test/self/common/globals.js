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
				skip: !global.chai,
				body: () => {
					expect(() => tasty.globals()).to.throw(TypeError);
				}
			},
			{
				name: 'are defined after call',
				skip: !global['chai-as-promised'],
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
