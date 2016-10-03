'use strict';

const fs = require('fs'),
	glob = require('glob').sync;

const browserify = require(resolve('browserify')),
	ts = require(resolve('typescript'));

const ROOT = __dirname + '/../';

const result = ts.createProgram(
	glob(ROOT + 'src/client/*.js'),
	{
		allowJs: true,
		inlineSourceMap: true,
		inlineSources: true,
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
		const { line, character } = item.file.getLineAndCharacterOfPosition(item.start),
			message = ts.flattenDiagnosticMessageText(item.messageText, '\n');
		console.log(`${item.file.fileName} (${line + 1},${character + 1}): ${message}`);
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
	entries: [
		ROOT + 'tmp/main.js'
	],
	standalone: 'tasty'
})
	.bundle()
	.pipe(
		fs.createWriteStream(ROOT + 'dist/tasty.js')
			.on('finish', () => process.exit(0))
	);

function resolve(name) {
	try {
		return require.resolve(name);
	} catch (thrown) {
		try {
			return require.resolve(process.cwd() + '/node_modules/' + name);
		} catch (thrown) {
			const path = require('requireg').resolve(name);
			if (!path) {
				throw new Error(`Cannot find module '${name}'`);
			}

			return path;
		}
	}
}
