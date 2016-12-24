package analyzer

import (
	"math"
	"sync"

	"github.com/unixpickle/autofunc"
	"github.com/unixpickle/num-analysis/linalg"
	"github.com/unixpickle/weakai/rnn"
)

type checkpoint struct {
	s rnn.State
	b byte
}

// Analyzer predicts the words in a document and generates
// alternative word suggestions.
type Analyzer struct {
	block rnn.Block

	tokenLock   sync.RWMutex
	tokens      []*Token
	checkpoints map[int]checkpoint
	done        bool

	cancel chan struct{}
}

// NewAnalyzer creates an analyzer and asynchronously
// begins the analysis process.
func NewAnalyzer(b rnn.Block, text string) *Analyzer {
	res := &Analyzer{
		block:       b,
		cancel:      make(chan struct{}, 1),
		checkpoints: map[int]checkpoint{},
	}
	go res.analyze(text)
	return res
}

// Tokens returns the set of processed tokens.
// The result is a copy which will never change, but calling
// Tokens() multiple times may result in different answers
// if the asynchronous analysis is running
func (a *Analyzer) Tokens() []*Token {
	a.tokenLock.RLock()
	defer a.tokenLock.RUnlock()
	return append([]*Token{}, a.tokens...)
}

// Done returns whether or not the asynchronous analysis is
// complete.
func (a *Analyzer) Done() bool {
	a.tokenLock.RLock()
	defer a.tokenLock.RUnlock()
	return a.done
}

// Cancel stops the asynchronous analysis process.
func (a *Analyzer) Cancel() {
	select {
	case a.cancel <- struct{}{}:
	default:
	}
}

// Suggestions returns suggested alternatives to the given
// token (identified by index).
// Whitespace tokens cannot be targets of suggestions.
func (a *Analyzer) Suggestions(idx int) ([]string, []float64) {
	a.tokenLock.RLock()
	c, ok := a.checkpoints[idx]
	a.tokenLock.RUnlock()
	if !ok {
		return nil, nil
	}
	return suggestions(c.b, c.s, a.block)
}

func (a *Analyzer) analyze(text string) {
	defer func() {
		a.tokenLock.Lock()
		a.done = true
		a.tokenLock.Unlock()
	}()

	state := a.block.StartState()
	word := ""
	cp := checkpoint{s: state, b: 0}
	probability := 1.0

	lastChar := make(linalg.Vector, 0x100)
	lastChar[0] = 1

	for _, x := range append([]byte(text), 0) {
		select {
		case <-a.cancel:
			return
		default:
		}

		in := &autofunc.Variable{Vector: lastChar}
		output := a.block.ApplyBlock([]rnn.State{state}, []autofunc.Result{in})
		state = output.States()[0]
		charProb := math.Exp(output.Outputs()[0][int(x)])
		lastChar = make(linalg.Vector, 0x100)
		lastChar[int(x)] = 1

		if x != ' ' && x != '\n' && x != 0 {
			probability *= charProb
			word += string(x)
			continue
		}

		if len(word) > 0 {
			probability *= math.Exp(output.Outputs()[0][' ']) +
				math.Exp(output.Outputs()[0]['\n'])
			a.tokenLock.Lock()
			a.tokens = append(a.tokens, &Token{
				Type:        Word,
				Data:        word,
				Probability: probability,
			})
			a.checkpoints[len(a.tokens)-1] = cp
			a.tokenLock.Unlock()
		}

		if x == 0 {
			continue
		}

		word = ""
		cp = checkpoint{s: state, b: x}
		probability = 1
		a.tokenLock.Lock()
		a.tokens = append(a.tokens, &Token{
			Type:        Space,
			Data:        string(x),
			Probability: charProb,
		})
		a.tokenLock.Unlock()
	}
}
