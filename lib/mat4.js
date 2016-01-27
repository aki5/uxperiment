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

	// used as temps for operations that can't be strictly in-place.
	var tmpVals = new Float32Array(16);

	function New(arr) {
		return new Mat4(arr);
	}

	function Mat4(arr) {
		this.arr = new Float32Array(arr ? arr : 16);
	}

	Mat4.prototype.Copy = function() {
		return New(this.arr);
	}

	Mat4.prototype.Array = function() {
		return this.arr;
	}

	Mat4.prototype.Id = function(){
		this.arr.set([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		], 0);
		return this;
	}

	Mat4.prototype.Frustum = function(left, right, bottom, top, near, far){
		this.arr.set([
			(2 * near) / (right - left), 0, 0, 0,
			0, 2 * near / (top - bottom), 0, 0,
			(right + left) / (right - left), (top + bottom) / (top - bottom), -(far + near) / (far - near), -1,
			0, 0, -(2 * far * near) / (far - near), 0
		],0);
		return this;

	}

	Mat4.prototype.Perspective = function(fov, aspect, near, far){
		var top = Math.tan(fov * Math.PI / 360) * near;
		var bottom = -top;
		var left = aspect * bottom;
		var right = aspect * top;
		return this.Frustum(left, right, bottom, top, near, far);
	}

	Mat4.prototype.LookAt = function(eye, center, up){
		var fwd = sub3(center, eye);
		fwd = norm3(fwd);
		var x = norm3(cross3(fwd, up));
		up = cross3(x, fwd);
		this.arr.set([
			x[0], up[0], -fwd[0], 0,
			x[1], up[1], -fwd[1], 0,
			x[2], up[2], -fwd[2], 0,
			0, 0, 0, 1
		], 0);
		this.arr.set(this.Translate([-eye[0],-eye[1],-eye[2]]).arr, 0);
		return this;
	}

	Mat4.prototype.Translate = function(off){
		return this.Multiply(new Mat4([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			off[0], off[1], off[2], 1
		]));
	}

	Mat4.prototype.Scale = function(sc){
		return this.Multiply(new Mat4([
			sc[0], 0, 0, 0,
			0, sc[1], 0, 0,
			0, 0, sc[2], 0,
			0, 0, 0, sc[3]
		]));
	}

	Mat4.prototype.Multiply = function(other){
		var mthis = this.arr;
		var mother = other.arr;
		var mnew = new Mat4();
		for(var row = 0; row < 4; row++){
			for(var col = 0; col < 4; col++){
				tmpVals[row*4+col] = 0.0;
				for(var i = 0; i < 4; i++){
					tmpVals[row*4+col] += mthis[4*i+col] * mother[4*row+i];
				}
			}
		}
		this.arr.set(tmpVals, 0);
		return this;
	}


	Mat4.prototype.Transpose = function(){
		var m = this.arr;
		for(var i = 0; i < 4; i++)
			for(var j = 0; j < 4; j++)
				tmpVals[4*i+j] = m[4*j+i];
		this.arr.set(tmpVals, 0);
		return this;
	}


	Mat4.prototype.Adjoint = function(){
		var m = this.arr;
		this.arr.set([
			// row 0
			this.Det3(
				m[5], m[6], m[7],
				m[9], m[10], m[11],
				m[13], m[14], m[15]),
			- this.Det3(
				m[4], m[6], m[7],
				m[8], m[10], m[11],
				m[12], m[14], m[15]),
			this.Det3(
				m[4], m[5], m[7],
				m[8], m[9], m[11],
				m[12], m[13], m[15]),
			- this.Det3(
				m[4], m[5], m[6],
				m[8], m[9], m[10],
				m[12], m[13], m[14]),

			// row 1
			- this.Det3(
				m[1], m[2], m[3],
				m[9], m[10], m[11],
				m[13], m[14], m[15]),
			this.Det3(
				m[0], m[2], m[3],
				m[8], m[10], m[11],
				m[12], m[14], m[15]),
			- this.Det3(
				m[0], m[1], m[3],
				m[8], m[9], m[11],
				m[12], m[13], m[15]),
			this.Det3(
				m[0], m[1], m[2],
				m[8], m[9], m[10],
				m[12], m[13], m[14]),

			// row 2
			this.Det3(
				m[1], m[2], m[3],
				m[5], m[6], m[7],
				m[13], m[14], m[15]),
			- this.Det3(
				m[0], m[2], m[3],
				m[4], m[6], m[7],
				m[12], m[14], m[15]),
			this.Det3(
				m[0], m[1], m[3],
				m[4], m[5], m[7],
				m[12], m[13], m[15]),
			- this.Det3(
				m[0], m[1], m[2],
				m[4], m[5], m[6],
				m[12], m[13], m[14]),

			// row 3
			- this.Det3(
				m[1], m[2], m[3],
				m[5], m[6], m[7],
				m[9], m[10], m[11]),
			this.Det3(
				m[0], m[2], m[3],
				m[4], m[6], m[7],
				m[8], m[10], m[11]),
			- this.Det3(
				m[0], m[1], m[3],
				m[4], m[5], m[7],
				m[8], m[9], m[11]),
			this.Det3(
				m[0], m[1], m[2],
				m[4], m[5], m[6],
				m[8], m[9], m[10])
		], 0);
		return this.Transpose();
	}

	// TODO: use the 2x2 determinants instead of 3x3, like in
	// http://www.geometrictools.com/Documentation/LaplaceExpansionTheorem.pdf
	// it looks like it should be quite a bit faster.
	Mat4.prototype.Inverse = function(){
		var rcpdet = 1.0 / this.Det();
		this.Adjoint();
		this.Scale([rcpdet, rcpdet, rcpdet, rcpdet]);
		return this;
	}

	// Determinants, stuff that doesn't return a matrix
	// m0 m1
	// m2 m3
	Mat4.prototype.Det2 = function(m0, m1, m2, m3){
		return m0 * m3 - m1 * m2;
	}

	// m0 m1 m2
	// m3 m4 m5
	// m6 m7 m8
	Mat4.prototype.Det3 = function(m0, m1, m2, m3, m4, m5, m6, m7, m8){
		return m0 * this.Det2(m4, m5, m7, m8)
			- m1 * this.Det2(m3, m5, m6, m8)
			+ m2 * this.Det2(m3, m4, m6, m7);
	}

	//  m0  m1  m2  m3
	//  m4  m5  m6  m7
	//  m8  m9 m10 m11
	// m12 m13 m14 m15
	Mat4.prototype.Det = function(){
		var m = this.arr;
		return  + m[0] * this.Det3(
				m[5], m[6], m[7],
				m[9], m[10], m[11],
				m[13], m[14], m[15]
			)
			- m[1] * this.Det3(
				m[4], m[6], m[7],
				m[8], m[10], m[11],
				m[12], m[14], m[15]
			)
			+ m[2] * this.Det3(
				m[4], m[5], m[7],
				m[8], m[9], m[11],
				m[12], m[13], m[15]
			)
			- m[3] * this.Det3(
				m[4], m[5], m[6],
				m[8], m[9], m[10],
				m[12], m[13], m[14]
			);
	}

	//  m0  m1  m2  m3
	//  m4  m5  m6  m7
	//  m8  m9 m10 m11
	// m12 m13 m14 m15
	Mat4.prototype.Transpoint3 = function(pt) {
		var m = this.arr;
		var px = pt[0], py = pt[1], pz = pt[2];
		var npt = new Float32Array(3);
		npt[0] = m[12] + px * m[0] + py * m[4] + pz * m[8];
		npt[1] = m[13] + px * m[1] + py * m[5] + pz * m[9];
		npt[2] = m[14] + px * m[2] + py * m[6] + pz * m[10];
		var pw = m[15] + px * m[3] + py * m[7] + pz * m[11];
		if(pw != 1.0 && pw != 0.0){
			npt[0] /= pw;
			npt[1] /= pw;
			npt[2] /= pw;
		}
		return npt;
	}

	//  m0  m1  m2  m3
	//  m4  m5  m6  m7
	//  m8  m9 m10 m11
	// m12 m13 m14 m15
	Mat4.prototype.Transpoint4 = function(pt) {
		var m = this.arr;
		var px = pt[0], py = pt[1], pz = pt[2], pw = pt[3];
		var npt = new Float32Array(4);
		npt[0] = pw * m[12] + px * m[0] + py * m[4] + pz * m[8];
		npt[1] = pw * m[13] + px * m[1] + py * m[5] + pz * m[9];
		npt[2] = pw * m[14] + px * m[2] + py * m[6] + pz * m[10];
		npt[3] = pw * m[15] + px * m[3] + py * m[7] + pz * m[11];
		return npt;
	}


	window["mat4"] = { New: New };
})(window);
