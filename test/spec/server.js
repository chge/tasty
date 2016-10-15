'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

const URL1 = 'http://localhost:8765',
	URL2 = 'http://localhost:9876',
	URL3 = 'https://localhost:8765';

chai.use(require('chai-as-promised'));
chai.use(require('chai-http'));

describe('server', function() {
	it('listens by default', function() {
		const tasty = new Tasty();

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/tasty.js')
			)
			.catch(
				(response) => {
					expect(response).to.have.status(200);
					expect(response.body).to.be.ok;
				}
			)
			.then(
				() => tasty.stop()
			);
	});

	it('listens on given URL', function() {
		const tasty = new Tasty({
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
			)
			.then(
				() => tasty.stop()
			);
	});

	it('listens on given URL alternatively', function() {
		const tasty = new Tasty({
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
			)
			.then(
				() => tasty.stop()
			);
	});

	it('responds with text on root', function() {
		const tasty = new Tasty();

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/')
			)
			.catch(
				(response) => {
					expect(response).to.have.status(400);
				}
			)
			.then(
				() => tasty.stop()
			);
	});

	it('catches errors', function() {
		const tasty = new Tasty();

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/exec.js')
			)
			.catch(
				(response) => expect(response).to.have.status(404)
			)
			.then(
				() => tasty.stop()
			);
	});

	it('supports HTTPS', function() {
		const tasty = new Tasty({
			cert: 'test/cert.pem',
			key: 'test/key.pem',
			url: URL3
		});

		// NOTE chai-http seems to fail on self-signed cert.
		return expect(tasty.start())
			.to.be.fulfilled
			.then(
				() => tasty.stop()
			);
	});

	it('rejects to start on busy port', function() {
		const tasty1 = new Tasty(),
			tasty2 = new Tasty();

		return tasty1.start()
			.then(
				() => expect(tasty2.start())
					.to.be.eventually.rejectedWith(Error)
					.and.to.have.property('code', 'EADDRINUSE')
			)
			.then(
				() => tasty1.stop()
			);
	});

	it('rejects to start HTTPS without certificate', function() {
		const tasty = new Tasty({
			url: URL3
		});

		return expect(tasty.start())
			.to.be.eventually.rejectedWith(Error)
			.and.to.have.property('message').that.contains('cert');
	});

	it('rejects to start HTTPS without certificate key', function() {
		const tasty = new Tasty({
			cert: 'test/cert.pem',
			url: URL3
		});

		return expect(tasty.start())
			.to.be.eventually.rejectedWith(Error)
			.and.to.have.property('message').that.contains('key');
	});

	it('rejects to stop if not started', function() {
		const tasty = new Tasty();

		return expect(tasty.stop())
			.to.be.eventually.rejectedWith(Error);
	});
});
