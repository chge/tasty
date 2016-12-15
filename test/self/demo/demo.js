'use strict';

describe('demo', function() {
	this.timeout(10000);

	const username = tasty.config.username,
		password = tasty.config.password;

	beforeEach(function() {
		reset(false);
		ready('window', 100);

		return now();
	});

	it('signs user up', function() {
		navigate('/entry.html');
		is(title('Tasty demo — Signup'));
		is('Welcome!');
		click('Username');
		type(username);
		click('Password');
		type(password);
		click('Sign up');
		is(location('/home.html'));
		is(title('Tasty demo — Home'));
		is('Hi, ' + username + '!');

		return now();
	});

	it('logs user out', function() {
		navigate('/entry.html');
		click('Username');
		type(username);
		click('Password');
		type(password);
		click('Sign up');
		is(location('/home.html'));
		click('Log out');
		is(location('/entry.html'));
		is('Welcome!');

		return now();
	});

	it('remembers user', function() {
		navigate('/entry.html');
		click('Username');
		type(username);
		click('Password');
		type(password);
		click('Remember me');
		click('Sign up');
		is(location('/home.html'));
		is('Hi, ' + username + '!');
		click('Log out');
		is(location('/entry.html'));
		title('Tasty demo — Login');
		is('Welcome back!');
		is(username);
		click('Password');
		type(password);
		click('Log in');
		is(location('/home.html'));
		is('Hi, ' + username + '!');

		return now();
	});
});
