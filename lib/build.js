'use strict';

const fs = require('fs'),
	glob = require('glob').sync,
	path = require('path');

const resolve = require('./server/util').resolve,
	browserify = require(resolve('browserify')),
	ts = require(resolve('typescript'));

const ROOT = __dirname + '/../',
	coverage = process.argv.indexOf('--coverage');
let SRC = 'src/client/*.js';

if (coverage !== -1) {
	const NYC = require(resolve('nyc')),
		nyc = new NYC();

	mkdirp('tmp');
	mkdirp('tmp/covered');
	glob(ROOT + SRC).forEach((name) => {
		console.log('instrumenting', name);
		fs.writeFileSync(
			name.replace('src/client', 'tmp/covered'),
			nyc.instrumenter().instrumentSync(
				fs.readFileSync(name).toString(),
				path.resolve(name.replace('/tmp/', '/src/client/'))
			)
		);
	});

	SRC = 'tmp/covered/*.js';
}

console.log('transpiling', ROOT + SRC);
const result = ts.createProgram(
	glob(ROOT + SRC),
	{
		allowJs: true,
		overwrite: true,
		inlineSourceMap: !coverage,
		inlineSources: !coverage,
		module: ts.ModuleKind.None,
		newLine: 'lf',
		noEmitOnError: true,
		outDir: ROOT + 'tmp',
		pretty: true,
		removeComments: true,
		target: ts.ScriptTarget.ES3
	}
)
	.emit();

if (result.emitSkipped) {
	result.diagnostics.forEach((item) => {
		const code = 'TS' + item.code,
			message = ts.flattenDiagnosticMessageText(item.messageText, '\n');
		if (item.file) {
			const data = item.file.getLineAndCharacterOfPosition(item.start);
			console.log(code, item.file.fileName, `(${data.line + 1},${data.character + 1}):`, message);
		} else {
			console.log(code, message);
		}
	});

	process.exit(1);
}

try {
	fs.mkdirSync(ROOT + 'dist');
} catch (thrown) {
	switch (thrown.code) {
		case 'EEXIST': break;
		default: throw thrown;
	}
}

browserify({
	bundleExternal: false,
	entries: [
		ROOT + 'tmp/main.js'
	],
	standalone: 'tasty'
})
	.exclude('socket.io')
	.bundle()
	.pipe(
		fs.createWriteStream(ROOT + 'dist/tasty.js')
			.on('finish', () => process.exit(0))
	);

function mkdirp(name) {
	try {
		fs.mkdirSync(name);
	} catch (thrown) {
		if (thrown.code !== 'EEXIST') {
			throw thrown;
		}
	}
}
