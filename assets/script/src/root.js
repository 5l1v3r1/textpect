class Root extends React.Component {
	constructor() {
		super();
		this.state = {
			text: '',
			editing: true,
		};
		if (!history.state) {
			history.replaceState(this.state, window.title, '');
		} else {
			this.state = history.state;
		}
		window.onpopstate = (e) => this.setState(e.state);
	}

	showAnalyzer() {
		this.setState({editing: false}, () => {
			history.pushState(this.state, window.title, '#analyzer');
		});
	}

	handleTextChange(t) {
		this.setState({text: t}, () => {
			history.replaceState(this.state, window.title, '');
		});
	}

	render() {
		if (this.state.editing) {
			return <Editor text={this.state.text}
			               onChange={(t) => this.handleTextChange(t)}
			               onSubmit={() => this.showAnalyzer()} />
		} else {
			return <Analyzer text={this.state.text} />
		}
	}
}

window.addEventListener('load', function() {
	ReactDOM.render(<Root />, document.getElementById('content'));
});
