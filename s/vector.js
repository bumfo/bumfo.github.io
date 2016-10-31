var Vector = function() {
	function Vector(x, y) {
		this.x = x;
		this.y = y;
	}
	
	Vector.prototype = {
		__proto__: null,
		constructor: Vector,
		
		clone: function() {
			return new Vector(this.x, this.y);
		},
		equals: function(v) {
			return this.x === v.x && this.y === v.y;
		},
		copy: function(v) {
			this.x = v.x;
			this.y = v.y;

			return this;
		},
		copy2: function(x, y) {
			this.x = x;
			this.y = y;

			return this;
		},
		zero: function() {
			this.x = 0;
			this.y = 0;

			return this;
		},
		negative: function() {
			this.x = -this.x;
			this.y = -this.y;

			return this;
		},
		add: function(v) {
			this.x += v.x;
			this.y += v.y;

			return this;
		},
		subtract: function(v) {
			this.x -= v.x;
			this.y -= v.y;

			return this;
		},
		multiply: function(n) {
			this.x *= n;
			this.y *= n;

			return this;
		},
		divide: function(n) {
			this.x /= n;
			this.y /= n;

			return this;
		},
		normalize: function() {
			if (this.length === 0)
				return this.divide(1);
			this.divide(this.length);

			return this;
		},
		rotate: function(v) {
			// this.angle += v.angle;
			
			// this.x = Math.cos(a1+a2)*r;
			// this.y = Math.sin(a1+a2)*r;
			
			// x/r = cos(a1)*cos(a2)-sin(a1)*sin(a2);
			// y/r = sin(a1)*cos(a2)+cos(a1)*sin(a2);
			
			// x/r = x/r*x2/r-y/r*y2/r;
			// y/r = y/r*x2/r+x/r*y2/r;
			
			var x1 = this.x, y1 = this.y,
				x2 = v.x, y2 = v.y;
				
			this.x = x1*x2-y1*y2;
			this.y = y1*x2+x1*y2;
			
			return this;
		},
		mix: function(v, k) {
			this.x = (1-k)*this.x+k*v.x;
			this.y = (1-k)*this.y+k*v.y;

			return this;
		},
		
		dot: function(v) {
			return this.x*v.x+this.y*v.y;
		},
		cross: function(v) {
			return this.x*v.y-v.x*this.y;
		},
		
		get angle() {
			return Math.atan2(this.y, this.x);
		},
		set angle(val) {
			var length = this.length;
			this.x = Math.cos(val)*length;
			this.y = Math.sin(val)*length;
		},
		get angle_v() {
			return Math.atan2(this.x, this.y);
		},
		get length() {
			var x = this.x, y = this.y;
			return Math.sqrt(x*x+y*y);
		},
		set length(val) {
			var length = this.length, scale = val/length;
			
			this.multiply(scale);
		},
		get squared() {
			var x = this.x, y = this.y;
			return x*x+y*y;
		}
	};

	Vector.randomUnit = function() {
		var a = Math.random() * Math.PI * 2;

		return new Vector(Math.cos(a), Math.sin(a));
	};
	
	return Vector;
}();

module.exports = Vector;
