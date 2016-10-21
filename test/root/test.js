'use strict';

window.onload = function() {
	var input = document.getElementsByTagName('input')[0];
	input.autoFocus ||
		input.focus();

	var button = document.getElementsByTagName('button')[0];
	button.onclick = function() {
		button.innerHTML = 'Pressed';
	};

	var span = document.getElementsByTagName('span')[0];
	span.ondblclick = function() {
		span.innerHTML = 'Triple';
	};

	var link = document.getElementsByTagName('a')[0];
	link.onmouseover = function() {
		link.innerHTML = 'Hovered';
	};
};
