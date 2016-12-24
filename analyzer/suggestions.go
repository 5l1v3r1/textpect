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
	sampler := newWordSampler(last, s, b)
	for i := 0; i < 100; i++ {
		str, prob := sampler.Sample()
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

type cacheEntry struct {
	State rnn.State
	Dist  linalg.Vector
}

type wordSampler struct {
	Last  byte
	Block rnn.Block

	Cache map[string]cacheEntry
}

func newWordSampler(last byte, s rnn.State, b rnn.Block) *wordSampler {
	lastIn := make(linalg.Vector, 0x100)
	lastIn[int(last)] = 1
	v := &autofunc.Variable{Vector: lastIn}
	out := b.ApplyBlock([]rnn.State{s}, []autofunc.Result{v})
	return &wordSampler{
		Last:  last,
		Block: b,
		Cache: map[string]cacheEntry{
			"": {
				State: out.States()[0],
				Dist:  out.Outputs()[0],
			},
		},
	}
}

func (w *wordSampler) Sample() (word string, prob float64) {
	prob = 1.0
	var lastState rnn.State
	for {
		entry, ok := w.Cache[word]
		if !ok {
			inVec := make(linalg.Vector, 0x100)
			inVec[word[len(word)-1]] = 1
			v := &autofunc.Variable{Vector: inVec}
			out := w.Block.ApplyBlock([]rnn.State{lastState}, []autofunc.Result{v})
			entry = cacheEntry{
				State: out.States()[0],
				Dist:  out.Outputs()[0],
			}
			w.Cache[word] = entry
		}
		lastState = entry.State
		ch := sampleChar(entry.Dist)
		for len(word) == 0 && (ch == ' ' || ch == '\n') {
			ch = sampleChar(entry.Dist)
			continue
		}
		if ch == ' ' || ch == '\n' {
			prob *= math.Exp(entry.Dist[' ']) + math.Exp(entry.Dist['\n'])
			break
		}
		prob *= math.Exp(entry.Dist[ch])
		word += string([]byte{byte(ch)})
	}
	return
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
