var Galaxy = require('./s/galaxy.js');

// Galaxy.G = 0.1;

Galaxy.getBodies = function(width, height) {
	var r = 10,
		R = 100,
		cx = width / 2,
		cy = height / 2; // 252, 150.5

	// alert(cx + ", " + cy);

	var sqrt_3 = Math.sqrt(3);

	var bodies = [
		this.createBall(cx, cy, r),
		this.createBall(cx + R, cy - R/4, r),
		this.createBall(cx - R, cy + R/4, r)
	];

	var v = Math.sqrt(this.G * bodies[0].m.mass / R / Math.sqrt(17) * 4.6) // 2;

	bodies[0].v.x = v;
	bodies[0].v.y = -v;

	bodies[1].v.x = -v/2;
	bodies[1].v.y = v/2;

	bodies[2].v.y = -v/2;
	bodies[2].v.y = v/2;

	return bodies;
};

// Galaxy.onion = true;

Galaxy.init();
