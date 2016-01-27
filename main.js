/*
 *	Copyright (c) 2015 Aki Nyrhinen
 *
 *	Permission is hereby granted, free of charge, to any person obtaining a copy
 *	of this software and associated documentation files (the "Software"), to deal
 *	in the Software without restriction, including without limitation the rights
 *	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *	copies of the Software, and to permit persons to whom the Software is
 *	furnished to do so, subject to the following conditions:
 *
 *	The above copyright notice and this permission notice shall be included in
 *	all copies or substantial portions of the Software.
 *
 *	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 *	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *	THE SOFTWARE.
 */

var g = {}; // globals
var updateFunc = null;
var cam = camera.New();
cam.dist = 400;

function loadShader(gl, shaderText, shaderType)
{
	var shader = gl.createShader(shaderType);
	gl.shaderSource(shader, shaderText);
	gl.compileShader(shader);
	var ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!ok && !gl.isContextLost()) {
		var error = gl.getShaderInfoLog(shader);
		logmess("loadShader: '"+shaderText+"':"+error);
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function programSetup(gl, vshader, fshader, attribs, uniforms)
{
	// create our shaders
	var fragShaderText = document.getElementById(fshader);
	if (!fragShaderText) {
		logmess("programSetup: cannot find fshader " + fshader);
		return null;
	}

	var vertShaderText = document.getElementById(vshader);
	if (!vertShaderText) {
		logmess("programSetup: cannot find fshader " + vshader);
		return null;
	}

	var vertexShader = loadShader(gl, vertShaderText.text, gl.VERTEX_SHADER);
	var fragmentShader = loadShader(gl, fragShaderText.text, gl.FRAGMENT_SHADER);

	var prog = gl.createProgram();
	gl.attachShader (prog, vertexShader);
	gl.attachShader (prog, fragmentShader);

	for (var i = 0; i < attribs.length; ++i)
		gl.bindAttribLocation(prog, i, attribs[i]);

	gl.linkProgram(prog);

	var ok = gl.getProgramParameter(prog, gl.LINK_STATUS);
	if (!ok && !gl.isContextLost()) {
		// something went wrong with the link
		var error = gl.getProgramInfoLog (prog);
		logmess("Error in program linking:"+error);
		gl.deleteProgram(prog);
		gl.deleteProgram(fragmentShader);
		gl.deleteProgram(vertexShader);

		return null;
	}

	gl.useProgram(prog);
	prog.locs = {};
	for(var i in uniforms){
		prog.locs[uniforms[i]] = gl.getUniformLocation(prog, uniforms[i]);
	}

	return prog;
}

function altFunc(ev) {
	return ev.shiftKey || ev.altKey || ev.ctrlKey;
}


function windowSetup() {
	var canvas = document.getElementById("glcanvas");


	var canvas = document.getElementById("glcanvas");
	var gl = WebGLUtils.setupWebGL(canvas, {stencil:false, antialias:false, premultipliedAlpha: true});
	if (!gl) {
		logmess("failed to setup webgl canvas");
		return;
	}

	//logmess("render init");
	render.Init(gl, canvas);
	//logmess("canvas width " + canvas.width + " height " + canvas.height);


	window.addEventListener("resize",
		function(ev) {
			updateFunc();
		},
		false
	);

	var hitIdx = -1;
	var hitPlane = [0.0, 0.0, 1.0, 1.0];
	var hitOffset = [0.0, 0.0, 0.0];
	var dragging = false;

	// interaction between model and the selection tool is a bit undefined,
	// so we pass "g".
	var selTool = select.New(g);

	/* mouse interface */
	canvas.addEventListener("mousedown",
		function(ev){
			var rect = canvas.getBoundingClientRect();
			var changed = false;
			ev.preventDefault();

			if(altFunc(ev) && cam.mousedown(ev.clientX-rect.left, ev.clientY-rect.top)){
				changed = true;
			} else if(!ev.shiftkey){
				var mray = ray.New(ev.clientX-rect.left, ev.clientY-rect.top, canvas.clientWidth, canvas.clientHeight, cam.Position(), g.invProj, g.invView);
				selTool.Pick(cam.Position(), add3(cam.Position(), scale3(mray.Direction(), 3000)));
			}
			dragging = true;
			if(changed)
				updateFunc();
		},
		false
	);
	canvas.addEventListener("mousemove",
		function(ev){
			var rect = canvas.getBoundingClientRect();
			var changed = false;
			ev.preventDefault();
			if(altFunc(ev) && dragging && cam.mousemove(ev.clientX-rect.left, ev.clientY-rect.top)){
				changed = true;
			} else if(!altFunc(ev) && dragging){
				var mray = ray.New(ev.clientX-rect.left, ev.clientY-rect.top, canvas.clientWidth, canvas.clientHeight, cam.Position(), g.invProj, g.invView);
				selTool.Drag(cam.Position(), add3(cam.Position(), scale3(mray.Direction(), 3000)));
			}
			if(changed)
				updateFunc();
		},
		false
	);
	canvas.addEventListener("mouseup",
		function(ev){
			var rect = canvas.getBoundingClientRect();
			var changed = false;
			ev.preventDefault();
			if(altFunc(ev) && cam.mouseup(ev.clientX-rect.left, ev.clientY-rect.top))
				changed = true;
			dragging = false;
			if(changed)
				updateFunc();
		},
		false
	);

	canvas.addEventListener("wheel",
		function(ev){
			var rect = canvas.getBoundingClientRect();
			var changed = false;
			ev.preventDefault();
			if(cam.mousewheel(ev.clientX-rect.left, ev.clientY-rect.top, ev.deltaY))
				changed = true;

			if(changed)
				updateFunc();
		},
		false
	);

	/* touch interface */
	canvas.addEventListener("touchstart",
		function(ev){
			ev.preventDefault();
			var ev0 =  ev.touches.item(0);
			if(cam.mousedown(ev0.clientX, ev0.clientY))
				updateFunc();
		},
		false
	);
	canvas.addEventListener("touchmove",
		function(ev){
			ev.preventDefault();
			var ev0 =  ev.touches.item(0);
			if(cam.mousemove(ev0.clientX, ev0.clientY))
				updateFunc();
		},
		false
	);
	canvas.addEventListener("touchend",
		function(ev){
			ev.preventDefault();
			var ev0 =  ev.touches.item(0);
			if(cam.mouseup(ev0.clientX, ev0.clientY))
				updateFunc();
		},
		false
	);

	var ssaoEnableEl = document.getElementById("ssao-enable");
	ssaoEnableEl.addEventListener("change",
		function(ev){
			render.SetSSAO(ssaoEnableEl.checked);
			if(!!updateFunc)
				updateFunc();
		},
		false
	);
	render.SetSSAO(ssaoEnableEl.checked);


	var fxaaEnableEl = document.getElementById("fxaa-enable");
	fxaaEnableEl.addEventListener("change",
		function(ev){
			render.SetFXAA(fxaaEnableEl.checked);
			if(!!updateFunc)
				updateFunc();
		},
		false
	);
	render.SetFXAA(fxaaEnableEl.checked);


	updateFunc = render.Kick;
	render.Draw();

	return gl;
}

function logmess(message) {
	var logtext = document.getElementById('error');
	logtext.innerHTML += message + "<br/>";
}


function importSetup(gl) {
	var dropArea = document.getElementById('drop-area');
	var importButton = document.getElementById('import-button');


	function readFiles(files) {
		for(var i = 0, file; file = files[i]; i++){
			var reader = new FileReader();
			// read complete
			reader.onload = function(ev) {
				var dv = new DataView(ev.target.result);
				var ntris = dv.getUint32(80, true);
				var m = mesh.New(65536);
				for(var j = 0; j < ntris; j++){
					var off = 84+j*50;
					var n = [
						dv.getFloat32(off+0*4, true),
						dv.getFloat32(off+1*4, true),
						dv.getFloat32(off+2*4, true)
					];
					var v1 = [
						dv.getFloat32(off+3*4, true),
						dv.getFloat32(off+4*4, true),
						dv.getFloat32(off+5*4, true)
					];
					var v2 = [
						dv.getFloat32(off+6*4, true),
						dv.getFloat32(off+7*4, true),
						dv.getFloat32(off+8*4, true)
					];
					var v3 = [
						dv.getFloat32(off+9*4, true),
						dv.getFloat32(off+10*4, true),
						dv.getFloat32(off+11*4, true)
					];

					var attr = dv.getUint16(off+12*4, true);
					var color = [128,128,128,255];
					var alpha = 1.0;
					if(attr > 0){
						var scale = 255.0/31.0;
						color[0] = (attr&31)*scale;
						attr /= 32;
						color[1] = (attr&31)*scale;
						attr /= 32;
						color[2] = (attr&31)*scale;
					}
					// premultiplied...
					color[0] *= alpha;
					color[1] *= alpha;
					color[2] *= alpha;
					color[3] *= alpha;
					m.AddTriangle(n, v1, v2, v3, color);
				}
				logmess("loaded " + ntris + " triangles");
				m.Load(gl);
				g.meshes.push(m);

				var expr = {
					mesh: g.meshes[g.meshes.length-1],
					m4model: null,
					m4invmodel: null,
					m4mvp: null,
					m4norm: null,
					inverted: false,
					position: null
				};

				expr.position = [0, 0, 0];
				expr.m4model = mat4.New().Id().Translate(expr.position);
				expr.m4invmodel = expr.m4model.Copy().Inverse();
				g.csgExpr.unshift(expr);

				updateFunc();
			}

logmess("loading " + file + "...");
			// kick the reader
			reader.readAsArrayBuffer(file);
		}
	}

	dropArea.addEventListener('dragover', function(ev) {
		ev.stopPropagation();
		ev.preventDefault();
		ev.dataTransfer.dropEffect = 'copy';
	});

	importButton.addEventListener('change', function(ev) {
logmess("ping " + importButton.files);
		readFiles(importButton.files);
	});

	dropArea.addEventListener('drop', function(ev) {
		var files = ev.dataTransfer.files;
		readFiles(files);

		ev.stopPropagation();
		ev.preventDefault();
	});
}

function main(){
	var gl = windowSetup();
	importSetup(gl);
}

window["main"] = main;
