package analyzer

import (
	"math"
	"math/rand"
	"sort"

	"github.com/unixpickle/autofunc"
	"github.com/unixpickle/num-analysis/linalg"
	"github.com/unixpickle/weakai/rnn"
)

func suggestions(last byte, s rnn.State, b rnn.Block) ([]string, []float64) {
	seen := map[string]bool{}
	samps := samples{}
	for i := 0; i < 100; i++ {
		str, prob := sampleWord(last, s, b)
		if _, ok := seen[str]; !ok {
			seen[str] = true
			samps = append(samps, sample{str, prob})
		}
	}
	sort.Sort(samps)
	var strs []string
	var probs []float64
	for _, x := range samps {
		strs = append(strs, x.word)
		probs = append(probs, x.prob)
	}
	return strs, probs
}

func sampleWord(last byte, s rnn.State, b rnn.Block) (string, float64) {
	lastIn := make(linalg.Vector, 0x100)
	lastIn[int(last)] = 1
	prob := 1.0
	word := ""
	for {
		v := &autofunc.Variable{Vector: lastIn}
		out := b.ApplyBlock([]rnn.State{s}, []autofunc.Result{v})
		s = out.States()[0]
		ch := sampleChar(out.Outputs()[0])
		for len(word) == 0 && (ch == ' ' || ch == '\n') {
			ch = sampleChar(out.Outputs()[0])
			continue
		}
		prob *= math.Exp(out.Outputs()[0][ch])
		if ch == ' ' || ch == '\n' {
			break
		}
		word += string(byte(ch))
		lastIn = make(linalg.Vector, 0x100)
		lastIn[ch] = 1
	}
	return word, prob
}

func sampleChar(v linalg.Vector) int {
	x := rand.Float64()
	for i, p := range v {
		x -= math.Exp(p)
		if x < 0 {
			return i
		}
	}
	return 0xff
}

type sample struct {
	word string
	prob float64
}

type samples []sample

func (s samples) Len() int {
	return len(s)
}

func (s samples) Swap(i, j int) {
	s[i], s[j] = s[j], s[i]
}

func (s samples) Less(i, j int) bool {
	return s[i].prob > s[j].prob
}
