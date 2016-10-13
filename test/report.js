// NOTE cross-platform concatenation of coverage reports.

const glob = require('glob').sync,
	fs = require('fs');

const input = process.argv.slice(2, -1),
	output = process.argv.slice(-1)[0];

fs.writeFileSync(
	output,
	input
		.map((name) => glob(name))
		.reduce((all, names) => all.concat(names), [])
		.filter((name) => fs.existsSync(name))
		.map((name) => fs.readFileSync(name).toString())
		.join('')
);
