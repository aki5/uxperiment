package main

import (
	"encoding/json"
	"flag"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

var listenAddr = flag.String("listenAddr", ":8080", "address to listen on")
var logFile = flag.String("logFile", "", "file to write logs to")
var logFd io.Writer

type whiteList struct {
	Map map[string]bool
}

type httpLog struct {
	Time             time.Time
	Method           string
	Proto            string // "HTTP/1.0"
	ProtoMajor       int    // 1
	ProtoMinor       int    // 0
	Header           http.Header
	ContentLength    int64
	TransferEncoding []string
	Host             string
	Form             url.Values
	PostForm         url.Values
	//MultipartForm *multipart.Form
	Trailer    http.Header
	RemoteAddr string
	RequestURI string
}

func (list *whiteList) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	json.NewEncoder(logFd).Encode(httpLog{
		Time:             time.Now().UTC(),
		Method:           r.Method,
		Proto:            r.Proto,
		ProtoMajor:       r.ProtoMajor,
		ProtoMinor:       r.ProtoMinor,
		Header:           r.Header,
		ContentLength:    r.ContentLength,
		TransferEncoding: r.TransferEncoding,
		Host:             r.Host,
		Form:             r.Form,
		PostForm:         r.PostForm,
		Trailer:          r.Trailer,
		RemoteAddr:       r.RemoteAddr,
		RequestURI:       r.RequestURI,
	})
	path := r.URL.Path
	if list.Map[path] == true {
		http.ServeFile(w, r, path)
		return
	}
	http.Error(w, path+" not found", http.StatusNotFound)
}

func main() {
	flag.Parse()
	list := &whiteList{
		Map: map[string]bool{
			"demo.html":      true,
			"lib/camera.js":  true,
			"lib/geom.js":    true,
			"lib/mat4.js":    true,
			"lib/math.js":    true,
			"lib/mesh.js":    true,
			"lib/mouse.js":   true,
			"lib/select.js":  true,
			"main.js":        true,
			"render.js":      true,
			"webgl-utils.js": true,
		},
	}
	if *logFile != "" {
		lfd, err := os.OpenFile(*logFile, os.O_WRONLY|os.O_APPEND|os.O_CREATE, 0660)
		if err != nil {
			panic(err)
		}
		logFd = lfd
	} else {
		logFd = os.Stdout
	}
	err := http.ListenAndServe(":8080", http.StripPrefix("/", list))
	if err != nil {
		panic(err)
	}
}
