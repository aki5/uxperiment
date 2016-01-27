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
(function(window){
	"use strict";

	var prevSeq = -1;
	var updateSeq = 0;
	var curPeels = 0;
	var needKick = false;
	var edgeHighlights = false;
	var renderUnsorted = false;
	var depthTextureExt = null;
	var fragDepthExt = null;

	var width = -1;
	var height = -1;

	var gl = null;
	var canvas = null;

	var fNear = 100.0;
	var fFar = 3000.0;
	var fFov = 45.0;

	// model..
	var csgExpr = [];


	// a tribute to mikko
	function irgb(i, a) {
		var r = 0, g = 0, b = 0;
		for(var bit = 7; bit >= 0; bit--){
			r = 2*r + (i&1);
			g = 2*g + ((i>>1)&1);
			b = 2*b + ((i>>2)&1);
			i >>= 3;
		}
		var alpha = a * 1.0/255.0;
		return [r*alpha, g*alpha, b*alpha, a];
	}

	function irgba(i) {
		var r = 0, g = 0, b = 0, a = 0;
		for(var bit = 7; bit >= 0; bit--){
			a = 2*a + (i&1);
			r = 2*r + ((i>>1)&1);
			g = 2*g + ((i>>2)&1);
			b = 2*b + ((i>>3)&1);
			i >>= 4;
		}
		a = 255-a;
		var alpha = a * 1.0/255.0;
		return [r*alpha, g*alpha, b*alpha, a];
	}

	function Init(ingl, incanvas) {

		gl = ingl;
		canvas = incanvas;

		depthTextureExt = gl.getExtension("WEBGL_depth_texture") ||
			gl.getExtension("WEBKIT_WEBGL_depth_texture") ||
			gl.getExtension("MOZ_WEBGL_depth_texture");
		if(!depthTextureExt) {
			logmess("no depth texture extension");
			return;
		}

		fragDepthExt = gl.getExtension("EXT_frag_depth");
		if(!fragDepthExt){
			logmess("no frag depth ext");
		}

		g.flatProg = programSetup(
			gl,
			// The ids of the vertex and fragment shaders
			"flipnormalshader", "flatshader", //"flatshader", "ssaoshader"
			// The vertex attribute names used by the shaders.
			// The order they appear here corresponds to their index
			// used later.
			["position", "normal", "color"],
			["image0", "width", "height", "near", "far", "light0dir", "light1dir", "light2dir", "normal_matrix", "mvp_matrix", "alt", "altnormal", "altcolor", "edgecolor"]
		);

		g.ssaoProg = programSetup(
			gl,
			// The ids of the vertex and fragment shaders
			"flipnormalshader", "ssaoshader", //"flatshader", "ssaoshader"
			// The vertex attribute names used by the shaders.
			// The order they appear here corresponds to their index
			// used later.
			["position", "normal", "color"],
			["image0", "width", "height", "near", "far", "light0dir", "light1dir", "light2dir", "normal_matrix", "mvp_matrix", "alt", "altnormal", "altcolor", "edgecolor"]
		);


		g.peelProg = programSetup(
			gl,
			// The ids of the vertex and fragment shaders
			"cheapshader", "peelshader", // "peelshader", "peelshader_nodiscard",
			// The vertex attribute names used by the shaders.
			// The order they appear here corresponds to their index
			// used later.
			["position", "normal", "color"],
			["image0", "width", "height", "mvp_matrix"]
		);

		g.restProg = programSetup(
			gl,
			// The ids of the vertex and fragment shaders
			"flipnormalshader", "restshader",
			// The vertex attribute names used by the shaders.
			// The order they appear here corresponds to their index
			// used later.
			["position", "normal", "color"],
			["image0", "width", "height", "light0dir", "normal_matrix", "mvp_matrix", "alt", "altnormal", "altcolor"]
		);

		g.stencilProg = programSetup(
			gl,
			// The ids of the vertex and fragment shaders
			"cheapshader", "stencilshader",
			// The vertex attribute names used by the shaders.
			// The order they appear here corresponds to their index
			// used later.
			["position", "normal", "color"],
			["image0", "width", "height", "mvp_matrix"]
		);


		g.fillProg = programSetup(
			gl,
			// The ids of the vertex and fragment shaders
			"cheapshader", "fillshader",
			// The vertex attribute names used by the shaders.
			// The order they appear here corresponds to their index
			// used later.
			["position", "normal", "color"],
			["image0", "width", "height", "mvp_matrix", "fillcolor"]
		);


		g.fxaaProg = programSetup(gl,
			"passthrushader", "fxaashader", //"fxaashader", "copyshader",
			["position"],
			["image0", "width", "height", "bgcolor"]
		);


		g.copyProg = programSetup(gl,
			"passthrushader", "copyshader", //"fxaashader", "copyshader",
			["position"],
			["image0", "width", "height", "bgcolor"]
		);

		g.drawProg = g.flatProg;
		g.blitProg = g.copyProg;

		g.meshes = [];
		var spheres = [];
		var cylinders = [];

		g.meshes.push(boxmesh(gl, 500,500,0.1, [30, 50, 70, 255]));

		var start = 25;
		for(var idx = start; idx < start+5; idx++){
			if((idx & 1) == 0){
				g.meshes.push(cylinder(gl, 8, 80.0, 30.0, 30.0, irgb(idx, 255)));
				//g.meshes.push(cylinder(gl, 128, 80.0, 30.0, 30.0, irgb(idx, 255)));
			} else {
//				var color = irgb(idx, 10);
//				color[3] = 32;
				var color = [5, 10, 5, 30];
				g.meshes.push(icosphere(gl, 3, 40.0, color)); // [20,20,20,35]));
				//g.meshes.push(icosphere(gl, 4, 40.0, color)); // [20,20,20,35]));
			}
		}


		for(var mi in g.meshes){
			csgExpr.push({mesh: g.meshes[mi], m4model: null, m4invmodel: null, m4mvp: null, m4norm: null, inverted: false, sel: false});
		}

		for(var mi = 0; mi < csgExpr.length; mi++){
			if(mi == 0){
				csgExpr[mi].position = [0, 0, -39];
				csgExpr[mi].m4model = mat4.New().Id().Translate(csgExpr[mi].position);
				csgExpr[mi].m4invmodel = csgExpr[mi].m4model.Copy().Inverse();
			} else {
				csgExpr[mi].position = [0, (mi-csgExpr.length/2)*35, (mi&1)==0 ? 0 : 23];
				csgExpr[mi].m4model = mat4.New().Id().Translate(csgExpr[mi].position);
				csgExpr[mi].m4invmodel = csgExpr[mi].m4model.Copy().Inverse();
			}
		}

		var nmeshes = [csgExpr[0]];
		for(var mi = 1; mi < csgExpr.length; mi++){
			if((mi&1) == 0)
				nmeshes.push(csgExpr[mi]);
		}
		for(var mi = 1; mi < csgExpr.length; mi++){
			if((mi&1) == 1)
				nmeshes.push(csgExpr[mi]);
		}
		csgExpr = nmeshes;
		g.csgExpr = csgExpr; // TODO

		/* fullscreen quad needed by fxaa etc */
		g.quad = mesh.New(2);
		g.quad.AddQuad(null,
			[-1.0,-1.0, 0.0],
			[ 1.0,-1.0, 0.0],
			[ 1.0, 1.0, 0.0],
			[-1.0, 1.0, 0.0],
			[0,0,0,0]
		);
		g.quad.Load(gl);


		g.light0 = camera.New(200.0, [0.0, 0.0, 0.0], 1*(2*Math.PI/5), Math.PI/4);
		g.light1 = camera.New(200.0, [0.0, 0.0, 0.0], 3*(2*Math.PI/5), Math.PI/5);
		g.light2 = camera.New(200.0, [0.0, 0.0, 0.0], 4*(2*Math.PI/5), Math.PI/7);

		g.m4vp = null;
		g.m4view = null;

		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);
	}


/*
 *	format: ALPHA, RGB, RGBA, LUMINANCE, LUMINANCE_ALPHA (standard)
 *		DEPTH_STENCIL (depth texture extension)
 *	type: UNSIGNED_BYTE, UNSIGNED_SHORT_5_6_5, UNSIGNED_SHORT_4_4_4_4, UNSIGNED_SHORT_5_5_5_1 (standard)
 *		UNSIGNED_INT_24_8_WEBGL (depth texture extension)
 */
	function NewTexture(width, height, type, format){
		var texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, type, width, height, 0, type, format, null);
		return texture;
	}

	function Resize() {


		//var devicePixelRatio = window.devicePixelRatio || 1;
		var devicePixelRatio = 1;
		if (canvas.clientWidth*devicePixelRatio === width && canvas.clientHeight*devicePixelRatio === height)
			return;

		width = canvas.clientWidth * devicePixelRatio;
		height = canvas.clientHeight * devicePixelRatio;

		canvas.width = width;
		canvas.height = height;


	/* texture stuff */

		if(!!g.offScreen){
			for(var i in g.framebuffer){
				gl.deleteTexture(g.depthTex[i]);
				gl.deleteTexture(g.colorTex[i]);
				gl.deleteFramebuffer(g.offScreen);
			}
			logmess("deleted framebuffers");
		}

		var maxdim = width > height ? width : height;
		var potdim = 1;
		while(potdim < maxdim)
			potdim *= 2;

		logmess("canvas width " + canvas.width + " height " + canvas.height);

		if(false){
			/*
			 *	this turns out to be a loser for all hardware I've tested it with,
			 *	namely ipad mini 1st gen, ipad mini 2, macbook air, nexus 5.
			 *	the nexus 5 showed a bit of improvement in SSAO mode, but without it
			 *	going for POT cost us half the perf.
			 */
			logmess("using potdim " + potdim);
			g.potWidth = potdim;
			g.potHeight = potdim;
		} else {
			g.potWidth = width;
			g.potHeight = height;
		}

		g.depthTex = [];
		g.colorTex = [];
		g.tileColor = [];
		g.tileDepth = [];

		g.tileScreen = gl.createFramebuffer();
		g.tileWidth = 64;
		g.tileHeight = 64;
		g.tilePixbuf = new Uint8Array(g.tileWidth*g.tileHeight*4);

		gl.bindFramebuffer(gl.FRAMEBUFFER, g.tileScreen);

		g.tileColor.push(NewTexture(g.tileWidth, g.tileHeight, gl.RGBA, gl.UNSIGNED_BYTE));
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, g.tileColor[0], 0);

		//g.tileDepth.push(NewTexture(g.tileWidth, g.tileHeight, gl.DEPTH_STENCIL, depthTextureExt.UNSIGNED_INT_24_8_WEBGL));
		//gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, g.tileDepth[0], 0);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if(status !==  gl.FRAMEBUFFER_COMPLETE){
			switch(status){
			case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
				console.log("incomplete attachment");
				break;
			case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
				console.log("incorrect dimensions");
				break;
			case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
				console.log("missing attachment");
				break;
			case gl.FRAMEBUFFER_UNSUPPORTED:
				console.log("unsupported");
				break;
			default:
				console.log("unknown status " + status);
				break;
			}
		}


		g.offScreen = gl.createFramebuffer();
		g.colorTex.push(NewTexture(g.potWidth, g.potHeight, gl.RGBA, gl.UNSIGNED_BYTE));
		for(var i = 0; i < 2; i++)
			g.depthTex.push(NewTexture(g.potWidth, g.potHeight, gl.DEPTH_STENCIL, depthTextureExt.UNSIGNED_INT_24_8_WEBGL));

		gl.disable(gl.DITHER);
		gl.disable(gl.SAMPLE_COVERAGE);
		gl.disable(gl.POLYGON_OFFSET_FILL);
		gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
	}


	function tileBufferMaxAlpha() {
		gl.bindFramebuffer(gl.FRAMEBUFFER, g.tileScreen);
		var pixbuf = g.tilePixbuf;
		var maxpix = 0;
		gl.readPixels(0, 0, g.tileWidth, g.tileHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixbuf);
		for(var i = 3; i < g.tileWidth*g.tileHeight*4; i += 4){
			var tmp = pixbuf[i];
			maxpix = maxpix > tmp ? maxpix : tmp;
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, g.offScreen);
		return maxpix;
	}

	function tileBufferMaxAlphaNoBind() {
		var pixbuf = g.tilePixbuf;
		var maxpix = 0;
		gl.readPixels(0, 0, g.tileWidth, g.tileHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixbuf);
		for(var i = 3; i < g.tileWidth*g.tileHeight*4; i += 4){
			var tmp = pixbuf[i];
			maxpix = maxpix > tmp ? maxpix : tmp;
		}
		return maxpix;
	}

	/* assumes the pixels have already been read */
	function tileBufferRectFor(depth) {
		var pixbuf = g.tilePixbuf;
		var maxpix = 0;
		var stride = g.tileWidth*4;
		var rect = [g.tileWidth, g.tileHeight, 0, 0];
		var xmax =  g.tileWidth;
		var ymax = g.tileHeight;

		for(var x = 0; x < xmax; x++){
			for(var y = 0; y < ymax; y++){
				if(pixbuf[y*stride+x*4+3] > depth){
					if(rect[0] > x)
						rect[0] = x;
					if(rect[1] > y)
						rect[1] = y;
					if(rect[2] < x)
						rect[2] = x;
					if(rect[3] < y)
						rect[3] = y;
				}
			}
		}

		return rect;
	}

	var fpsMA = 0;
	var prevTime = Date.now();
	var fpsCounts = 0;
	var needPeels = 10;

	function Draw() {

		var curTime = Date.now();
		var deltaTime = curTime - prevTime;

		if(deltaTime < 500.0)
			fpsMA = 0.1*deltaTime + 0.9*fpsMA;
		prevTime = curTime;

		if(fpsCounts > 5){
			var fpsElem = document.getElementById("fps");
			while(fpsElem.hasChildNodes())
				fpsElem.removeChild(fpsElem.firstChild);
			fpsElem.appendChild(document.createTextNode("" + (1000.0/fpsMA).toFixed(2)));
			fpsCounts = 0;

			var depthElem = document.getElementById("depth");
			while(depthElem.hasChildNodes())
				depthElem.removeChild(depthElem.firstChild);
			depthElem.appendChild(document.createTextNode("" + needPeels));
		} else {
			fpsCounts++;
		}



		var depthProbe = true;
		var backFaceHack = true;
		var scissorHack = true;

		if(updateSeq !== prevSeq){
			prevSeq = updateSeq;

			Resize();

			g.light0dir = norm3(sub3(g.light0.Position(), g.light0.Center()));
			g.light1dir = norm3(sub3(g.light1.Position(), g.light1.Center()));
			g.light2dir = norm3(sub3(g.light2.Position(), g.light2.Center()));

			var m4proj = mat4.New();
			m4proj.Perspective(fFov, width/height, fNear, fFar);

			var eye = cam.Position();
			var m4view = mat4.New();
			m4view.LookAt(eye, cam.Center(), [0,0,1]);
			g.m4view = m4view;
			g.m4proj = m4proj;
			g.m4vp = m4proj.Copy().Multiply(m4view);

			g.invView = m4view.Copy().Inverse();
			g.invProj = m4proj.Copy().Inverse();

			gl.clearColor(0.0, 0.0, 0.0, 0.0);

			gl.bindFramebuffer(gl.FRAMEBUFFER, g.offScreen);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, g.colorTex[0], 0);
			gl.clear(gl.COLOR_BUFFER_BIT);


			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, g.depthTex[0], 0);
			gl.clearDepth(0.0);
			gl.clear(gl.DEPTH_BUFFER_BIT);

			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, g.depthTex[1], 0);
			gl.clearDepth(0.0);
			gl.clear(gl.DEPTH_BUFFER_BIT);

			curPeels = 0;

			// update mvp and normal matrices..
			for(var mi = 0; mi < csgExpr.length; mi++){
				csgExpr[mi].m4mvp = g.m4vp.Copy().Multiply(csgExpr[mi].m4model);
				var m4mv = g.m4view.Copy().Multiply(csgExpr[mi].m4model);
				csgExpr[mi].m4norm = m4mv.Inverse().Transpose();
			}

			// do a stencil pass to determine depth complexity of the scene
			// there is no stencil buffer read-back in webgl, so we need to 
			// do this with a special shader and addivive blending
			// we'll read the results of this back after the first peeling pass.
			if(depthProbe){

				gl.bindFramebuffer(gl.FRAMEBUFFER, g.tileScreen);
				var tilew = g.tileWidth;
				var tileh = g.tileHeight;
				gl.viewport(0, 0, tilew, tileh);
				gl.scissor(0, 0, tilew, tileh);
				gl.enable(gl.SCISSOR_TEST);

				prog = g.fillProg;
				gl.useProgram(prog);

				gl.uniform1i(prog.locs["image0"], 0);  // texture unit 0 for image0
				gl.uniform1f(prog.locs["width"], 1.0/tilew);
				gl.uniform1f(prog.locs["height"], 1.0/tileh);
				gl.uniform4fv(prog.locs["fillcolor"], [1.0, 1.0, 1.0, 1.0/255.0]);

				gl.disable(gl.DEPTH_TEST);
				gl.disable(gl.STENCIL_TEST);

				gl.enable(gl.BLEND);

				/*
				 *	set constant color to be used in blending operations [r,g,b,a]
				 */
				gl.blendColor(0.0, 0.0, 0.0, 0.0);

				/*
				 *	sfact: Same as for dfact, plus SRC_ALPHA_SATURATE
				 *	dfact: ZERO, ONE, [ONE_MINUS_]SRC_COLOR,
				 *	[ONE_MINUS_]DST_COLOR, [ONE_MINUS_]SRC_ALPHA,
				 *	[ONE_MINUS_]DST_ALPHA, [ONE_MINUS_]CONSTANT_COLOR,
				 *	[ONE_MINUS_]CONSTANT_ALPHA
				 *
				 *	For arithmetic and other abuses of the blending stage, blendFunc is
				 *	best thought of as a multiply-add stage that evaluates the following
				 *	expression for every passing fragment.
				 *
				 *		(1) dst.rgba = dfact.rgba * dst.rgba <op> sfact.rgba * src.rgba 
				 *
				 *	Notice that the factors are 4-component wide also, which can be controlled
				 *	with the CONSTANT_COLOR option. Not all 8 values can be specified freely since
				 *	there is only one gl.blendColor. A constant like gl.ONE actually means [1,1,1,1].
				 *
				 *	The main benefit of using the blending stage is that it allows very efficient
				 *	accumulation of values in the output buffer, which is not available in shader
				 *	programs. One limitation of the system is that the arithmetic is saturating, so
				 *	some care must be taken when using it for control purposes.
				 *
				 *	When using the textures produced by blending instead of stencils, care must be
				 *	taken to avoid the discard statement, because using that typically turns off
				 *	depth optimizations.
				 */
				gl.blendFunc(gl.ONE, gl.ONE);

				/*
				 *	<op> in eq (1) can be controlled with the following blendEquaiton alternatives
				 *
				 *		1. gl.FUNC_ADD, gl.FUNC_SUBTRACT and gl.FUNC_REVERSE_SUBTRACT (standard)
				 *		2. gl.MIN and gl.MAX when EXT_blend_minmax is available.
				 */
				gl.blendEquation(gl.FUNC_ADD);
				gl.clear(gl.COLOR_BUFFER_BIT);

				for(var mi = 0; mi < csgExpr.length; mi++){
					if(backFaceHack && csgExpr[mi].mesh.Color()[3] == 1.0){
						gl.enable(gl.CULL_FACE);
						gl.cullFace(gl.BACK);
					} else {
						gl.disable(gl.CULL_FACE);
					}
					gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mi].m4mvp.Array());
					for(var mesh = csgExpr[mi].mesh; mesh != null; mesh = mesh.next){
						mesh.Bind(gl);
						gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);
					}
				}

				/*
				 *	Kick the render because we are going to need the results of this during
				 *	the render and we don't want to block on it.
				 */
				gl.flush();
				//needPeels = tileBufferMaxAlphaNoBind();
			}
		}

		var i = 0;
		var prog = null;

		gl.bindFramebuffer(gl.FRAMEBUFFER, g.offScreen);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, g.colorTex[0], 0);
		gl.viewport(0, 0, width, height);
		gl.scissor(0, 0, width, height);
		gl.enable(gl.SCISSOR_TEST);

		/*
		 *	the +2 here is to compensate for the error potential of depth probing on a substantially
		 *	reduced viewport. For the same reason, we call tileBufferRectFor() two peels behind the
		 *	current frame...
		 */
		for(i = 0; i < needPeels+2; i++, curPeels++){
			/*
			 *	peel off a depth layer
			 */
			var prevPeel = (curPeels & 1)^1;
			var curPeel = curPeels & 1;
			var drawPeel = curPeel;

			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, g.depthTex[curPeel], 0);

			gl.colorMask(false, false, false, false);
			gl.disable(gl.BLEND);

			/*
			 *	This is the slow part of our algorithm, which is surprising considering the following stencil fiddling
			 *	does generate a ridiculous amount of draw calls in comparison to this single pass. It is because
			 *	the following passes can run with early-z discard enabled in the pipeline, while here we need to
			 *	here we pretty much run through every pixel every pass, so we run out of fill-rate very quickly.
			 *	Another idea would be to do the peeling in a per tile fashion, but that requires a software tiling
			 *	approach to rendering, generating new index buffers per frame and all that.
			 *
			 *	It is strange that the cost of this phase is so high in comparison to everything else.
			 *	A number of tests indicate that it is likely the depth texture lookups that slow this
			 *	stage down in comparison to the stencil peeling approach that also renders all geometry
			 *	but manages to run at twice the speed. There must be a faster way. Ideas.
			 *
			 *	A new idea: use the depth complexity pixmap to compute a scissor test (or many?) for every peel.
			 *	This doesn't really speed up the peeling process per fragment, but it can cut down
			 *	on the amount of fragments pushed through the peeler, which seems to be our worst bandwidth hog
			 *	at the moment.
			 *
			 *	We can still postpone computing the peel specific scissors after the first peel is done, since areas
			 *	not covered by any geometry don't consume any bandwidth.
			 */


			if(scissorHack && depthProbe && curPeels > 1){
				var tilew = width/g.tileWidth;
				var tileh = height/g.tileHeight;
				var rect = tileBufferRectFor(curPeels-2);
				/*
				 *	"round up" the rectangle.
				 */
				rect[0] -= 0.5;
				rect[1] -= 0.5;
				rect[2] += 1.5;
				rect[3] += 2.0;
				gl.scissor(rect[0]*tilew, rect[1]*tileh, (rect[2]-rect[0])*tilew, (rect[3]-rect[1])*tileh);
			}

			var depthPeeling = true;
			if(!depthPeeling){
				prog = g.stencilProg;
				gl.stencilMask(255);
				gl.clearStencil(0);
				gl.clear(gl.STENCIL_BUFFER_BIT);
				gl.stencilFunc(gl.EQUAL, curPeels, 255);
				gl.stencilOp(gl.INCR, gl.INCR, gl.INCR);
				gl.depthFunc(gl.ALWAYS);
			} else {
				prog = g.peelProg;
				gl.disable(gl.STENCIL_TEST);
				gl.depthFunc(gl.LESS);
			}

			gl.depthMask(true);
			gl.clearDepth(1.0);
			gl.clear(gl.DEPTH_BUFFER_BIT);
			gl.enable(gl.DEPTH_TEST);

			gl.useProgram(prog);
			gl.uniform1i(prog.locs["image0"], 0);  // texture unit 0 for image0
			//gl.uniform1i(prog.locs["image1"], 1);  // texture unit 0 for image0
			gl.uniform1f(prog.locs["width"], 1.0/g.potWidth);
			gl.uniform1f(prog.locs["height"], 1.0/g.potHeight);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, curPeels == 0 ? null : g.depthTex[prevPeel]);


			for(var mi = 0; mi < csgExpr.length; mi++){

				/*
				 *	this part is a bit fakey, we cull back faces of solid objects out,
				 *	this reduces the number of fragments we push through the peeler.
				 *	but makes ghosting of back-faces inside transparent objects not possible
				 */
				if(backFaceHack && csgExpr[mi].mesh.Color()[3] == 1.0){
					gl.enable(gl.CULL_FACE);
					gl.cullFace(gl.BACK);
				} else {
					gl.disable(gl.CULL_FACE);
				}
				gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mi].m4mvp.Array());
				for(var mesh = csgExpr[mi].mesh; mesh != null; mesh = mesh.next){
					mesh.Bind(gl);
					gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);
				}
			}
			if(drawPeel != curPeel && curPeels === 0)
				continue;

			/*
			 *	start color pass for the current peel.
			 *	use the most recent peel as a depth texture and the depth attachment.
			 *	depth buffer updates are disabled but depth testing is enabled beyond this point.
			 */
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, g.depthTex[drawPeel], 0);
			gl.bindTexture(gl.TEXTURE_2D, g.depthTex[drawPeel]);
			gl.depthMask(false);
			gl.enable(gl.DEPTH_TEST);
			gl.enable(gl.BLEND);

			/*
			 *	Short-circuit the boolean computation process and just spit out everything, useful
			 *	for getting an idea of the cost associated with the boolean evaluator.
			 */
			if(false){

				prog = g.drawProg;
				gl.useProgram(prog);
				gl.uniform3fv(prog.locs["light0dir"], g.light0dir);
				gl.uniform3fv(prog.locs["light1dir"], g.light1dir);
				gl.uniform3fv(prog.locs["light2dir"], g.light2dir);
				gl.uniform1i(prog.locs["image0"], 0);  // texture unit 0 for image0
				gl.uniform1f(prog.locs["width"], 1.0/g.potWidth);
				gl.uniform1f(prog.locs["height"], 1.0/g.potHeight);
				gl.uniform1f(prog.locs["alt"], 0.0);
				gl.uniform1f(prog.locs["altnormal"], 0.0);
				gl.uniform1f(prog.locs["near"], fNear);
				gl.uniform1f(prog.locs["far"], fFar);

				gl.depthFunc(gl.EQUAL);
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);// UNDER
				//gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);// OVER
				gl.colorMask(true, true, true, true);

				for(var mi = 0; mi < csgExpr.length; mi++){
					gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mi].m4mvp.Array());
					gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mi].m4mvp.Array());
					gl.uniformMatrix4fv(prog.locs["normal_matrix"], false, csgExpr[mi].m4norm.Array());
					gl.uniform1f(prog.locs["alt"], 0.0);
					gl.uniform1f(prog.locs["altnormal"], csgExpr[mi].inverted ? -1.0 : 1.0);
					var bit = 1 << mi;
					//csgExpr[mi].mvp.setUniform(gl, prog.locs["mvp_matrix"], false);
					for(var mesh = csgExpr[mi].mesh; mesh != null; mesh = mesh.next){
						mesh.Bind(gl);
						gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);
					}
				}

				if(true){
					if(depthProbe && curPeels === 0)
						needPeels = tileBufferMaxAlpha();
				}
				continue; // done. do next peel.
			}

			/*
			 *	Instead of using the stencil buffer here, it should be possible to use a
			 *	regular color buffer to track 4 surfaces simultaneously by
			 *
			 *		1. Clear colors to 0.5
			 *		2. set color to [0,0,0,1/255]
			 *		3. render back faces with blendFunc ADD
			 *		4. render front faces with blendFunc SUB
			 *
			 *	It does not appear feasible to combine this pass with the peeling pass,
			 *	due to having to update the depth buffer while doing it. The famous
			 *	Doom3 stencil shadow trick[1] may apply, but I am not sure.
			 *
			 *	[1] http://fabiensanglard.net/doom3_documentation/CarmackOnShadowVolumes.txt
			 */
			prog = g.stencilProg;
			gl.useProgram(prog);

			gl.uniform1i(prog.locs["image0"], 0);  // texture unit 0 for image0
			gl.uniform1f(prog.locs["width"], 1.0/g.potWidth);
			gl.uniform1f(prog.locs["height"], 1.0/g.potHeight);

			for(var mi = 0; mi < csgExpr.length; mi++){

				var stencilPreload = 0;
				for(var mj = mi+1; mj < csgExpr.length; mj++)
					if(csgExpr[mj].inverted)
						stencilPreload++;
				if(csgExpr[mi].inverted)
					stencilPreload |= 128;

				// the depth buffer is now set up, compute parity
				gl.colorMask(false, false, false, false);
				gl.stencilMask(255);
				gl.clearStencil(stencilPreload);
				gl.clear(gl.STENCIL_BUFFER_BIT);
				gl.enable(gl.STENCIL_TEST);

				// count from back to front, so that near plane clipping doesn't produce odd results.
				// far plane clipping will still produce odd results, so keep the far plane far enough.
				gl.depthFunc(gl.GREATER);

				//gl.stencilFunc(gl.ALWAYS, 0, 255); // passes if(ref & mask) < (stencil & mask).
				gl.stencilFunc(gl.ALWAYS, 0, 255); // passes if(ref & mask) < (stencil & mask).

				gl.disable(gl.CULL_FACE);
				gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
				gl.stencilMask(128);
				gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mi].m4mvp.Array());
				for(var mesh = csgExpr[mi].mesh; mesh != null; mesh = mesh.next){
					mesh.Bind(gl);
					gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);
				}

				// compute "inside others" counter.
				gl.enable(gl.CULL_FACE);
				gl.stencilMask(127);

				for(var mj = mi+1; mj < csgExpr.length; mj++){
					if(mj == mi)
						continue;
					gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mj].m4mvp.Array());
					for(var mesh = csgExpr[mj].mesh; mesh != null; mesh = mesh.next){
						mesh.Bind(gl);

						// increment on back faces
						gl.cullFace(csgExpr[mj].inverted ? gl.BACK : gl.FRONT);
						gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR_WRAP);
						gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);

						// decrement on front faces
						gl.cullFace(csgExpr[mj].inverted ? gl.FRONT : gl.BACK);
						gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR_WRAP);
						gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);
					}

				}

				/*
				 *	this is the pixel transfer phase, we set the appropriate pixels in 
				 *	the destination color buffer, but we cannot update the depth buffer
				 *	because we use the current depth buffer to choose the right fragment
				 *	(to select the correct render attributes, in other words).
				 *
				 *	for shadow mapping, we'd want to update a depth buffer when we set an
				 *	opaque pixel.
				 *
				 *	for correct edge highlights, we'd want access to the stencil bits from
				 *	within the shader, to only highlight edges touching the current shape.
				 *
				 *	all of this makes me increasingly think we should not be using the
				 *	stencil buffer for the parity counts at all. using a color buffer
				 *	instead would allow dealing with self-intersecting geometry.
				 *
				 *	also, using color buffers would allow doing a single shading pass where
				 *	the fragment shader would do the O(n^2) loop with O(n) texture fetches
				 *	instead of the current O(n^2) draw calls. the memory requirements of such
				 *	a "deferred" resolution approach are large enough to justify an explicit
				 *	tiled rendering approach from the top level.
				 */
				prog = g.drawProg;
				gl.useProgram(prog);
				gl.uniform3fv(prog.locs["light0dir"], g.light0dir);
				gl.uniform3fv(prog.locs["light1dir"], g.light1dir);
				gl.uniform3fv(prog.locs["light2dir"], g.light2dir);
				gl.uniform1i(prog.locs["image0"], 0);  // texture unit 0 for image0
				gl.uniform1f(prog.locs["width"], 1.0/g.potWidth);
				gl.uniform1f(prog.locs["height"], 1.0/g.potHeight);
				gl.uniform1f(prog.locs["alt"], 0.0);
				gl.uniform1f(prog.locs["altnormal"], 0.0);
				gl.uniform1f(prog.locs["near"], fNear);
				gl.uniform1f(prog.locs["far"], fFar);

				gl.uniform4fv(prog.locs["edgecolor"], [0.0,0.0,0.0,0.1]);

				gl.depthFunc(gl.EQUAL);
				//gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);// OVER
				gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);// UNDER

				gl.disable(gl.CULL_FACE);
				gl.colorMask(true, true, true, true);
				gl.stencilMask(0);
				gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);

				// draw surfaces of this mesh that come from self (surface color from self)
				// stencilfunc: must not be inside others, must be inside self.
				gl.stencilFunc(gl.EQUAL, 128, 255);
				gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mi].m4mvp.Array());
				gl.uniformMatrix4fv(prog.locs["normal_matrix"], false, csgExpr[mi].m4norm.Array());
				gl.uniform1f(prog.locs["alt"], 0.0);
				gl.uniform1f(prog.locs["altnormal"], csgExpr[mi].inverted ? -1.0 : 1.0);

				for(var mesh = csgExpr[mi].mesh; mesh != null; mesh = mesh.next){
					mesh.Bind(gl);
					gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);
				}

				// draw surfaces of this mesh that are inside another mesh (blend volumetric colors of both)
				for(var mj = mi+1; mj < csgExpr.length; mj++){
					if(mj == mi)
						continue;

					gl.uniform1f(prog.locs["alt"], 1.0);
					gl.uniform1f(prog.locs["altnormal"], csgExpr[mj].inverted ? 1.0 : -1.0);
					gl.uniformMatrix4fv(prog.locs["mvp_matrix"], false, csgExpr[mj].m4mvp.Array());
					gl.uniformMatrix4fv(prog.locs["normal_matrix"], false, csgExpr[mj].m4norm.Array());
					gl.uniform4fv(prog.locs["altcolor"], csgExpr[mi].mesh.Color());

					for(var mesh = csgExpr[mj].mesh; mesh != null; mesh = mesh.next){
						mesh.Bind(gl);
						gl.drawElements(gl.TRIANGLES, 3*mesh.ntris, gl.UNSIGNED_SHORT, 0);
					}
				}

			}

			// update needPeels here to avoid syncing with the gpu right away.
			// not sure that this matters at all..
			if(true){
				if(depthProbe && curPeels === 0)
					needPeels = tileBufferMaxAlpha();
			}

		} // peeling


		gl.disable(gl.CULL_FACE);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.DEPTH_TEST);
		gl.colorMask(true, true, true, true);

		// reset scissor before the final blit.
		gl.scissor(0, 0, width, height);

		// blit to visible.
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		prog = g.blitProg;
		gl.useProgram(prog);

		gl.uniform1i(prog.locs["image0"], 0);  // texture unit 0 for image0
		gl.uniform1f(prog.locs["width"], 1.0/g.potWidth);
		gl.uniform1f(prog.locs["height"], 1.0/g.potHeight);
		gl.uniform4fv(prog.locs["bgcolor"], [0.1, 0.22, 0.27, 1.0]);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, g.colorTex[0]);

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);

		g.quad.Bind(gl);
		gl.drawArrays(gl.TRIANGLES, 0, 6);

		if(false && curPeels < 30){
			window.requestAnimFrame(
				function(){
					Draw(gl, canvas);
				},
				canvas
			);
		} else {
			needKick = true;
		}
	}

	function Kick() {
		updateSeq = 1 + updateSeq;
		if(needKick){
			needKick = false;
			window.requestAnimFrame(
				function(){
					render.Draw();
				},
				canvas
			);
		}
	}

	function SetEdgeHighlights(dohighlight) {
		edgeHighlights = dohighlight;
	}

	function SetSSAO(mode) {
		if(mode){
			g.drawProg = g.ssaoProg;
		} else {
			g.drawProg = g.flatProg;
		}
	}

	function SetFXAA(mode) {
		if(mode){
			g.blitProg = g.fxaaProg;
		} else {
			g.blitProg = g.copyProg;
		}
	}

	window["render"] = {
		Init: Init,
		Resize: Resize,
		Draw: Draw,
		Kick: Kick,

		SetEdgeHighlights: SetEdgeHighlights,
		SetSSAO: SetSSAO,
		SetFXAA: SetFXAA
	};
})(window);
