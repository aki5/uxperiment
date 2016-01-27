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

	var div255 = 1.0/255.0;

	function New(maxtris, color) {
		return new Mesh(maxtris, color);
	}

	function Mesh(maxtris, color) {
		this.color = new Uint8Array(color || [128,128,128,255]);
		this.next = null;
		this.ntris = 0;
		this.maxtris = maxtris;
		this.normalObject = null;
		this.vertexObject = null;
		this.colorObject = null;
		this.indexObject = null;
		this.normals = new Float32Array(9 * maxtris);
		this.vertices = new Float32Array(9 * maxtris);
		this.colors = new Uint8Array(12 * maxtris);
		this.indices = new Uint16Array(3 * maxtris);
		this.bbox = new Float32Array(6);
	}

	Mesh.prototype.Color  = function(gl) {
		var c = this.color;
		return [c[0]*div255, c[1]*div255, c[2]*div255, c[3]*div255];
	}

	Mesh.prototype.Load  = function(gl) {
		var mesh = this;
		for(;mesh != null; mesh = mesh.next){
			mesh.normalObject = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalObject);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

			mesh.vertexObject = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexObject);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

			mesh.colorObject = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colorObject);
			gl.bufferData(gl.ARRAY_BUFFER, mesh.colors, gl.STATIC_DRAW);

			gl.bindBuffer(gl.ARRAY_BUFFER, null);

			mesh.indexObject = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexObject);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		}
	}

	Mesh.prototype.Bind = function(gl) {
		// Set up all the vertex attributes for vertices, normals and colors
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexObject);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalObject);
		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.colorObject);
		gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 0, 0);

		// Bind the index array
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexObject);
	}

	function bboxupdate(bbox, vert) {
		if(vert[0] < bbox[0])
			bbox[0] = vert;
		if(vert[1] < bbox[1])
			bbox[1] = vert;
		if(vert[2] < bbox[2])
			bbox[2] = vert;
		if(vert[0] > bbox[3])
			bbox[3] = vert;
		if(vert[1] > bbox[4])
			bbox[4] = vert;
		if(vert[2] > bbox[5])
			bbox[5] = vert;
	}

	Mesh.prototype.AddTriangle =  function(normal, vert1, vert2, vert3, color) {
		var mesh = this;
		while(mesh.next != null)
			mesh = mesh.next;
		var i = mesh.ntris;
		if(3*i+3 >= 65536){
			mesh.next = New(65536);
			mesh = mesh.next;
			i = 0;
		}

		if(!normal){
			normal = normal3(vert1, vert2, vert3);
		}

		if(mesh.ntris === 0){
			this.bbox.set(vert1,0);
			this.bbox.set(vert1,3);
		} else {
			bboxupdate(this.bbox, vert1);
		}
		bboxupdate(this.bbox, vert2);
		bboxupdate(this.bbox, vert3);

		mesh.vertices.set(vert1, 9*i+0);
		mesh.normals.set(normal, 9*i+0);
		mesh.colors.set(color, 12*i+0);

		mesh.vertices.set(vert2, 9*i+3);
		mesh.normals.set(normal, 9*i+3);
		mesh.colors.set(color, 12*i+4);

		mesh.vertices.set(vert3, 9*i+6);
		mesh.normals.set(normal, 9*i+6);
		mesh.colors.set(color, 12*i+8);

		mesh.indices.set([3*i+0, 3*i+1, 3*i+2], 3*i);
		mesh.ntris = i+1;
	}

	Mesh.prototype.AddQuad = function(normal, vert1, vert2, vert3, vert4, color) {
		this.AddTriangle(normal, vert1, vert2, vert3, color);
		this.AddTriangle(normal, vert1, vert3, vert4, color);
	}

	/*
	 *	[MT97]	Fast, minimum storage ray-triangle intersection.
	 *		Tomas Möller and Ben Trumbore
	 */
	Mesh.prototype.IntersectSeg = function(s0, dir) {
		var Eps = 0.000001;
		var mint = 2.0;
		for(var mesh = this; mesh != null; mesh = mesh.next){
			for(var i = 0; i < mesh.ntris; i++){
				var t0i = 3*mesh.indices[3*i+0];
				var t1i = 3*mesh.indices[3*i+1];
				var t2i = 3*mesh.indices[3*i+2];
				var v0 = mesh.vertices.subarray(t0i, t0i+3);
				var v1 = mesh.vertices.subarray(t1i, t1i+3);
				var v2 = mesh.vertices.subarray(t2i, t2i+3);

				var e1 = sub3(v1, v0);
				var e2 = sub3(v2, v0);
				var P = cross3(dir, e2);
				var det = dot3(e1, P);
				if(det > -Eps && det < Eps)
					continue;

				var detrcp = 1.0 / det;
				var T = sub3(s0, v0);
				var u = dot3(T, P) * detrcp;
				if(u < 0.0 || u > 1.0)
					continue;

				var Q = cross3(T, e1);
				var v = dot3(dir, Q) * detrcp;
				if(v < 0.0 || u + v  > 1.0)
					continue;

				var t = dot3(e2, Q) * detrcp;
				if(t >= 0.0 && t < mint){
					var pl = cross3(e1, e2);
					mint = t;
					//isectPt = add3(s0, scale3(dir, mint));
					//console.log("t " + t + " dst0 " + dot3(P, v0) + " dst1 " + dot3(P, isectPt));
				}
			}
		}
		if(mint < 0.0 || mint >= 1.0)
			return -1.0;
		return mint;
	}

	window["mesh"] = { New: New };
})(window);


// simple boxmesh
function boxmesh(gl, rx, ry, rz, color) {
	var m = mesh.New(12, color);

	var af = [ rx, ry, rz];
	var bf = [-rx, ry, rz];
	var cf = [-rx,-ry, rz];
	var df = [ rx,-ry, rz];

	var ab = [ rx, ry,-rz];
	var bb = [-rx, ry,-rz];
	var cb = [-rx,-ry,-rz];
	var db = [ rx,-ry,-rz];

	m.AddQuad(null, af, bf, cf, df, color);
	m.AddQuad(null, db, cb, bb, ab, color);

	m.AddQuad(null, ab, af, df, db, color);
	m.AddQuad(null, bf, bb, cb, cf, color);

	m.AddQuad(null, df, cf, cb, db, color);
	m.AddQuad(null, bf, af, ab, bb, color);

	m.Load(gl);

	return m;
}

// rectangle (at optional z level)
function quadmesh(gl, rad, color, z) {
	var m = mesh.New(2, color);

	var af = [ rad, rad, z || 0];
	var bf = [-rad, rad, z || 0];
	var cf = [-rad,-rad, z || 0];
	var df = [ rad,-rad, z || 0];

	m.AddQuad(null, af, bf, cf, df, color);

	m.Load(gl);

	return m;
}
