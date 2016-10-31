var Canv = require('./canvas.js');
var Shapes = require('./shapes.js');
var Physics = require('./physics.js');

function applyGravity(a, b) {
	var n = b.c.clone().subtract(a.c);
	var d = n.squared;
	if (d > 0) {
		var f = n.multiply(1/Math.sqrt(d)).multiply(1/d * Galaxy.G * a.m.mass * b.m.mass);
		a.f.add(f);
		b.f.subtract(f);
	}
}

var Galaxy = {
	G: 0.025 * 100,

	onion: 1,

	createBall: function(x, y, r) {
		return Physics.Body.create(Shapes.Circle.create(x, y, r));
	},
	getBodies: function() {
		return [];
	},
	init: function() {
		var bodies = this.getBodies(Canv.width, Canv.height);

		var onion = this.onion;

		Canv.update = function(dt) {
			// applyGravity(me, attractor);
			for (var i = 0, n = bodies.length-1; i < n; ++i) {
				for (var j = i+1, m = bodies.length; j < m; ++j) {
					applyGravity(bodies[i], bodies[j]);
				}
			}

			bodies.forEach(function(body) {
				body.integrateForces(dt);
				// body.f.zero();
				// body.com.update(dt);
			});

			// for (var i = 0, n = bodies.length-1; i < n; ++i) {
			// 	for (var j = i+1, m = bodies.length; j < m; ++j) {
			// 		applyGravity(bodies[i], bodies[j]);
			// 	}
			// }

			bodies.forEach(function(body) {
				body.update(dt);
			});

			for (var i = 0, n = bodies.length-1; i < n; ++i) {
				for (var j = i+1, m = bodies.length; j < m; ++j) {
					applyGravity(bodies[i], bodies[j]);
				}
			}

			bodies.forEach(function(body) {
				body.integrateForces(dt);
				body.f.zero();
			});
		};

		Canv.draw = function(ctx) {
			ctx.save();
			if (onion)
				ctx.fillStyle = 'rgba(0,0,0,0.01)';
			else
				ctx.fillStyle = 'rgba(0,0,0,1)';
			
			bodies.forEach(function(body) {
				body.fill(Canv.Drawing);
			});

			ctx.restore();
		};

		Canv.clear = function(ctx) {
			bodies.forEach(function(body) {
				if (!onion)
					body.clear(Canv.Drawing);
			});
		};
	}
};

module.exports = Galaxy;
