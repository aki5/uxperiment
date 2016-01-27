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

	function New(dist, cent, yaw, pitch) {
		return new Camera(dist, cent, yaw, pitch);
	}

	function Camera(dist, cent, yaw, pitch) {
		this.dist = dist ? dist : 200.0;
		this.cent = cent ? cent : [0,0,0];
		this.yaw = yaw ? yaw : 0.0;
		this.pitch = pitch ? pitch : 0.0;
		this.drag = null;
		this.xy = [0,0];
	}

	Camera.prototype.Copy = function() {
		return new Camera(this.dist, this.cent, this.yaw, this.pitch);
	}

	Camera.prototype.Position = function(){
		return [
			this.cent[0] + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
			this.cent[1] + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist,
			this.cent[2] + Math.sin(this.pitch) * this.dist
		];
	}

	Camera.prototype.Center = function(){
		return this.cent;
	}

	Camera.prototype.Direction = function(){
		var pos = this.Position();
		var cent = this.cent;
		return norm3([cent[0]-pos[0], cent[1]-pos[1], cent[2]-pos[2]]);
	}

	Camera.prototype.Update = function(yaw, pitch) {
		this.yaw = this.drag.yaw + yaw;
		if(this.yaw > Math.PI)
			this.phi -= 2.0*Math.PI;
		if(this.yaw < -Math.PI)
			this.yaw += 2.0*Math.PI;
		this.pitch = this.drag.pitch + pitch;
		if(this.pitch > 0.49*Math.PI)
			this.pitch = 0.49*Math.PI;
		if(this.pitch < -0.49*Math.PI)
			this.pitch = -0.49*Math.PI;
	}

	Camera.prototype.mousedown = function(x, y){
		this.drag = this.Copy();
		this.xy = [x,y];
		return false;
	}

	Camera.prototype.mousemove = function(x, y){
		if(this.drag != null){
			this.Update((x - this.xy[0]) * 1e-2, (y - this.xy[1]) * 1e-2);
			return true;
		}
		return false;
	}

	Camera.prototype.mouseup = function(x, y){
		this.drag = null;
		return false;
	}

	Camera.prototype.mousewheel = function(x, y, delta){
		if(delta > 0)
			this.dist *= 1.10;
		if(delta < 0)
			this.dist *= 0.90;
		return true;
	}

	window["camera"] = { New: New };
})(window);

