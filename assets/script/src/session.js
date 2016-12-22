class Session extends EventEmitter {
	constructor(text) {
		super();

		this._tokens = [];
		this._done = false;
		this._open = false;
		this._queryQueue = [];
		this._queryCb = null;

		let wsURL = '://' + location.host + '/websocket';
		if (location.protocol === 'https:') {
			wsURL = 'wss' + wsURL;
		} else {
			wsURL = 'ws' + wsURL;
		}
		this._conn = new WebSocket(wsURL, 'protocolOne');
		this._conn.onerror = () => {
			this.emit('error', 'Failed to connect.');
		};
		this._conn.onopen = () => {
			this._open = true;
			this._conn.onerror = null;
			this._conn.onclose = () => {
				this._open = false;
				if (this._queryCb) {
					this._queryCb('WebSocket closed.', null);
				}
				this._queryQueue.forEach((x) => x.cb('WebSocket closed.', null));
			};
			this._conn.onmessage = (e) => {
				if (this._queryCb) {
					this._queryCb(null, JSON.parse(e.data));
					this._executeQuery(this._queryQueue.shift());
				}
			};
			this._conn.send(JSON.stringify(text));
			this._poll();
		};
	}

	disconnect() {
		this._listeners = {};
		this._conn.close();
	}


	processedTokens() {
		return this._tokens;
	}

	done() {
		return this._done;
	}

	requestTokenInfo(wordIdx) {
		const token = Math.random();
		this._reqToken = token;
		this._query({type: 'suggest', idx: wordIdx}, (err, obj) => {
			if (err) {
				this.emit('infoError', err);
				return;
			}
			if (this._reqToken === token) {
				this.emit('info', obj);
			}
		});
	}

	_poll() {
		this._query({type: 'done'}, (err, done) => {
			if (err) {
				this.emit('error', err);
				return;
			}
			this._query({type: 'tokens'}, (err, toks) => {
				if (err) {
					this.emit('error', err);
					return;
				}
				this._tokens = toks;
				this._done = done;
				if (!done) {
					setTimeout(() => this._poll(), 500);
				}
				this.emit('progress');
			});
		});
	}

	_query(obj, cb) {
		if (!this._open) {
			setTimeout(() => cb('WebSocket closed.', null), 0);
			return;
		}
		const info = {obj: obj, cb: cb};
		if (this._queryCb) {
			this._queryQueue.push(info);
		} else {
			this._executeQuery(info);
		}
	}

	_executeQuery(info) {
		if (!info) {
			this._queryCb = null;
			return;
		}
		this._queryCb = info.cb;
		this._conn.send(JSON.stringify(info.obj));
	}
}
