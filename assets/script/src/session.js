class Session extends EventEmitter {
	constructor(text) {
		super();

		// TODO: implement this for real using WebSockets
		// and a neural network on the back-end.

		this._tokens = dummyTokens(text);
		this._loadedTokens = 0;

		this._infoTimeout = null;
		this._interval = setInterval(() => {
			if (this._loadedTokens >= this._tokens.length) {
				clearInterval(this._interval);
				this._interval = null;
				return;
			}
			this._loadedTokens++;
			this.emit('progress');
		}, 100);
	}

	disconnect() {
		if (this._interval) {
			clearInterval(this._interval);
			this._interval = null;
		}
		if (this._infoTimeout) {
			clearTimeout(this._infoTimeout);
			this._infoTimeout = null;
		}
	}

	processedTokens() {
		const toks = [];
		for (let i = 0; i < this._loadedTokens; ++i) {
			toks.push(this._tokens[i]);
		}
		return toks;
	}

	done() {
		return this._loadedTokens >= this._tokens.length;
	}

	requestTokenInfo(wordIdx) {
		const values = {
			suggs: ['hey', 'there', 'my', 'name', 'is', 'joe'],
			probs: [0.1, 0.05, 0.03, 0.02, 0.0253, 0.01]
		};
		if (this._infoTimeout) {
			clearTimeout(this._infoTimeout);
		}
		this._infoTimeout = setTimeout(() => {
			this.emit('info', values)
		}, 1000);
	}
}

function dummyTokens(text) {
	let word = '';
	const comps = [];
	for (let i = 0, len = text.length; i <= len; ++i) {
		const ch = (i === text.length ? ' ' : text[i]);
		if (ch != ' ' && ch != '\n') {
			word += ch;
			continue;
		}
		if (word) {
			comps.push({type: 'word', data: word, prob: Math.random()});
			word = '';
		}
		comps.push({type: 'space', data: ch});
	}
	comps.pop();
	return comps;
}
