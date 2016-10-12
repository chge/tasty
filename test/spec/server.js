'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

const URL1 = 'http://localhost:8765',
	URL2 = 'http://localhost:9876';

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
			server: URL2
		});

		return tasty.start()
			.then(
				() => chai.request(URL2).get('/socket.io.js')
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
			server: URL2
		});

		return tasty.start()
			.then(
				() => chai.request(URL2).get('/socket.io.js')
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
});
