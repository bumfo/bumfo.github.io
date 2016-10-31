var Vector = require('./vector.js');

var GRAVITY = 0.01;

var Physics = function() {};

var MassData = function(mass) { // inertia
	this.mass = mass;
	if (mass === 0)
		this.im = 0;
	else
		this.im = 1/mass;
	// this.inertia = inertia;
	// this.inertia_inv = 1/inertia;
};

MassData.prototype.update = function() {
	this.im = 1/this.mass;
};

var Material = function(density, restitution, opacity) {
	this.density = density;
	this.restitution = restitution;
	this.opacity = opacity;
};

Material.prototype.clone = function() {
	return new Material(this.density, this.restitution, this.opacity);
};

Material.default = new Material(0.1, 0.5, 0.5) ; // .0001 //(1, 0.8125, 0.5); // 1 0.1 0.5

var MassPoint = function(c, m, v, f) {
	this.c = c; // Vector
	this.m = m; // MassData
	this.v = v; // Vector
	this.f = f; // Vector
};

MassPoint.create = function(c, m) {
	return new MassPoint(c, new MassData(m), new Vector(0, 0), new Vector(0, 0));
};

MassPoint.prototype.integrateForces = function(dt) {
	var im = this.m.im;

	if (im === 0)
		return;

	this.v.add(this.f.multiply(0.5*this.m.im*dt));
	// this.v.y += 0.5*GRAVITY;
};

MassPoint.prototype.applyImpulse = function(imp) {
	this.v.add(imp.clone().multiply(this.m.im));
};

MassPoint.prototype.update = function(dt) {
	this.c.add(this.v.clone().multiply(dt));

	// this.integrateForces(dt);

	// this.f.zero();
};

var Body = function(shape, material, com) {
	this.shape = shape; // Shape
	this.material = material; // Material
	this.com = com; // MassPoint

	this.c = com.c;
	this.v = com.v;
	this.f = com.f;
	this.m = com.m;
};

Body.create = function(shape, material) {
	return new Body(shape, material = material || Material.default.clone(), MassPoint.create(shape.c, shape.getVolume()*material.density));
};

var verticalNormal = new Vector(0, 1);

Body.prototype.update = function(dt) {
	// this.shape.update(function() {
	// 	// this.com.m.mass = this.shape.getVolume()*this.material.density;
	// 	// this.com.m.update();

	// 	this.material.density = this.com.m.mass/this.shape.getVolume();
	// 	this.material.opacity = 1-1/(this.material.density);

	// 	if (this.material.opacity < 0)
	// 		this.material.opacity = 1-1/(1-this.material.opacity);
	// }.bind(this));

	var l = this.f.dot(verticalNormal);

	// this.shape.comment = l === 0 ? '' : l < 0 ? '-' + Math.abs(Math.round(l)) : ' ' + Math.round(l);
	this.com.update(dt);
};

Body.prototype.integrateForces = function(dt) {
	this.com.integrateForces(dt);
};

Body.prototype.applyImpulse = function(imp) {
	this.com.applyImpulse(imp);
};

Body.prototype.detectImpact = function(b) {
	var a = this;
	var m = a.shape.vs(b.shape);

	if (m !== false) {
		m.a = a; m.b = b;
		return applyImpact(m);
	}
};

// Body.prototype.applyImpact = function(m) { // b, n, p
// 	applyImpact(m);
// };

Body.prototype.bounceOnEdge = function(rect) {
	var e = this.material.restitution;

	if (this.c.x < rect.x1 && this.v.x < 0) {
		// this.f.x += -this.v.x * (1+e) * this.m.mass;
		this.v.x += -this.v.x * (1+e);
		// this.v.x = -this.v.x * e;
		this.c.x = rect.x1;
	}
	if (this.c.x > rect.x2 && this.v.x > 0) {
		// this.f.x += -this.v.x * (1+e) * this.m.mass;
		this.v.x += -this.v.x * (1+e);
		// this.v.x = -this.v.x * e;
		this.c.x = rect.x2;
	}
	if (this.c.y < rect.y1 && this.v.y < 0) {
		// this.f.y += -this.v.y * (1+e) * this.m.mass;
		this.v.y += -this.v.y * (1+e);
		// this.v.y = -this.v.y * e;
		this.c.y = rect.y1;
	}
	if (this.c.y > rect.y2 && this.v.y > 0) {
		// this.f.y += -this.v.y * (1+e) * this.m.mass;
		this.v.y += -this.v.y * (1+e);
		// this.v.y = -this.v.y * e;
		this.c.y = rect.y2;
	}
};

Body.prototype.fill = function(g) {
	g.setStyle(this.material);

	this.shape.fill(g);
};

Body.prototype.clear = function(g) {
	this.shape.clear(g);
};

function forEachManifold(bodies, fn) {
	for (var i = 0, n = bodies.length - 1; i < n; ++i) {
		for (var j = i + 1, m = bodies.length; j < m; ++j) {
			fn(bodies[i], bodies[j]);
		}
	}
}

function fixPenetration(m) {
	var a = m.a, b = m.b, n = m.normal, p = m.penetration;

	var ma = 1/(a.m.im + b.m.im);
	var pd = n.clone().multiply(p * ma);

	a.c.subtract(pd.clone().multiply(a.m.im));
	b.c.add(pd.clone().multiply(b.m.im));

	// var imp = pd.clone().divide(ma/100);

	// a.f.subtract(imp);
	// b.f.add(imp);
};

function applyImpact(m) {
	var a = m.a, b = m.b, n = m.normal, p = m.penetration;

	var ma = 1/(a.m.im + b.m.im);
	var impulse = a.v.clone().subtract(b.v).multiply(ma);

	var dim = n.dot(impulse);

	if (dim < 0)
		return;

	// console.log(pd.clone().multiply(a.m.im).length + pd.clone().multiply(b.m.im).length - p);

	// a.c.subtract(pd.clone().multiply(a.m.im));
	// b.c.add(pd.clone().multiply(b.m.im));

	var e = Math.min(a.material.restitution, b.material.restitution);

	var imp = n.clone().multiply((1+e)*dim);

	// a.f.subtract(imp);
	// b.f.add(imp);

	b.applyImpulse(imp);
	a.applyImpulse(imp.clone().negative());

	// console.log(a.f);

	return m;
}

module.exports = Physics;

Physics.Material = Material;
Physics.MassPoint = MassPoint;
Physics.Body = Body;

Physics.forEachManifold = forEachManifold;
Physics.detectImpact = function(a, b) {
	return a.detectImpact(b);
};
Physics.fixPenetration = fixPenetration;
