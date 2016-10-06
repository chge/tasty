const chai = require('chai'),
	expect = chai.expect,
	tasty = require('../..');

const URL = 'http://localhost:5678';

chai.use(require('chai-http'));

describe('static', function() {
	afterEach(function() {
		tasty.finish();
	});

	it('serves by default', function() {
		tasty({
			static: true
		}).start();

		return chai.request(URL)
			.get('/')
			.catch(
				(response) => expect(response).to.have.status(404)
			);
	});

	it('serves from CWD', function() {
		tasty({
			static: true
		}).start();

		return chai.request(URL)
			.get('/package.json')
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.json;
					expect(response.body.name).to.equal('tasty');
				}
			);
	});

	it('serves from given root', function() {
		tasty({
			static: {
				root: 'test/res'
			}
		}).start();

		return chai.request(URL)
			.get('/test.html')
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			);
	});

	it('serves on given URL', function() {
		tasty({
			static: {
				url: 'http://localhost:6789',
				root: 'test/res'
			}
		}).start();

		return chai.request('http://localhost:6789')
			.get('/test.html')
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			);
	});

	it('allows path traversal', function() {
		tasty({
			static: {
				root: 'test'
			}
		}).start();

		return chai.request(URL)
			.get('/res/other.html')
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response).to.be.html;
				}
			)
			.then(
				() => chai.request(URL)
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

	it('catches errors', function() {
		tasty({
			static: true
		}).start();

		return chai.request(URL)
			.get('//')
			.catch(
				(response) => expect(response).to.have.status(403)
			);
	});
});
