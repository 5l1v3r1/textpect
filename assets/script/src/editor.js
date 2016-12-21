function Editor(props) {
	return (
		<div className="editor">
			<h1>Enter text</h1>
			<textarea onChange={(e) => props.onChange(e.target.value)}
			          value={props.text} />
			<button onClick={() => props.onSubmit()}>Submit</button>
		</div>
	)
}
