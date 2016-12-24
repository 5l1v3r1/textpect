package main

import (
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"

	"golang.org/x/net/websocket"

	"github.com/unixpickle/textpect/analyzer"
	"github.com/unixpickle/weakai/rnn"
)

const MaxLength = 10000

func main() {
	var assetDir string
	var netFile string
	var port int
	flag.StringVar(&assetDir, "assets", "assets", "asset directory path")
	flag.StringVar(&netFile, "network", "", "neural network file")
	flag.IntVar(&port, "port", 80, "http server port")
	flag.Parse()
	if netFile == "" {
		flag.PrintDefaults()
		os.Exit(1)
	}

	netData, err := ioutil.ReadFile(netFile)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Failed to read network:", err)
		os.Exit(1)
	}
	net, err := rnn.DeserializeStackedBlock(netData)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Failed to deserialize network:", err)
		os.Exit(1)
	}

	assetHandler := http.FileServer(http.Dir(assetDir))
	wh := &WebsocketHandler{net}

	http.Handle("/", assetHandler)
	http.Handle("/websocket", websocket.Handler(wh.Handle))
	http.ListenAndServe(":"+strconv.Itoa(port), nil)
}

type Incoming struct {
	Type string `json:"type"`
	Idx  int    `json:"idx"`
}

type Outgoing struct {
	Tokens []string  `json:"suggs"`
	Probs  []float64 `json:"probs"`
}

type WebsocketHandler struct {
	Block rnn.Block
}

func (h *WebsocketHandler) Handle(c *websocket.Conn) {
	var str string
	if err := websocket.JSON.Receive(c, &str); err != nil {
		return
	}
	if len(str) > MaxLength {
		return
	}
	a := analyzer.NewAnalyzer(h.Block, str)
	defer a.Cancel()

	for {
		var inc Incoming
		if err := websocket.JSON.Receive(c, &inc); err != nil {
			return
		}
		if inc.Type == "tokens" {
			websocket.JSON.Send(c, a.Tokens())
		} else if inc.Type == "done" {
			websocket.JSON.Send(c, a.Done())
		} else if inc.Type == "suggest" {
			suggs, probs := a.Suggestions(inc.Idx)
			websocket.JSON.Send(c, Outgoing{suggs, probs})
		} else {
			log.Println("unrecognized type:", inc.Type)
		}
	}
}
