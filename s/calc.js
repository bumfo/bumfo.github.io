'use strict';

function next(str) {
	var i = 0, n = str.length;
	return function next() {
		if (i < n)
			return str[i++];
		else
			return null;
	}
}

var op = {'+':1,'-':1,'*':2,'/':2,'^':3,'@+':4,'@-':4,'@sqrt':4}, rc = {'^':1}, uo = {'@+':1,'@-':1,'@sqrt':1};

function parse(next) {
	var s = [], rstack = [], cur = [], pt = [], stack = rstack, c, q, cu = false;
	while ((c = next()) !== null) {
		if (c === ',') {
			curs();
			while(q = stack.pop())
				s.push(q);
		} else if (c === '(') {
			if (cur.length > 0) {
				stack.push('@'+cur.join(""));
				cur = [];
			}
			pt.push(stack);
			stack = [];
		} else if (c === ')') {
			curs();
			while(q = stack.pop())
				s.push(q);
			stack = pt.pop();
			cu = true;
		} else if (op[c]) {
			if (!curs()) {
				console.log('uninary', c);
				stack.push('@'+c);
			} else {
				while(op[stack[stack.length-1]] > op[c] || !rc[c] && op[stack[stack.length-1]] === op[c])
					s.push(q = stack.pop());
				stack.push(c);
			}
		} else {
			cu = true;
			cur.push(c);
		}
	}

	curs();
	while(q = stack.pop())
		s.push(q);

	function curs() {
		var cuu = cu;
		cu = false;

		if (cur.length > 0) {
			s.push(cur.join(''));
			cur = [];
		}

		return cuu;
	}

	return s;
}

function interpret(s) {
	var stack = [], s = s.slice(), c;

	while (c = s.shift())
		if (op[c]) {
			if (uo[c]) {
				var b = Number(stack.pop());

				switch (c) {
				case '@+': b = +b; break;
				case '@-': b = -b; break;
				case '@sqrt': b = Math.sqrt(b); break;
				}

				stack.push(b);
			} else {
				var b = Number(stack.pop()),
					a = Number(stack.pop());

				switch (c) {
				case '+': stack.push(a+b); break;
				case '-': stack.push(a-b); break;
				case '*': stack.push(a*b); break;
				case '/': stack.push(a/b); break;
				case '^': stack.push(Math.pow(a, b)); break;
				}
			}
		} else
			stack.push(c);

	return stack;
}

var s = parse(next('(1+2)^(3*(2^2))/5'));

console.log(s, interpret(s));
