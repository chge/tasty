'use strict';

window.onload = function() {
	var form = document.querySelector('form'),
		legend = document.querySelector('legend'),
		button = document.querySelector('button'),
		username = form.elements.username,
		password = form.elements.password,
		remember = form.elements.remember;

	form.onsubmit = function() {
		sessionStorage.session = !!password.value;
		sessionStorage.username = username.value;
		sessionStorage.remember = remember.checked ? true : '';
	};
	button.onclick = function() {
		username.setCustomValidity(
			username.validity.valid ? '' : 'Please fill username.'
		);
		password.setCustomValidity(
			password.validity.valid ? '' : 'Please fill password.'
		);
	};

	if (sessionStorage.username) {
		document.title += ' — Login';
		legend.innerText = 'Welcome back!';
		button.innerText = 'Log in';
		form.elements.username.value = sessionStorage.username;
	} else {
		document.title += ' — Signup';
	}
};
