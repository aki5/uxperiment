# Uxperiment

Simple experiments in 3d object interaction in webgl, just for fun really.

It currently includes a depth-peeling renderer that supports transparent objects in a way that makes
physical sense, with some quick and dirty SSAO and FXAA to give a bit more original look.

## Try it out

You can find this running at [anyrhine.com](http://anyrhine.com/demo.html), to try it out
locally, type the following commands

```
git clone https://github.com/aki5/uxperiment.git
cd uxperiment
git submodule update --init --recursive
open -a 'google chrome' demo.html
```

