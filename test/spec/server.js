'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

const URL1 = 'http://localhost:8765',
	URL2 = 'http://localhost:9876',
	URL3 = URL1.replace('http:', 'https:');

chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

describe('server', function() {
	let tasty, tasty2;
	afterEach(() => Promise.all([
		tasty && tasty.stop().catch(() => {}),
		tasty2 && tasty2.stop().catch(() => {})
	]));

	it('listens by default', function() {
		tasty = new Tasty();

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/tasty.js')
			)
			.catch(
				(response) => {
					expect(response).to.have.status(200);
					expect(response.body).to.be.ok;
				}
			);
	});

	it('listens on given URL', function() {
		tasty = new Tasty({
			url: URL2
		});

		return tasty.start()
			.then(
				() => chai.request(URL2).get('/tasty.js')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response.body).to.be.ok;
				}
			);
	});

	it('listens on given URL alternatively', function() {
		tasty = new Tasty({
			url: URL2
		});

		return tasty.start()
			.then(
				() => chai.request(URL2).get('/tasty.js')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response.body).to.be.ok;
				}
			);
	});

	it('responds error on root', function() {
		tasty = new Tasty();

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/')
			)
			.catch(
				(response) => {
					expect(response).to.have.status(403);
				}
			);
	});

	it('catches errors', function() {
		tasty = new Tasty();

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/exec.js')
			)
			.catch(
				(response) => expect(response).to.have.status(404)
			);
	});

	it('supports HTTPS', function() {
		tasty = new Tasty({
			cert: 'test/localhost.cert',
			key: 'test/localhost.key',
			passphrase: 'WHAT DO YOU GET IF YOU MULTIPLY SIX BY NINE',
			url: URL3
		});

		// NOTE chai-http seems to fail on self-signed cert.
		return expect(tasty.start())
			.to.be.fulfilled;
	});

	it('rejects to start on busy port', function() {
		tasty = new Tasty();
		tasty2 = new Tasty();

		return tasty.start()
			.then(
				() => expect(tasty2.start())
					.to.be.eventually.rejectedWith(Error)
					.and.to.have.property('code', 'EADDRINUSE')
			);
	});

	it('rejects to start HTTPS without certificate', function() {
		tasty = new Tasty({
			url: URL3
		});

		return expect(tasty.start())
			.to.be.eventually.rejectedWith(Error)
			.and.to.have.property('message').that.contains('cert');
	});

	it('rejects to start HTTPS without certificate key', function() {
		tasty = new Tasty({
			cert: 'test/localhost.cert',
			url: URL3
		});

		return expect(tasty.start())
			.to.be.eventually.rejectedWith(Error)
			.and.to.have.property('message').that.contains('key');
	});

	it('rejects to stop if not started', function() {
		tasty = new Tasty();

		return expect(tasty.stop())
			.to.be.eventually.rejectedWith(Error);
	});
});
