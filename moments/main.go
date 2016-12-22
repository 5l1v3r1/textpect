package main

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/unixpickle/textpect/analyzer"
	"github.com/unixpickle/weakai/rnn"
)

var Probs []float64

func main() {
	if len(os.Args) != 3 {
		die("Usage: moments <net> <corpus_dir>")
	}
	data, err := ioutil.ReadFile(os.Args[1])
	if err != nil {
		die(err)
	}
	net, err := rnn.DeserializeStackedBlock(data)
	if err != nil {
		die(err)
	}
	listing, err := ioutil.ReadDir(os.Args[2])
	if err != nil {
		die(err)
	}
	count := 0
	sum := 0.0
	sqSum := 0.0
	for _, x := range listing {
		if x.IsDir() || strings.HasPrefix(x.Name(), ".") {
			continue
		}
		contents, err := ioutil.ReadFile(filepath.Join(os.Args[2], x.Name()))
		if err != nil {
			die(err)
		}
		c, s, s2 := wordProbabilities(net, string(contents))
		count += c
		sum += s
		sqSum += s2
	}
	mean := sum / float64(count)
	variance := sqSum/float64(count) - mean*mean
	sort.Float64s(Probs)
	fmt.Println("Mean:", mean)
	fmt.Println("Var:", variance)
	fmt.Println("Median:", Probs[len(Probs)/2])
}

func wordProbabilities(b rnn.Block, text string) (count int, sum, sqSum float64) {
	a := analyzer.NewAnalyzer(b, text)
	for !a.Done() {
	}
	for _, t := range a.Tokens() {
		if t.Type == analyzer.Word {
			sum += t.Probability
			sqSum += t.Probability * t.Probability
			count++
			Probs = append(Probs, t.Probability)
		}
	}
	return
}

func die(args ...interface{}) {
	fmt.Fprintln(os.Stderr, args...)
	os.Exit(1)
}
