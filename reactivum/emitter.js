class Emitter {
	constructor() {
		this._callbacks = new Map();
	}
	on(event, listener) {
		this.getListeners(event).push(listener);
	}
	emitRest(event, ...args) {
		var arr = this.getListeners(event);
		for (var i = 0, n = arr.length; i < n; ++i) {
			arr[i](...args);
		}
	}
	emit(event, e) {
		var arr = this.getListeners(event);
		for (var i = 0, n = arr.length; i < n; ++i) {
			arr[i](e);
		}
	}
	getListeners(event) {
		var listeners = this._callbacks.get(event);
		return listeners || this._callbacks.set(event, listeners = []), listeners;
	}
}

module.exports = Emitter;
