'use strict';

const chai = require('chai'),
	expect = chai.expect,
	Tasty = require('../..');

const URL1 = 'http://localhost:8765',
	URL2 = 'http://localhost:6789';

chai.use(require('chai-http'));

describe('static', function() {
	let tasty;
	afterEach(
		() => tasty && tasty.stop().catch(() => {})
	);

	it('serves by default', function() {
		tasty = new Tasty({
			static: true
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/')
			)
			.catch(
				(response) => expect(response).to.have.status(400)
			);
	});

	it('serves from CWD', function() {
		tasty = new Tasty({
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
			);
	});

	it('serves from given root', function() {
		tasty = new Tasty({
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
			);
	});

	it('serves on given URL', function() {
		tasty = new Tasty({
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
			);
	});

	it('allows path traversal', function() {
		tasty = new Tasty({
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
			);
	});

	it('serves index from root', function() {
		tasty = new Tasty({
			static: 'test/root',
			staticIndex: 'test/root/test.html'
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			);
	});

	it('serves index instead of 404', function() {
		tasty = new Tasty({
			static: 'test/root',
			staticIndex: 'test/root/test.html'
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('/nonexistent')
			)
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			);
	});

	it('catches errors', function() {
		tasty = new Tasty({
			static: true
		});

		return tasty.start()
			.then(
				() => chai.request(URL1).get('//')
			)
			.catch(
				(response) => expect(response).to.have.status(403)
			);
	});
});
