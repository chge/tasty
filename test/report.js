// NOTE cross-platform concatenation of coverage reports.

const glob = require('glob').sync,
	fs = require('fs');

fs.writeFileSync(
	process.argv.slice(-1)[0],
	process.argv.slice(2, -1)
		.map((name) => glob(name))
		.reduce((all, names) => all.concat(names), [])
		.map((name) => fs.readFileSync(name).toString())
		.join('')
);
