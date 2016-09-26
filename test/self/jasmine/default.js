describe('navigate', function() {
	it('navigates', function(done) {
		navigate('/test.html');
		location('/test.html');
		title('Tasty test');
		navigate('/other.html');
		location('/other.html');
		title('Tasty other');

		queue(done);
	});
});

describe('loaded', function() {
	it('checks resource', function(done) {
		navigate('/test.html');
		loaded('/manifest.appcache');
		loaded('/test.css');
		loaded('/test.js');
		navigate('/other.html');
		loaded('/manifest.appcache');
		loaded('/test.css');
		loaded('/test.js');

		queue(done);
	});
});

describe('text', function() {
	it('checks text', function(done) {
		navigate('/test.html');
		text('Test');
		navigate('/other.html');
		text('Other');

		queue(done);
	});
});
