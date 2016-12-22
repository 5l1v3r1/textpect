package analyzer

const (
	Word  = "word"
	Space = "space"
)

// A Token contains information about a word or a
// space character.
type Token struct {
	// Type is either Word or Space.
	Type string `json:"type"`

	// Data is the contents of the token.
	Data string `json:"data"`

	// Probability is the probability of the token.
	Probability float64 `json:"prob"`
}
