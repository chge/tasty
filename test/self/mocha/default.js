describe('client.navigate', function() {
	this.timeout(30000);

	it('navigates client', function() {
		this.slow(500);

		client.navigate('/test.html');
		client.location('/test.html');
		dom.title('Tasty test');
		client.navigate('/other.html');
		client.location('/other.html');
		dom.title('Tasty other');

		return queue();
	});
});

describe('dom.loaded', function() {
	this.timeout(30000);

	it('checks resource', function() {
		this.slow(500);

		client.navigate('/test.html');
		dom.loaded('/manifest.appcache');
		dom.loaded('/test.css');
		dom.loaded('/test.js');
		dom.loaded('/favicon.png');
		client.navigate('/other.html');
		dom.loaded('/manifest.appcache');
		dom.loaded('/test.css');
		dom.loaded('/test.js');
		dom.loaded('/favicon.png');

		return queue();
	});
});

describe('dom.text', function() {
	this.timeout(30000);

	it('checks text', function() {
		this.slow(750);

		client.navigate('/test.html');
		dom.text('Test');
		client.navigate('/other.html');
		dom.text('Other');

		return queue();
	});
});
