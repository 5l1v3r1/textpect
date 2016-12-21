function Editor(props) {
	return React.createElement(
		"div",
		{ className: "editor" },
		React.createElement(
			"h1",
			null,
			"Enter text"
		),
		React.createElement("textarea", { onChange: e => props.onChange(e.target.value),
			value: props.text }),
		React.createElement("br", null),
		React.createElement(
			"button",
			{ onClick: () => props.onSubmit() },
			"Submit"
		)
	);
}
class Analyzer extends React.Component {
	constructor(props) {
		super(props);
		// TODO: connect to websocket.
	}

	render() {
		return React.createElement(
			"div",
			{ className: "analyzer" },
			React.createElement(
				"h1",
				null,
				"Analyzer"
			)
		);
	}
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
