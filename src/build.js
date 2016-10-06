'use strict';

const fs = require('fs'),
	glob = require('glob').sync,
	path = require('path');

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
		const data = item.file.getLineAndCharacterOfPosition(item.start),
			message = ts.flattenDiagnosticMessageText(item.messageText, '\n');
		console.log(`${item.file.fileName} (${data.line + 1},${data.character + 1}): ${message}`);
	});

	process.exit(1);
}

if (process.argv.indexOf('--coverage') !== -1) {
	const Instrumenter = require(resolve('istanbul')).Instrumenter,
		instrumenter = new Instrumenter();

	glob(ROOT + 'tmp/*.js').forEach((name) => {
		fs.writeFileSync(
			name,
			instrumenter.instrumentSync(
				fs.readFileSync(name).toString(),
				path.resolve(name.replace('/tmp/', '/src/client/'))
			)
		);
	});
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
