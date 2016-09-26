describe('navigate', function() {
	it('navigates', function() {
		this.slow(500);

		navigate('/test.html');
		location('/test.html');
		title('Tasty test');
		navigate('/other.html');
		location('/other.html');
		title('Tasty other');

		return queue();
	});
});

describe('loaded', function() {
	this.timeout(5000);

	it('checks resource', function() {
		this.slow(500);

		navigate('/test.html');
		loaded('/manifest.appcache');
		loaded('/test.css');
		loaded('/test.js');
		navigate('/other.html');
		loaded('/manifest.appcache');
		loaded('/test.css');
		loaded('/test.js');

		return queue();
	});
});

describe('text', function() {
	it('checks text', function() {
		this.slow(500);

		navigate('/test.html');
		text('Test');
		navigate('/other.html');
		text('Other');

		return queue();
	});
});
