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
		listeners.slice().forEach(f => f.apply(null, a));
	}
}
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
			this.emit('info', values);
		}, 1000);
	}
}

function dummyTokens(text) {
	let word = '';
	const comps = [];
	for (let i = 0, len = text.length; i <= len; ++i) {
		const ch = i === text.length ? ' ' : text[i];
		if (ch != ' ' && ch != '\n') {
			word += ch;
			continue;
		}
		if (word) {
			comps.push({ type: 'word', data: word, prob: Math.random() });
			word = '';
		}
		comps.push({ type: 'space', data: ch });
	}
	comps.pop();
	return comps;
}
function Loader(props) {
	return React.createElement(
		'div',
		{ className: 'loader' },
		'Loading'
	);
}
class Pane extends React.Component {
	constructor() {
		super();
		this._pressHandler = e => {
			if (e.which === 27) {
				this.props.onClose();
			}
		};
	}

	componentDidMount() {
		window.addEventListener('keydown', this._pressHandler);
	}

	componentWillUnmount() {
		window.removeEventListener('keydown', this._pressHandler);
	}

	render() {
		let contents;
		if (this.props.content) {
			const list = [];
			this.props.content.suggs.forEach((sugg, i) => {
				const p = this.props.content.probs[i];
				list.push(React.createElement(
					'li',
					{ key: i },
					React.createElement(
						'label',
						{ className: 'suggestion' },
						sugg
					),
					React.createElement(
						'label',
						{ className: 'probability' },
						(p * 100).toFixed(2) + '%'
					)
				));
			});
			contents = React.createElement(
				'ul',
				null,
				list
			);
		} else if (this.props.error) {
			contents = React.createElement(
				'label',
				{ className: 'error' },
				this.props.error
			);
		} else {
			contents = React.createElement(Loader, null);
		}
		return React.createElement(
			'div',
			{ className: 'token-pane', onClick: this.props.onClose },
			React.createElement(
				'div',
				{ className: 'pane-contents', onClick: e => e.stopPropagation() },
				React.createElement(
					'h1',
					null,
					'Alternatives'
				),
				contents
			)
		);
	}
}
function Editor(props) {
	return React.createElement(
		'div',
		{ className: 'editor' },
		React.createElement(
			'h1',
			null,
			'Enter text'
		),
		React.createElement('textarea', { onChange: e => props.onChange(e.target.value),
			value: props.text }),
		React.createElement('br', null),
		React.createElement(
			'button',
			{ onClick: () => props.onSubmit() },
			'Submit'
		)
	);
}
var MAX_UNDERLINE = 5;

class Analyzer extends React.Component {
	constructor() {
		super();
		this.state = {
			tokens: [],
			loading: true,
			error: null,
			infoShowing: false,
			infoContent: null,
			infoError: null
		};
		this._sess = null;
	}

	componentDidMount() {
		this._sess = new Session(this.props.text);
		this._sess.on('progress', () => {
			this.setState({
				tokens: this._sess.processedTokens(),
				loading: !this._sess.done()
			});
		});
		this._sess.on('error', err => {
			this.setState({ error: err, loading: false });
		});
		this._sess.on('info', info => {
			this.setState({ infoContent: info });
		});
		this._sess.on('infoError', err => {
			this.setState({ infoError: err });
		});
	}

	componentWillUnmount() {
		this._sess.disconnect();
	}

	handleTokenClick(i) {
		this.setState({ infoShowing: true, infoContent: null, infoError: null });
		this._sess.requestTokenInfo(i);
	}

	handleInfoClose() {
		this.setState({ infoShowing: false });
	}

	render() {
		const tokens = [];
		this.state.tokens.forEach((item, i) => {
			tokens.push(React.createElement(Token, { onClick: () => this.handleTokenClick(i),
				info: item, key: i }));
		});
		return React.createElement(
			'div',
			{ className: 'analyzer' },
			React.createElement(
				'h1',
				null,
				'Analyzer'
			),
			React.createElement(
				'div',
				{ className: 'tokens' },
				this.state.error ? React.createElement(ErrorCover, { error: this.state.error }) : null,
				tokens,
				this.state.loading ? React.createElement(Loader, { key: 'loader' }) : null
			),
			this.state.infoShowing ? this.createPane() : null
		);
	}

	createPane() {
		return React.createElement(Pane, { content: this.state.infoContent, error: this.state.infoError,
			onClose: () => this.handleInfoClose() });
	}
}

function ErrorCover(props) {
	return React.createElement(
		'div',
		{ className: 'error-cover' },
		React.createElement(
			'label',
			null,
			props.error
		)
	);
}

function Token(props) {
	const data = props.info.data;
	if (props.info.type === 'space') {
		if (data === '\n') {
			return React.createElement('br', null);
		} else {
			return React.createElement(
				'span',
				null,
				data
			);
		}
	}
	const color = probabilityColor(props.info.prob);
	const intensity = probabilityIntensity(props.info.prob);
	const style = {
		borderColor: color,
		borderBottomWidth: (intensity * MAX_UNDERLINE).toFixed(2) + 'px'
	};
	return React.createElement(
		'span',
		{ className: 'token',
			onClick: props.onClick,
			style: style },
		data
	);
}

function probabilityColor(prob) {
	const posColor = [0x65, 0xbc, 0xd4];
	const negColor = [0xf2, 0x2f, 0x21];

	// TODO: replace this with a normalized value.
	const posAmount = prob;

	const color = [];
	for (let i = 0; i < 3; ++i) {
		color[i] = Math.round(posColor[i] * posAmount + negColor[i] * (1 - posAmount));
	}
	return 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', 1)';
}

function probabilityIntensity(prob) {
	return Math.abs(0.5 - prob) * 2;
}
class Root extends React.Component {
	constructor() {
		super();
		this.state = {
			text: '',
			editing: true
		};
		if (!history.state) {
			history.replaceState(this.state, window.title, '');
		} else {
			this.state = history.state;
		}
		window.onpopstate = e => this.setState(e.state);
	}

	showAnalyzer() {
		this.setState({ editing: false }, () => {
			history.pushState(this.state, window.title, '#analyzer');
		});
	}

	handleTextChange(t) {
		this.setState({ text: t }, () => {
			history.replaceState(this.state, window.title, '');
		});
	}

	render() {
		if (this.state.editing) {
			return React.createElement(Editor, { text: this.state.text,
				onChange: t => this.handleTextChange(t),
				onSubmit: () => this.showAnalyzer() });
		} else {
			return React.createElement(Analyzer, { text: this.state.text });
		}
	}
}

window.addEventListener('load', function () {
	ReactDOM.render(React.createElement(Root, null), document.getElementById('content'));
});
