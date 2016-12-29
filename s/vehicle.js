'use strict';

var Draw, Initiable, Matter, Vehicle, Projectile, Bullet, Missile, Gas;

(function() {
	Initiable = function() {
		var Initiable = function(options) {
			this.init(options);
		};

		Initiable.prototype = {
			init: function() {}
		}

		return Initiable;
	}();

	Matter = function() {
		var Matter = function() {};

		var defaults = {
			pos: null,
			velocity: null,
			heading: 0,
			acceleration: 0.02,
			fraction: 0.99,		// k = (1-fraction)/fraction = 1/99, speedMax = acceleration/k = 0.02*99 = 1.98
			spin: 0.01,			// speed = acceleration/sqrt(k^2+spin^2) = 0.02/sqrt((1/99)^2+0.01^2) = 1.407089196
								// R = acceleration/(spin*sqrt(k^2+spin^2))
			size: 20,

			bounce: true
		};

		Matter.prototype = {
			constructor: Matter,
			init: function(options) {
				extendWith(this, defaults);

				this.velocity = [0,0];
				this.pos = [0,0];

				extendWith(this, options||{}, defaults);
			},
			update: function() {
				this.pos[0] += this.velocity[0];
				this.pos[1] += this.velocity[1];

				this.velocity[0] += this.acceleration * Math.cos(this.heading);
				this.velocity[1] += this.acceleration * Math.sin(this.heading);

				this.velocity[0] *= this.fraction;
				this.velocity[1] *= this.fraction;

				this.heading += this.spin;

				if (this.bounce) {
					if (this.pos[0] > this.fieldWidth || this.pos[0] < 0) {
						this.velocity[0] = -this.velocity[0];
						this.pos[0] = Math.min(Math.max(0, this.pos[0]), this.fieldWidth);
					}

					if (this.pos[1] > this.fieldHeight || this.pos[1] < 0) {
						this.velocity[1] = -this.velocity[1];
						this.pos[1] = Math.min(Math.max(0, this.pos[1]), this.fieldHeight);
					}
				}


			},
			draw: function() {
				this.speed = Math.sqrt(Math.pow(this.velocity[0], 2) + Math.pow(this.velocity[1], 2));
				Draw.body(this.pos[0], this.pos[1], this.heading, this.size, Math.round(this.speed*10000)/10000);
			}
		}

		return Matter = inherit(Matter, Initiable);
	}();

	Vehicle = function() {
		var Vehicle = function() {};

		var defaults = {
			fieldWidth: 0,
			fieldHeight: 0
		};

		function rand2() {
			return Math.random()-Math.random();
		}

		Vehicle.prototype = {
			init: function(options) {
				Vehicle.super.prototype.init.call(this, options);

				extendWith(this, defaults);
				extendWith(this, options||{}, defaults);

				var padding = Math.min(this.fieldWidth, this.fieldHeight) * 0.2;

				var initialSpeed = 5;

				this.velocity = [initialSpeed*rand2(),initialSpeed*rand2()];
				this.pos = [padding+(this.fieldWidth-padding*2)*Math.random(),padding+(this.fieldHeight-padding*2)*Math.random()];
			},
			update: function() {
				Vehicle.super.prototype.update.call(this);
			}
		};

		return Vehicle = inherit(Vehicle, Matter);
	}();

	Projectile = function() {
		var Projectile = function() {};

		var defaults = {
			fraction: 0.99,
			acceleration: 0,

			initialPos: [0,0],
			initialVelocity: [0,0],

			fieldWidth: 0,
			fieldHeight: 0,

			initialSpeed: 10,
			size: 4,

			spin: 0,

			exploded: false,
			exploding: -1,

			explodingTime: 20
		};

		Projectile.prototype = {
			init: function(options) {
				Projectile.super.prototype.init.call(this, options);

				extendWith(this, defaults);
				extendWith(this, options||{}, defaults);

				this.pos[0] = this.initialPos[0];
				this.pos[1] = this.initialPos[1];

				// this.initialSpeed += Math.random() * 10;

				var cos = Math.cos(this.heading), sin = Math.sin(this.heading);
				this.velocity = [this.initialSpeed*cos,this.initialSpeed*sin];

				this.velocity[0] += this.initialVelocity[0];
				this.velocity[1] += this.initialVelocity[1];
			},
			update: function() {
				Projectile.super.prototype.update.call(this);

				// if (this.pos[0] >= this.fieldWidth || this.pos[0] <= 0) {
				// 	this.velocity[0] = -this.velocity[0];
				// }

				// if (this.pos[1] >= this.fieldHeight || this.pos[1] <= 0) {
				// 	this.velocity[1] = -this.velocity[1];
				// }

				this.speed = Math.sqrt(Math.pow(this.velocity[0], 2) + Math.pow(this.velocity[1], 2));

				if (this.exploding === -1 && this.speed < 0.1)
					this.explode();

				

				if (this.exploding > 0) {
					--this.exploding;

					this.size += 4;
				}

				if (this.exploding === 0) {
					this.exploded = true;
				}

				if (this.exploded)
					this.delete();

				// if (this.pos[0] >= this.fieldWidth || this.pos[0] <= 0 || this.pos[1] >= this.fieldHeight || this.pos[1] <= 0) {
				// 	this.delete();
				// }
			},
			draw: function() {
				
				// this.speedMax = this.acceleration/((1-this.fraction)/this.fraction);

				// console.log(this.speed,this.speedMax);

				var opacity = this.speed/this.initialSpeed;

				if (this.exploding > 0) {
					opacity = this.exploding/this.explodingTime;
				}

				Draw.body(this.pos[0], this.pos[1], this.heading, this.size, Math.round(this.speed*10000)/10000, opacity, this.exploding !== -1);
			},
			delete: function() {},
			explode: function() {
				if (this.exploding === -1)
					this.exploding = this.explodingTime;
			}
		};

		return Projectile = inherit(Projectile, Matter);
	}();

	Bullet = function() {
		var Bullet = function() {};

		return Bullet = inherit(Bullet, Projectile);
	}();

	Missile = function() {
		var Missile = function() {};

		var defaults = {
			fraction: 0.999,//0.99,//0.97,
			acceleration: 0.1,

			aMax: 0.3, 

			initialSpeed: 0,//0,
			size: 4,

			target: null,

			// bounce: false,

			timespan: 0
		};

		var PI = Math.PI, PI2 = PI*2;

		// (-PI, PI]
		function smartTurn(x) {
			return -((-x % PI2 + PI2 + PI) % PI2 - PI);
		}

		Missile.prototype = {
			init: function(options) {
				Missile.super.prototype.init.call(this, extend({}, defaults, options));

				extendWith(this, defaults);
				extendWith(this, options||{}, defaults);
			},
			update: function() {
				if (this.timespan > 3000)
					this.explode();

				if (this.exploded)
					return;
				else if (this.exploding >= 0)
					this.fraction = 0.99 * 4/this.size;

				this.timespan++;


				var speed = Math.sqrt(Math.pow(this.velocity[0], 2) + Math.pow(this.velocity[1], 2));

				var aMax = this.aMax,//Math.max(this.aMax, Math.min(speed*0.05, this.aMax*200)), 
					omegaMax = 3/180*Math.PI;

				var k = (1-this.fraction)/this.fraction, 
					speedMin = aMax/Math.sqrt(Math.pow(k,2)+Math.pow(omegaMax,2)),
					rMin = speedMin/omegaMax;

				

				this.speedMax = aMax/k;

				var co0 = [0,0], co = [0,0], 
					target = this.target;

				this.acceleration = 0;

				if (target !== null) {
					co0[0] = target.pos[0] - this.pos[0];
					co0[1] = target.pos[1] - this.pos[1];

					var distance0 = Math.sqrt(Math.pow(co0[1], 2) + Math.pow(co0[0], 2));

					var tt = Math.min(100,distance0)/Math.max(speedMin, speed);

					co[0] = co0[0]; 
					co[1] = co0[1]; 

					co[0] += target.velocity[0]*tt;
					co[1] += target.velocity[1]*tt;

					// if (this.exploding === -1)
						// Draw.body(co[0] + this.pos[0], co[1] + this.pos[1], target.heading, target.size, Math.round(target.speed*10000)/10000, 1, target.exploding !== -1);

					var distance = Math.sqrt(Math.pow(co[1], 2) + Math.pow(co[0], 2)),
						phi =  Math.atan2(co[1], co[0]),
						vAngle = Math.atan2(this.velocity[1], this.velocity[0]),
						alpha = smartTurn(phi - vAngle), 
						beta = Math.abs(PI/2 - Math.abs(alpha)),
						r = distance/(2*Math.cos(beta)),
						R = Math.abs(alpha) > 60/180*Math.PI ? rMin : r; //15

					if (r < rMin) {
						var RR = rMin*3, d = distance;
						R = (Math.pow(RR, 2)-Math.pow(d, 2))/2/(RR-d*Math.cos(beta));
						// R = rMin + distance/2;

						// this.color = 'red';
					} else {
						this.color = 'white';
					}

					var speedExpected = Math.sqrt((R*Math.sqrt(Math.pow(R,2)*Math.pow(k,4)+4*Math.pow(aMax,2))-Math.pow(R,2)*Math.pow(k,2))/2);

					

					// if (isNaN(speed))
						// speed = speedMin;

					// speedExpected = Math.max(speedMin, (9*speedExpected+1*speed)/10);


					var aRadial = Math.max(0, Math.pow(speedExpected,2)/R);
						// aTangential = k*speedExpected;

					var aTMax = Math.sqrt(Math.pow(aMax, 2)-Math.pow(aRadial, 2));


					// for (var iii = 0; iii < 10; iii++) {
						var aTangential = Math.min(Math.max(-aTMax*10, speedExpected/this.fraction-speed), aTMax);
						// var aRadial = Math.max(0, Math.pow(this.fraction*(speed+aTangential),2)/R);
					// }

					if (alpha < 0)
						aRadial = -aRadial;

					// aTangential = 0;

					// console.log(alpha);

					var aAngle = Math.atan2(aRadial, aTangential);

					

					this.acceleration = Math.min(Math.sqrt(Math.pow(aRadial, 2) + Math.pow(aTangential, 2)), aMax);
					this.heading = vAngle + aAngle;//Math.min(Math.max(aAngle, -rate), rate);

					if (distance0 < 20) {
						this.explode();
						if (this.target.explode)
							this.target.explode();
					}
				} else {
					this.explode();
				}

				Missile.super.prototype.update.call(this);



				if (this.exploding >= 0)
					return;

				

				var self = this;

				function gas(i) {
					var initialVelocity = [self.velocity[0]*0.1*(1+i), self.velocity[1]*0.1*(1+i)];

					var gas = new Gas({
						initialPos: self.pos, 
						initialVelocity: initialVelocity, 
						initialSpeed: self.acceleration*(1+1.2*i+2*Math.random()),// + self.acceleration*10*Math.random(),
						heading: smartTurn(Math.PI+self.heading),

						fieldWidth: self.fieldWidth,
						fieldHeight: self.fieldHeight,

						size: 2,//1.5+1.5*Math.random(),

						lifetime: (60+(60+i*60)*(Math.random()))/6,

						color: self.color
					});

					self.gas(gas);
				}

				for (var i = 0, n = 3+3*Math.random(); i < n; ++i) {
					gas(i/2);
				}

				
			},
			gas: function() {

			},
			draw: function() {
				var opacity = 0.5 + this.speed/this.speedMax;

				if (this.exploding > 0) {
					opacity = this.exploding/this.explodingTime;
				}

				Draw.body(this.pos[0], this.pos[1], smartTurn(Math.PI+this.heading), this.size, Math.round(this.speed*10000)/10000, opacity, this.exploding !== -1, this.color);
			}

			// update: function() {
				// 	if (this.exploded) {
				// 		return;
				// 	}

				// 	if (this.exploding >= 0) {
				// 		this.fraction = 0.99 * 4/this.size;
				// 	}


				// 	Missile.super.prototype.update.call(this);

				// 	var co = [0,0], target = this.target;

				// 	var aMax = 0.3, rate = (3)/180*Math.PI;

				// 	if (target !== null) {
				// 		co[0] = target.pos[0] - this.pos[0];
				// 		co[1] = target.pos[1] - this.pos[1];

				// 		var distance = Math.sqrt(Math.pow(co[1], 2) + Math.pow(co[0], 2));

				// 		var vAngle = Math.atan2(this.velocity[1], this.velocity[0]);

				// 		var phi =  Math.atan2(co[1], co[0]); //2

				// 		var alpha = smartTurn(phi - vAngle), beta = Math.abs(PI/2 - Math.abs(alpha));

				// 		var speed = Math.sqrt(Math.pow(this.velocity[0], 2) + Math.pow(this.velocity[1], 2));

				// 		var k = (1-this.fraction)/this.fraction;

				// 		var speedMax = aMax/k;
				// 		var speedTurn = aMax/Math.sqrt(Math.pow(k,2)+Math.pow(rate,2));

				// 		var rMin = speedTurn/rate;// speed/rate
				// 		var r = distance/(2*Math.cos(beta));

				// 		// console.log(rMin);

				// 		var R = Math.min(rMin, r);

				// 		if (r < rMin)
				// 			R = rMin + distance/2;

				// 		// console.log(speedTurn);

				// 		// R = Math.max(R, 0.1/Math.sqrt(Math.pow(k, 2)+Math.pow(rate, 2)));

				// 		var newSpeed = Math.min(speedTurn, speed);

				// 		var aRadial = Math.pow(newSpeed,2)/R, 
				// 			// aTangential = k*speedTurn;
				// 			aTangential = Math.min(k*speedTurn, Math.sqrt(Math.pow(aMax,2)-Math.pow(aRadial,2)));

				// 		var aAngle = Math.atan2(aRadial, aTangential);

				// 		if (alpha < 0)
				// 			aAngle = -aAngle;

						

				// 		this.acceleration = Math.min(Math.sqrt(Math.pow(aRadial, 2) + Math.pow(aTangential, 2)), aMax);

				// 		this.heading = vAngle + aAngle;//Math.min(Math.max(aAngle, -rate), rate);

				// 		if (distance < 20)
				// 			this.explode();
				// 	}
			// }
		};

		return Missile = inherit(Missile, Projectile);
	}();

	Gas = function() {
		var Gas = function() {};

		var defaults = {
			fraction: 0.9,//0.999,//0.9,
			acceleration: 0,

			initialPos: [0,0],
			initialVelocity: [0,0],

			fieldWidth: 0,
			fieldHeight: 0,

			initialSpeed: 10,
			size: 2,

			timespan: 0,
			lifetime: 60,

			bounce: 0,

			color: 'white'
		};

		Gas.prototype = {
			init: function(options) {
				Gas.super.prototype.init.call(this, options);

				extendWith(this, defaults);
				extendWith(this, options||{}, defaults);

				this.pos[0] = this.initialPos[0];
				this.pos[1] = this.initialPos[1];

				var cos = Math.cos(this.heading), sin = Math.sin(this.heading);
				this.velocity = [this.initialSpeed*cos,this.initialSpeed*sin];

				var initialVelocity = [this.initialVelocity[0], this.initialVelocity[1]];

				// initialVelocity[0] += (2*Math.random()-1)/5;
				// initialVelocity[1] += (2*Math.random()-1)/5;

				this.velocity[0] += initialVelocity[0];
				this.velocity[1] += initialVelocity[1];
			},
			update: function() {
				if (this.timespan >= this.lifetime) {
					this.delete();
					return;
				}

				// this.velocity[0] += (2*Math.random()-1)/7;
				// this.velocity[1] += (2*Math.random()-1)/7;

				var randomForceR = (2*Math.random()-1)/5, randomForceT = (2*Math.random()-1)/10;

				var ivAngleT = Math.atan2(this.initialVelocity[1], this.initialVelocity[0]), 
					ivAngleR = ivAngleT + Math.PI/2;

				this.velocity[0] += randomForceR * Math.cos(ivAngleR) + randomForceT * Math.cos(ivAngleT);
				this.velocity[1] += randomForceR * Math.sin(ivAngleR) + randomForceT * Math.sin(ivAngleT);

				Gas.super.prototype.update.call(this);

				this.timespan++;

				// this.size += 0.03*(1.5*Math.random()-0.5);
				// if (this.size < 0.5)
				// 	this.size = 0.5;
			},
			draw: function() {
				var opacity = Math.max(0, Math.min(1 - this.timespan/this.lifetime, 1)) / 4;

				Draw.gas(this.pos[0], this.pos[1], this.heading, this.size, opacity, this.color);
			},
		};

		return Gas = inherit(Gas, Matter);
	}();
}());
