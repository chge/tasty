const chai = require('chai'),
	expect = chai.expect,
	tasty = require('../..');

const URL = 'http://localhost:8765';

chai.use(require('chai-http'));

describe('server', function() {
	afterEach(function() {
		tasty.finish();
	});

	it('listens by default', function() {
		tasty().start();

		return chai.request(URL)
			.get('/tasty.js')
			.catch(
				(response) => {
					expect(response).to.have.status(200);
					expect(response.body).to.be.ok;
				}
			);
	});

	it('listens on given URL', function() {
		tasty({
			server: 'http://localhost:9876'
		}).start();

		return chai.request('http://localhost:9876')
			.get('/socket.io.js')
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response.body).to.be.ok;
				}
			);
	});

	it('listens on given URL alternatively', function() {
		tasty({
			server: {
				url: 'http://localhost:9876'
			}
		}).start();

		return chai.request('http://localhost:9876')
			.get('/socket.io.js')
			.then(
				(response) => {
					expect(response).to.have.status(200);
					expect(response.body).to.be.ok;
				}
			);
	});

	it('responds with text on root', function() {
		tasty().start();

		return chai.request(URL)
			.get('/')
			.catch(
				(response) => {
					expect(response).to.have.status(400);
				}
			);
	});

	it('catches errors', function() {
		tasty().start();

		return chai.request(URL)
			.get('/exec.js')
			.catch(
				(response) => expect(response).to.have.status(404)
			);
	});
});
