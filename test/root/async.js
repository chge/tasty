'use strict';

setTimeout(function() {
	var body = document.body;
	body.removeChild(body.firstChild);
	body.appendChild(
		document.createTextNode('Async')
	);
}, 5000);
