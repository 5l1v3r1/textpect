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
				this._queryQueue.forEach(x => x.cb('WebSocket closed.', null));
			};
			this._conn.onmessage = e => {
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
		this._query({ type: 'suggest', idx: wordIdx }, (err, obj) => {
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
		this._query({ type: 'done' }, (err, done) => {
			if (err) {
				this.emit('error', err);
				return;
			}
			this._query({ type: 'tokens' }, (err, toks) => {
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
		const info = { obj: obj, cb: cb };
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
var PROB_MEAN = 0.001;
var PROB_STD = 0.002;

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
	const posAmount = Math.min(1, Math.max(0, (1 + (prob - PROB_MEAN) / PROB_STD) / 2));
	const color = [];
	for (let i = 0; i < 3; ++i) {
		color[i] = Math.round(posColor[i] * posAmount + negColor[i] * (1 - posAmount));
	}
	return 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', 1)';
}

function probabilityIntensity(prob) {
	return Math.min(1, Math.abs(prob - PROB_MEAN) / PROB_STD);
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
