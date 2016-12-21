var MAX_UNDERLINE = 5;

class Analyzer extends React.Component {
	constructor() {
		super();
		this.state = {
			tokens: [],
			loading: true,
			infoToken: null,
			tokenInfo: null
		};
		this._sess = null;
	}

	componentDidMount() {
		this._sess = new Session(this.props.text);
		this._sess.onProgress = () => {
			this.setState({
				tokens: this._sess.processedTokens(),
				loading: !this._sess.done(),
			});
		};
		this._sess.onTokenInfo = (info) => {
			this.setState({tokenInfo: info});
		};
	}

	componentWillUnmount() {
		this._sess.disconnect();
	}

	handleTokenClick(i, token) {
		this.setState({infoToken: token.data, tokenInfo: null});
		this._sess.requestTokenInfo(i);
	}

	render() {
		const tokens = [];
		this.state.tokens.forEach((item, i) => {
			tokens.push(<Token onClick={() => this.handleTokenClick(i, item)}
			                   info={item} key={i} />);
		});
		return (
			<div className="analyzer">
				<h1>Analyzer</h1>
				<div className="tokens">
					{tokens}
					{this.state.loading ?
						<div className="corner-item"><Loader key="loader" /></div> : null}
				</div>
				<TokenPane info={this.state.tokenInfo} token={this.state.infoToken}
				           onClose={() => this.setState({infoToken: null})}/>
			</div>
		)
	}
}

class TokenPane extends React.Component {
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
		const props = this.props;
		if (!props.token) {
			return null;
		}
		const loader = <Loader />;
		const list = [];
		if (props.info) {
			props.info.suggs.forEach((sugg, i) => {
				const p = props.info.suggProbs[i];
				list.push(
					<li key={i}>
						<label className="suggestion">{sugg}</label>
						<label className="probability">{(p*100).toFixed(2)+'%'}</label>
					</li>
				);
			});
		}
		return (
			<div className="token-pane" onClick={props.onClose}>
				<div className="pane-contents" onClick={(e) => e.stopPropagation()}>
					<h1>Alternatives</h1>
					{(!props.info ? loader : <ul>{list}</ul>)}
				</div>
			</div>
		)
	}
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
