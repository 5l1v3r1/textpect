class Analyzer extends React.Component {
	constructor(props) {
		super(props);
		// TODO: connect to websocket.
	}

	render() {
		return (
			<div className="analyzer">
				<button onClick={() => this.props.onBack()}>Back</button>
				<h1>Analyzer</h1>
			</div>
		)
	}
}
