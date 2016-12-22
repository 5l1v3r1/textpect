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
			infoError: null,
		};
		this._sess = null;
	}

	componentDidMount() {
		this._sess = new Session(this.props.text);
		this._sess.on('progress', () => {
			this.setState({
				tokens: this._sess.processedTokens(),
				loading: !this._sess.done(),
			});
		});
		this._sess.on('error', (err) => {
			this.setState({error: err, loading: false});
		});
		this._sess.on('info', (info) => {
			this.setState({infoContent: info});
		});
		this._sess.on('infoError', (err) => {
			this.setState({infoError: err});
		});
	}

	componentWillUnmount() {
		this._sess.disconnect();
	}

	handleTokenClick(i) {
		this.setState({infoShowing: true, infoContent: null, infoError: null});
		this._sess.requestTokenInfo(i);
	}

	handleInfoClose() {
		this.setState({infoShowing: false});
	}

	render() {
		const tokens = [];
		this.state.tokens.forEach((item, i) => {
			tokens.push(<Token onClick={() => this.handleTokenClick(i)}
			                   info={item} key={i} />);
		});
		return (
			<div className="analyzer">
				<h1>Analyzer</h1>
				<div className="tokens">
					{(this.state.error ? <ErrorCover error={this.state.error} /> : null)}
					{tokens}
					{this.state.loading ? <Loader key="loader" /> : null}
				</div>
				{this.state.infoShowing ? this.createPane() : null}
			</div>
		);
	}

	createPane() {
		return (
			<Pane content={this.state.infoContent} error={this.state.infoError}
			      onClose={() => this.handleInfoClose()} />
		);
	}
}

function ErrorCover(props) {
	return <div className="error-cover"><label>{props.error}</label></div>
}

function Token(props) {
	const data = props.info.data;
	if (props.info.type === 'space') {
		if (data === '\n') {
			return <br />
		} else {
			return <span>{data}</span>
		}
	}
	const color = probabilityColor(props.info.prob);
	const intensity = probabilityIntensity(props.info.prob);
	const style = {
		borderColor: color,
		borderBottomWidth: (intensity*MAX_UNDERLINE).toFixed(2)+'px'
	};
	return <span className="token"
	             onClick={props.onClick}
	             style={style}>{data}</span>
}

function probabilityColor(prob) {
	const posColor = [0x65, 0xbc, 0xd4];
	const negColor = [0xf2, 0x2f, 0x21];

	// TODO: replace this with a normalized value.
	const posAmount = prob;

	const color = [];
	for (let i = 0; i < 3; ++i) {
		color[i] = Math.round(posColor[i]*posAmount + negColor[i]*(1-posAmount));
	}
	return 'rgba(' + color[0] + ', ' + color[1] + ', ' + color[2] + ', 1)';
}

function probabilityIntensity(prob) {
	return Math.abs(0.5 - prob) * 2;
}
