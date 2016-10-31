var Canv = function(width, height, canvas) {
	var ctx = canvas.getContext('2d');
	var ratio = 0 || (window.devicePixelRatio||1)/(ctx.webkitBackingStorePixelRatio||ctx.backingStorePixelRatio||1);

	canvas.width = width*ratio; canvas.height = height*ratio;
	canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
	ctx.scale(ratio, ratio);

	ctx.lineWidth = 1;//0.5;
	ctx.strokeStyle = 'rgba(0,0,0,0.5)';
	ctx.fillStyle = 'rgba(255,255,255,0.25)';
	ctx.font = '48px avenir next';

	this.canvas = canvas;
	this.ctx = ctx;
	this.width = width;
	this.height = height;
};

Canv.prototype = {
	constructor: Canv,
	fpsLast: 0,
	k: 0.9,
	update: function() {},
	draw: function() {},
	clear: function() {
		this.ctx.clearRect(0, 0, this.width, this.height);
	},
	clearFps: function() {
		this.ctx.clearRect(15, 15, 100, 48 + 15);
	},
	drawFps: function(fps) {
		var txt = Math.round(fps), x = 15, y = 48+15;
		// this.ctx.strokeText(txt, x, y);
		this.ctx.fillText(txt, x, y);
	},
	fps: function(dt) {
		this.drawFps(this.fpsLast=this.fpsLast*this.k+(1000/dt)*(1-this.k));
	}
};

module.exports = Canv;
