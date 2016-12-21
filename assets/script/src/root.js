class Root extends React.Component {
	constructor() {
		super();
		this.state = {
			text: '',
			editing: true,
		};
	}

	showAnalyzer() {
		this.setState({editing: false});
	}

	showEditor() {
		this.setState({editing: true});
	}

	render() {
		if (this.state.editing) {
			return <Editor text={this.state.text}
			               onChange={(t) => this.setState({text: t})}
			               onSubmit={() => this.showAnalyzer()} />
		} else {
			return <Analyzer text={this.state.text}
			                 onBack={() => this.showEditor()} />
		}
	}
}

window.addEventListener('load', function() {
	ReactDOM.render(<Root />, document.getElementById('content'));
});
