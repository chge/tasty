'use strict';

window.onload = function() {
	var session = sessionStorage.session,
		username = sessionStorage.username,
		form = document.querySelector('form'),
		legend = document.querySelector('legend');
	if (!session) {
		window.location = 'enter.html';

		return;
	}

	form.onsubmit = function() {
		if (sessionStorage.remember) {
			delete sessionStorage.session;
		} else {
			sessionStorage.clear();
		}
	};

	document.title += ' — Home';
	legend.innerText = 'Hi, ' + username + '!';
};
