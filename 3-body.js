var Galaxy = require('./s/galaxy.js');

Galaxy.getBodies = function(width, height) {
	var r = 10, R = 100, cx = width/2, cy = height/2; // 252, 150.5

	// alert(cx + ", " + cy);

	var sqrt_3 = Math.sqrt(3);

	var bodies = [
		this.createBall(cx-R, cy, r), 
		this.createBall(cx+R/2, cy+sqrt_3*R/2, r), 
		this.createBall(cx+R/2, cy-sqrt_3*R/2, r)
	];

	var v =  Math.sqrt(bodies[0].m.mass*this.G/R/sqrt_3) // 2;

	bodies[0].v.y = v;

	bodies[1].v.x = v/2*sqrt_3;
	bodies[1].v.y = -v/2;

	bodies[2].v.x = -v/2*sqrt_3;
	bodies[2].v.y = -v/2;

	return bodies;
};

// Galaxy.onion = true;

Galaxy.init();
