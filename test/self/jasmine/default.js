describe('client.navigate', function() {
	it('navigates client', function(done) {
		client.navigate('/test.html');
		client.location('/test.html');
		dom.title('Tasty test');
		client.navigate('/other.html');
		client.location('/other.html');
		dom.title('Tasty other');

		queue(done);
	}, 30000);
});

describe('dom.loaded', function() {
	it('checks resource', function(done) {
		client.navigate('/test.html');
		dom.loaded('/manifest.appcache');
		dom.loaded('/test.css');
		dom.loaded('/test.js');
		client.navigate('/other.html');
		dom.loaded('/manifest.appcache');
		dom.loaded('/test.css');
		dom.loaded('/test.js');

		queue(done);
	}, 30000);
});

describe('dom.text', function() {
	it('checks text', function(done) {
		client.navigate('/test.html');
		dom.text('Test');
		client.navigate('/other.html');
		dom.text('Other');

		queue(done);
	}, 30000);
});
