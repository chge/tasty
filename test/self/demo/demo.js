'use strict';

describe('demo', function() {
	this.timeout(10000);

	const username = tasty.config.username,
		password = tasty.config.password;

	beforeEach(function() {
		client.reset(false);
		client.ready('window', 100);

		return queue();
	});

	it('signs user up', function() {
		client.navigate('/entry.html');
		page.title('Tasty demo — Signup');
		page.text('Welcome!');
		input.click('Username');
		input.type(username);
		input.click('Password');
		input.type(password);
		input.click('Sign up');
		client.location('/home.html');
		page.title('Tasty demo — Home');
		page.text('Hi, ' + username + '!');

		return queue();
	});

	it('logs user out', function() {
		client.navigate('/entry.html');
		input.click('Username');
		input.type(username);
		input.click('Password');
		input.type(password);
		input.click('Sign up');
		client.location('/home.html');
		input.click('Log out');
		client.location('/entry.html');
		page.text('Welcome!');

		return queue();
	});

	it('remembers user', function() {
		client.navigate('/entry.html');
		input.click('Username');
		input.type(username);
		input.click('Password');
		input.type(password);
		input.click('Remember me');
		input.click('Sign up');
		client.location('/home.html');
		page.text('Hi, ' + username + '!');
		input.click('Log out');
		client.location('/entry.html');
		page.title('Tasty demo — Login');
		page.text('Welcome back!');
		page.text(username);
		input.click('Password');
		input.type(password);
		input.click('Log in');
		client.location('/home.html');
		page.text('Hi, ' + username + '!');

		return queue();
	});
});
