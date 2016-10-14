'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

const URL1 = 'http://localhost:8765',
	URL2 = 'http://localhost:6789';

chai.use(require('chai-http'));

describe('static', function() {
	it('serves by default', function() {
		const tasty = new Tasty({
			static: true
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/')
			)
			.catch(
				(response) => expect(response).to.have.status(400)
			)
			.then(
				() => tasty.stop()
			);
	});

	it('serves from CWD', function() {
		const tasty = new Tasty({
			static: true
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/package.json')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.json;
					expect(response.body.name).to.equal('tasty');
				}
			)
			.then(
				() => tasty.stop()
			);
	});

	it('serves from given root', function() {
		const tasty = new Tasty({
			static: 'test/root'
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/test.html')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			)
			.then(
				() => tasty.stop()
			);
	});

	it('serves on given URL', function() {
		const tasty = new Tasty({
			url: URL2,
			static: 'test/root'
		});

		return tasty.start()
			.then(
				() => chai.request(URL2).get('/test.html')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			)
			.then(
				() => tasty.stop()
			);
	});

	it('allows path traversal', function() {
		const tasty = new Tasty({
			static: 'test'
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/root/other.html')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			)
			.then(
				() => chai.request(URL1)
					.get('/../package.json')
					.then(
						(response) => {
							expect(response).to.have.status(200);
							expect(response).to.be.json;
							expect(response.body.name).to.equal('tasty');
						}
					)
			)
			.then(
				() => tasty.stop()
			);
	});

	it('catches errors', function() {
		const tasty = new Tasty({
			static: true
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('//')
			)
			.catch(
				(response) => expect(response).to.have.status(403)
			)
			.then(
				() => tasty.stop()
			);
	});
});
