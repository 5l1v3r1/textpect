class Session {
	constructor(text) {
		// TODO: implement this for real using WebSockets
		// and a neural network on the back-end.

		this._components = [];

		let word = '';
		for (let i = 0, len = text.length; i <= len; ++i) {
			var ch = (i === text.length ? ' ' : text[i]);
			if (ch != ' ' && ch != '\n') {
				word += ch;
				continue;
			}
			if (word) {
				this._components.push({type: 'word', data: word, prob: Math.random()});
				word = '';
			}
			this._components.push({type: 'space', data: ch});
		}
		// Remove trailing space.
		this._components.pop();

		this._currentComp = 0;
		this.onProgress = null;
		this.onTokenInfo = null;

		this._infoTimeout = null;
		this._interval = setInterval(() => {
			if (this._currentComp >= this._components.length) {
				clearInterval(this._interval);
				this._interval = null;
				return;
			}
			this._currentComp++;
			if (this.onProgress) {
				this.onProgress();
			}
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
		const words = [];
		for (let i = 0; i < this._currentComp; ++i) {
			words.push(this._components[i]);
		}
		return words
	}

	done() {
		return this._currentComp >= this._components.length;
	}

	requestTokenInfo(wordIdx) {
		const values = {
			prob: 0.1337,
			suggs: ['hey', 'there', 'my', 'name', 'is', 'joe'],
			suggProbs: [0.1, 0.05, 0.03, 0.02, 0.0253, 0.01]
		};
		if (this._infoTimeout) {
			clearTimeout(this._infoTimeout);
		}
		this._infoTimeout = setTimeout(() => {
			if (this.onTokenInfo) {
				this.onTokenInfo(values);
			}
		}, 1000);
	}
}
