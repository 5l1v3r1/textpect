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
				"button",
				{ onClick: () => this.props.onBack() },
				"Back"
			),
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
	}

	showAnalyzer() {
		this.setState({ editing: false });
	}

	showEditor() {
		this.setState({ editing: true });
	}

	render() {
		if (this.state.editing) {
			return React.createElement(Editor, { text: this.state.text,
				onChange: t => this.setState({ text: t }),
				onSubmit: () => this.showAnalyzer() });
		} else {
			return React.createElement(Analyzer, { text: this.state.text,
				onBack: () => this.showEditor() });
		}
	}
}

window.addEventListener('load', function () {
	ReactDOM.render(React.createElement(Root, null), document.getElementById('content'));
});
