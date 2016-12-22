var MAX_SUGGESTIONS = 6;

class Pane extends React.Component {
	constructor() {
		super();
		this._pressHandler = (e) => {
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
				if (i >= MAX_SUGGESTIONS) {
					return;
				}
				const p = this.props.content.probs[i];
				list.push(
					<li key={i}>
						<label className="suggestion">{sugg}</label>
						<label className="probability">{(p*100).toFixed(2)+'%'}</label>
					</li>
				);
			});
			contents = <ul>{list}</ul>;
		} else if (this.props.error) {
			contents = <label className="error">{this.props.error}</label>;
		} else {
			contents = <Loader />;
		}
		return (
			<div className="token-pane" onClick={this.props.onClose}>
				<div className="pane-contents" onClick={(e) => e.stopPropagation()}>
					<h1>Alternatives</h1>
					{contents}
				</div>
			</div>
		);
	}
}
