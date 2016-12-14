'use strict';

describe('demo', function() {
	this.timeout(10000);

	const username = tasty.config.username,
		password = tasty.config.password;

	beforeEach(function() {
		reset(false);
		ready('window', 100);

		return queue();
	});

	it('signs user up', function() {
		navigate('/entry.html');
		title('Tasty demo — Signup');
		text('Welcome!');
		click('Username');
		type(username);
		click('Password');
		type(password);
		click('Sign up');
		location('/home.html');
		title('Tasty demo — Home');
		text('Hi, ' + username + '!');

		return queue();
	});

	it('logs user out', function() {
		navigate('/entry.html');
		click('Username');
		type(username);
		click('Password');
		type(password);
		click('Sign up');
		location('/home.html');
		click('Log out');
		location('/entry.html');
		text('Welcome!');

		return queue();
	});

	it('remembers user', function() {
		navigate('/entry.html');
		click('Username');
		type(username);
		click('Password');
		type(password);
		click('Remember me');
		click('Sign up');
		location('/home.html');
		text('Hi, ' + username + '!');
		click('Log out');
		location('/entry.html');
		title('Tasty demo — Login');
		text('Welcome back!');
		text(username);
		click('Password');
		type(password);
		click('Log in');
		location('/home.html');
		text('Hi, ' + username + '!');

		return queue();
	});
});
