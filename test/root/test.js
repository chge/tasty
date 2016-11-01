'use strict';

window.onload = function() {
	var input = document.querySelector('input');
	input.autoFocus ||
		input.focus();

	var button = document.querySelector('button');
	button.onclick = function() {
		button.innerHTML = 'Pressed';
	};

	var double = document.querySelector('span');
	double.ondblclick = function() {
		double.innerHTML = 'Triple';
	};

	var deep = document.querySelector('div span');
	deep.onclick = function() {
		deep.innerHTML = 'Purple';
	};

	var link = document.querySelector('a');
	link.onmouseover = function() {
		link.innerHTML = 'Hovered';
	};
};
