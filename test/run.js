const glob = require('glob'),
	Mocha = require('mocha'),
	mocha = new Mocha({
		ui: 'bdd'
	});

glob.sync('test/spec/*.js')
	.forEach((file) => mocha.addFile(file));

mocha.run(function(failures) {
	process.exit(failures);
});
