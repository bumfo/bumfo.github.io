var Canv = require('./canv.js');
var Drawing = require('./drawing.js');

document.head.appendChild(buildMeta('viewport', 'width=device-width, minimum-scale=1.0, maximum-scale=1.0'));


// var width = window.innerWidth, height = window.innerHeight;
var width = window.innerWidth,//document.documentElement.offsetWidth,
	height = window.innerHeight;//document.documentElement.offsetHeight;

var canvas = document.createElement('canvas');
Canv = new Canv(width, height, canvas);
Drawing = new Drawing(Canv.ctx); 
Canv.Drawing = Drawing;
// Canv.update = function(ctx) {};
// Canv.draw = function(ctx) {};
// Canv.clear = function(ctx) {};

function buildMeta(name, content) {
	var meta = document.createElement('meta');
	meta.name = name;
	meta.content = content;
	return meta;
}


window.addEventListener('DOMContentLoaded', function(e) {
	document.body.style.cssText = 'margin: 0; padding: 0; background: #ddd; overflow: hidden; pointer-events: none; -webkit-user-select: none; ';
	document.body.appendChild(canvas);
});

window.addEventListener('touchmove', function(e) { e.preventDefault(); });

requestAnimationFrame(function(t0) {
	var t1 = t0;
	requestAnimationFrame(function frame(t2) {
		var t = t2 - t0,
			dt = t2 - t1;

		// if (Math.random() < 0) {
		// 	requestAnimationFrame(frame);
		// 	return;
		// }

		Canv.clear(Canv.ctx);

		Canv.clearFps();
		Canv.fps(dt);

		Canv.update(dt/1000*60);

		Canv.draw(Canv.ctx);

		t1 = t2;
		requestAnimationFrame(frame);
	});
});

module.exports = Canv;
