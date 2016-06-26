let isReady = false;
let readyList = [];

window.addEventListener('DOMContentLoaded', () => {
	isReady = true;
	readyList.forEach(fn => fn());
	readyList = null;
});

function ready(fn) {
	if (isReady) {
		fn();
	} else {
		readyList.push(fn);
	}
}

module.exports = ready;
