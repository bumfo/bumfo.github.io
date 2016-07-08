'use strict';
var actualHeight = 0;
function testHack() {
	return actualHeight = realHeight(window.scrollY, document.documentElement.scrollHeight);
};
	
function realHeight(top, dh) {
	window.scrollTo(0, dh);
	var actualHeight = dh - window.scrollY;
	window.scrollTo(0, top);
	
	//log(actualHeight + "px");
	
	return actualHeight;
}
function positCaret(x, y) {
	var r;
	
	//	if (0 <= y && y < actualHeight)
	if (document.caretRangeFromPoint)
		r = document.caretRangeFromPoint(x,y);
	else {
		var o = document.caretPositionFromPoint(x,y);

		r = document.createRange();
		r.setStart(o.offsetNode, o.offset);


	}
	
	// if (!r) {
	// 	if (y < 0)
	// 		r = document.caretRangeFromPoint(x, 0);
	// 	else if (y >= actualHeight)
	// 		r = document.caretRangeFromPoint(x, actualHeight-1);
	// }
	
	return r;
}
