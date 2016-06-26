const Reactivum = require('./reactivum.js');

let demoVum = Reactivum({
	input0: 1,
	input: 2,
	result: 3,
}, '#demo');

demoVum.$listen('input', () => {
	demoVum.result = +demoVum.input0 + +demoVum.input;
});
