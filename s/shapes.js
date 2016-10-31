var Vector = require('./vector.js');
var Manifold = require('./manifold.js');
var Drawing = require('./drawing.js');

var OBB = function(c, u, e) {
	this.c = c;
	this.u = u;
	this.e = e;
};

var AABB = function(c, e) {
	this.c = c;
	this.e = e;

	// this.min = c.clone().subtract(e);
	// this.max = c.clone().add(e);

	this.aabb = this;
};

AABB.create = function(cx, cy, ex, ey) {
	return new AABB(new Vector(cx, cy), new Vector(ex, ey));
};

AABB.prototype = {
	constructor: AABB,

	getVolume: function() {
		return 4 * this.e.x * this.e.y;
	},

	update: function() {
		// var c = this.c,
		// e = this.e;

		// this.min.x = c.x-e.x;
		// this.min.y = c.y-e.y;
		// this.max.x = c.x+e.x;
		// this.max.y = c.y+e.y;
	},
	vs: function(o) {
		return o.vsAABB(this);
	},
	vsAABB: function(a) {
		return Manifold.AABBvsAABB(a, this);
	},
	vsCircle: function(a) {
		var m = Manifold.AABBvsCircle(this, a);

		return m && (m.normal.negative(), m); // b, a -> a, b
	},

	fill: function(g) {
		g.fillAABB(this.c, this.e);
		// g.fillText(this.comment, this.c.x-this.e.x, this.c.y);
	},
	clear: function(g) {
		g.clearAABB(this.c, this.e);
	}
};

var Circle = function(c, r) {
	this.c = c;
	this.r = r;

	this._r = r;

	this.aabb = new AABB(this.c, new Vector(this.r, this.r));
};

Circle.create = function(cx, cy, r) {
	return new Circle(new Vector(cx, cy), r);
};

Circle.prototype = {
	constructor: Circle,

	getVolume: function() {
		return Math.PI * this.r * this.r;
	},

	update: function(on_change_r) {
		this.aabb.e.x = this.r;
		this.aabb.e.y = this.r;

		if (this._r !== this.r)
			on_change_r();

		this._r = this.r;

		this.aabb.update();
	},
	vs: function(b) {
		return b.vsCircle(this);
	},
	vsCircle: function(a) {
		return Manifold.CirclevsCircle(a, this);
	},
	vsAABB: function(a) {
		return Manifold.AABBvsCircle(a, this);
	},


	fill: function(g) {
		g.fillCircle(this.c, this.r);
	},
	clear: function(g) {
		this.aabb.clear(g);
	}
};


module.exports = {
	AABB: AABB,
	Circle: Circle
};
