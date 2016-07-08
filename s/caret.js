function setRange(f) {
	var s = window.getSelection(),
		ro = s.rangeCount > 0 ? s.getRangeAt(0) : document.createRange(),
		r;
	
	r = f(ro);
	
	if (r) {
		s.removeAllRanges();
		s.addRange(r);
		//r.detach();
	}
	
	//if (r !== ro)
	//	ro.detach();
}

function getRange(f) {
	var s = window.getSelection(),
		ro = s.getRangeAt(0),
		r;
	
	r = f(ro);
	
	if (r) {
		s.removeAllRanges();
		s.addRange(r);
		//r.detach();
	}
	
	//if (r !== ro)
		//$ro.detach();
}

function some(a, f, u) {
	if (u === void(0))
		u = false;
	
	for (var i = 0, n = a.length, r; i < n; ++i)
		if ((r = f(a[i], i, n)) !== u)
			return r;
			
	return u;
}

function indexOf(a, n) {
	return Array.prototype.indexOf.call(a, n);
}

function getP(c, div, also) {
	if (div.contains(c) && div !== c) {
		while (c && c.parentNode !== div)
			c = c.parentNode;
			
		return c;
	} else if (also && div === c) {
		return div;
	}
	
	return null;
}


var Caret = function() {
	var TEXT_NODE = Node.TEXT_NODE;

	function some(a, f) {
		for (var i = 0, n = a.length, r; i < n; ++i)
			if ((r = f(a[i], i, n)) !== false)
				return !!r;

		return false;
	}

	function getOffset(container, offset, ref) {
		var cto = offset, cp;
		if (container.nodeType !== TEXT_NODE) offset = 0, some(container.childNodes, function(x, i) {
			if (i === cto) return true;
			offset += x.textContent.length;
			return false;
		});
		return container === ref || ref && !ref.contains(container) ? offset : function get(c, co, cc) {
			var cp = c.parentNode;
			if (c !== cp.firstChild) some(cp.childNodes, function(x) {
				if (x === c) return true;
				co += x.textContent.length;
				return false;
			});
			return cc && cc !== cp && cc.contains(cp) ? get(cp, co, cc) : co;
		}(container, offset, ref);
	}

	function setOffset(ref, offset, setter, flag) {
		var to = offset, container = ref;
		some(ref.childNodes, function(x, i, n) {
			var l = x.textContent.length;

			container = x;

			if (flag) {
				if (to < l) return true;
			} else {
				if (to <= l) return true;
			}

			if (i !== n - 1) to -= l; 
			else if (to > l) {
				to = l;
				log('Insufficient length', ref, offset);
			}

			return false;
		});
		return container === ref || container.nodeType === TEXT_NODE ? (setter(container, to), container) 
			: container = setOffset(container, to, setter, flag);
	}

	return { get: getOffset, set: setOffset };
}();


// var Caret = function(div) {	
// 	function getOffset(c, co, cc) {
// 		if (c.nodeType !== 3) {
// 			var cto = 0;
			
// 			some(c.childNodes, function(x, i) {
// 				if (i === co)
// 					return true;
					
// 				cto += x.textContent.length;
					
// 				return false;
// 			});
			
// 			co = cto;
// 		}
		
// 		if (c === cc || cc && !cc.contains(c))
// 			return co;
			
// 		var cp;	
			
// 		do {
// 			cp = c.parentNode;
		
// 			co = (function() {
// 				if (c === cp.firstChild)
// 					return co;
					
// 				some(cp.childNodes, function(x) {
// 					if (x === c)
// 						return true;
					
// 					co += x.textContent.length;
					
// 					return false;
// 				});
				
// 				return co;
// 			})();
			
// 			c = cp;
// 		} while (cc && cc !== cp && cc.contains(cp))
		
// 		return co;
// 	}
	
// 	function setOffset(cc, co, set, tion) {
// 		var to = co, c = cc;
		
// 		if (!cc) 
// 			return log(cc);
		
// 		some(cc.childNodes, function(x, i, n) {
// 			var l = x.textContent.length;
		
// 			c = x;
			
// 			if (tion) {
// 				if (to < l)
// 					return true;
					
// 				if (to === l && i === n - 1)
// 					;
// 				else
// 					to -= l;
// 			} else {
// 				if (to <= l)
// 					return true;
					
// 				to -= l;
// 			}
				
// 			return false;
// 		});
		
// 		if (c === cc || c.nodeType === 3) {
// 			//log([c, to]);
// 			set(c, to);
// 		} else
// 			c = setOffset(c, to, set, tion);
			
// 		return c;
// 	}
	
// 	function getCaret(r, o) {
// 		var caret;
		
// 		var sc = r.startContainer, 	so = r.startOffset, 
// 			s0 = sc,
// 			tc, si;
		
// 		//si = indexOf(div.children, sc);
		
// 		sc = getP(sc, o || div, !!o);
		
// 		if (!sc)
// 			return null
		
// 		so = getOffset(s0, so, sc);

// 		caret = [so, sc];
		
// 		return caret;
// 	}
	
// 	function setCaret(cc, caret, virtual) {
// 		var so = caret[0];
		
// 		var rtn;
			
// 		setRange(function(r) {
// 			//r = document.createRange();
			
// 			setOffset(cc, so, r.setStart.bind(r), false);
// 			r.collapse(true);
			
// 			if (!virtual)
// 				return r;
// 			else
// 				rtn = r;
// 		});
		
// 		return rtn;
// 	}
	
// 	return {get: getCaret, set: setCaret};
// };
