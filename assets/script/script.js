class Session {
	constructor(text) {
		// TODO: implement this for real using WebSockets
		// and a neural network on the back-end.

		this._components = [];

		let word = '';
		for (let i = 0, len = text.length; i <= len; ++i) {
			var ch = i === text.length ? ' ' : text[i];
			if (ch != ' ' && ch != '\n') {
				word += ch;
				continue;
			}
			if (word) {
				this._components.push({ type: 'word', data: word, prob: Math.random() });
				word = '';
			}
			this._components.push({ type: 'space', data: ch });
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
		return words;
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
			if (this.onWordInfo) {
				this.onWordInfo(values);
			}
		}, 1000);
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
			tokenInfo: null
		};
		this._sess = null;
	}

	componentDidMount() {
		this._sess = new Session(this.props.text);
		this._sess.onProgress = () => {
			this.setState({
				tokens: this._sess.processedTokens(),
				loading: !this._sess.done()
			});
		};
		this._sess.onTokenInfo = info => {
			this.setState({ tokenInfo: info });
		};
	}

	componentWillUnmount() {
		this._sess.disconnect();
	}

	handleTokenClick(i) {
		alert('clicked token ' + i);
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
				tokens
			)
		);
	}
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
