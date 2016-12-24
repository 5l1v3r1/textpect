package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/unixpickle/textpect/analyzer"
	"github.com/unixpickle/weakai/rnn"
)

var LengthProbs = map[int][]float64{}
var AllProbs []float64

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
	for _, x := range listing {
		if x.IsDir() || strings.HasPrefix(x.Name(), ".") {
			continue
		}
		log.Println("Analyzing", x.Name())
		contents, err := ioutil.ReadFile(filepath.Join(os.Args[2], x.Name()))
		if err != nil {
			die(err)
		}
		process(net, string(contents))
	}

	fmt.Println("Length\t\t10%     \t30%     \t50%     \t70%     \t90%")
	LengthProbs[0] = AllProbs
	for length := 0; length < 10; length++ {
		p := LengthProbs[length]
		sort.Float64s(p)
		fl := float64(len(p))
		fmt.Printf("%d\t\t%.6f\t%.6f\t%.6f\t%.6f\t%.6f\n", length, p[int(fl*0.1)],
			p[int(fl*0.3)], p[int(fl*0.5)], p[int(fl*0.7)], p[int(fl*0.9)])
	}
}

func process(b rnn.Block, text string) {
	a := analyzer.NewAnalyzer(b, text)
	for !a.Done() {
		time.Sleep(time.Second / 5)
	}
	for _, t := range a.Tokens() {
		if t.Type == analyzer.Word {
			AllProbs = append(AllProbs, t.Probability)
			l := len(t.Data)
			LengthProbs[l] = append(LengthProbs[l], t.Probability)
		}
	}
}

func die(args ...interface{}) {
	fmt.Fprintln(os.Stderr, args...)
	os.Exit(1)
}
