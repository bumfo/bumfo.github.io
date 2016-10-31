var Drawing = function(ctx) {
	this.ctx = ctx;
};

Drawing.prototype = {
	constructor: Drawing,
	ctx: null,

	setStyle: function(material) {
		if (material.opacity > 0) {
			if (material.opacity !== this.ctx.globalAlpha)
				this.ctx.globalAlpha = material.opacity;
		}
	},

	fill: function(o) {
		o.fill(this);
	},
	fillAABB: function(c, e) {
		this.ctx.fillRect(c.x-e.x, c.y-e.y, e.x*2, e.y*2);
	},
	clearAABB: function(c, e) {
		this.ctx.clearRect(Math.floor(c.x-e.x), Math.floor(c.y-e.y), Math.ceil(e.x)*2+1, Math.ceil(e.y)*2+1);
	},
	fillCircle: function(c, r) {
		this.ctx.beginPath();
		this.ctx.arc(c.x, c.y, r, 0, Math.PI*2);
		this.ctx.fill();
	},
	fillText: function(text, x, y) {
		this.ctx.fillText(text, x, y);
	}
};

module.exports = Drawing;
