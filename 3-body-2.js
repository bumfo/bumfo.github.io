var Galaxy = require('./s/galaxy.js');

Galaxy.getBodies = function(width, height) {
	var r = 10,
		R = 100,
		cx = width / 2,
		cy = height / 2; // 252, 150.5

	// alert(cx + ", " + cy);

	var sqrt_3 = Math.sqrt(3);

	var bodies = [
		this.createBall(cx, cy, r),
		this.createBall(cx + R, cy, r),
		this.createBall(cx - R, cy, r)
	];

	var v = Math.sqrt(this.G * bodies[0].m.mass / R * 5/4) // 2;

	bodies[1].v.y = -v;

	bodies[2].v.y = v;

	return bodies;
};

Galaxy.onion = true;

Galaxy.init();
