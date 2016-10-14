'use strict';

document.readyState === 'loading' ?
	document.addEventListener('DOMContentLoaded', ready) :
	ready();

function ready() {
	var input = document.getElementsByTagName('input')[0];
	input.autoFocus ||
		input.focus();
}