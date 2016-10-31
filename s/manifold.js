var Vector = require('./vector.js');

function clamp(x0, x1, x) {
	if (x > x1)
		return x1;
	else if (x < x0)
		return x0;
	else
		return x;
}

function AABBvsCircle(a, b) {
	var m = {};

	// Vector from A to B
	var n = b.c.clone().subtract(a.c);

	// Closest point on A to center of B
	var closest = n.clone();

	// Calculate half extents along each axis
	var x_extent = a.aabb.e.x;
	var y_extent = a.aabb.e.y;

	// Clamp point to edges of the AABB
	closest.x = clamp(-x_extent, x_extent, closest.x);
	closest.y = clamp(-y_extent, y_extent, closest.y);

	var inside = false;

	// Circle is inside the AABB, so we need to clamp the circle's center
	// to the closest edge
	if (n.equals(closest)) {
		inside = true;

		// Find closest axis
		if (Math.abs(n.x) > Math.abs(n.y)) {
			// Clamp to closest extent
			if (closest.x > 0)
				closest.x = x_extent;
			else
				closest.x = -x_extent;
		}

		// y axis is shorter
		else {
			// Clamp to closest extent
			if (closest.y > 0)
				closest.y = y_extent;
			else
				closest.y = -y_extent;
		}
	}

	var normal = n.clone().subtract(closest);
	var d = normal.squared;
	var r = b.r;

	// Early out of the radius is shorter than distance to closest point and
	// Circle not inside the AABB
	if (d > r * r && !inside)
		return false;

	// Avoided sqrt until we needed
	d = Math.sqrt(d);

	// Collision normal needs to be flipped to point outside if circle was
	// inside the AABB
	if (inside) {
		m.normal = normal.normalize().negative();
		m.penetration = r + d;
	} else {
		m.normal = normal.normalize();
		m.penetration = r - d;
	}

	return m;
}

function AABBvsAABB(a, b) {
	var m = {};

	var abox = a,
		bbox = b;

	var n = bbox.c.clone().subtract(abox.c); // b.position - a.position // Vector from a to b

	var x_overlap = abox.e.x + bbox.e.x - Math.abs(n.x);

	// SAT test on x axis
	if (x_overlap > 0) {
		var y_overlap = abox.e.y + bbox.e.y - Math.abs(n.y);

		// SAT test on y axis
		if (y_overlap > 0) {

			// Find out which axis is axis of least penetration
			if (x_overlap < y_overlap) {

				// Point towards B knowing that n points from A to B
				if (n.x < 0)
					m.normal = new Vector(-1, 0);
				else
					m.normal = new Vector(1, 0);
				m.penetration = x_overlap;
				return m;
			} else {

				// Point toward B knowing that n points from A to B
				if (n.y < 0)
					m.normal = new Vector(0, -1);
				else
					m.normal = new Vector(0, 1);
				m.penetration = y_overlap;
				return m;
			}
		}
	}

	return false;
}

function CirclevsCircle(a, b) {
	var n = b.c.clone().subtract(a.c), // b.position - a.position // Vector from a to b
		r = b.r + a.r,
		r2 = r * r,
		n2 = n.squared;

	if (n2 <= r2) {
		var d = Math.sqrt(n2);
		return {
			normal: d === 0 ? Vector.randomUnit() : n.divide(d),
			penetration: r - d
		};
	}

	return false;
}

exports.AABBvsCircle = AABBvsCircle;
exports.AABBvsAABB = AABBvsAABB;
exports.CirclevsCircle = CirclevsCircle;
