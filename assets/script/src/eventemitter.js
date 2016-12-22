class EventEmitter {
	constructor() {
		this._listeners = {};
	}

	on(name, listener) {
		const listeners = this._listeners[name];
		if (!listeners) {
			this._listeners[name] = [listener];
		} else {
			listeners.push(listener);
		}
	}

	emit(name) {
		const listeners = this._listeners[name];
		const a = Array.prototype.slice.call(arguments, 1);
		listeners.slice().forEach((f) => f.apply(null, a));
	}
}
