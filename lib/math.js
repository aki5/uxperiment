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

function normal3(vert1, vert2, vert3) {
	var v21 = sub3(vert1, vert2);
	var v23 = sub3(vert3, vert2);
	var cross = cross3(v23, v21);
	return norm3(cross);
}

function add3(a, b) {
	return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
}

function sub3(a, b) {
	return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}

function scale3(a, s) {
	return [a[0]*s, a[1]*s, a[2]*s];
}

function lerp3(a, b, t){
	return add3(a, scale3(sub3(b, a), t));
}

function cross3(a, b) {
	return [
		a[1]*b[2] - a[2]*b[1], // x = yzzy
		a[2]*b[0] - a[0]*b[2],
		a[0]*b[1] - a[1]*b[0]
	];
}

function dot3(a, b) {
	return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function len3(a) {
	return Math.sqrt(dot3(a, a));
}

function norm3(a) {
	var t = len3(a);
	return [a[0]/t, a[1]/t, a[2]/t];
}

function theta3(a, b) {
	var cosTheta = dot3(a, b) / (len3(a)*len3(b));
	return Math.acos(cosTheta);
}


function scale4(a, s) {
	return [a[0]*s, a[1]*s, a[2]*s, a[3]*s];
}

function blend4(a, b) {
	var alpha = a[3];
	var afact = alpha;
	var bfact = 1.0-alpha;
	return [
		a[0]*afact + b[0]*bfact,
		a[1]*afact + b[1]*bfact,
		a[2]*afact + b[2]*bfact,
		a[3]*afact + b[3]*bfact,
	];
}

