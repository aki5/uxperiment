
(function(window){

	/* mouse interface */

	function New(scene){
		return new Select(scene);
	}

	function Select(scene){
		this.scene = scene;
		this.hitIdx = -1;
		this.hitPlane = [0.0, 0.0, 1.0, 1.0];
		this.hitOffset = [0.0, 0.0, 0.0];
		this.selection = [];
	}

	Select.prototype.Selection = function(obj) {
		return this.selection;
	}

	Select.prototype.Pick = function(rayOrig, rayDest){

		var mint = 2.0;
		this.hitIdx = -1;

		for(var i = 0; i < this.scene.csgExpr.length; i++){
			var expr = this.scene.csgExpr[i];
			var xOrig = expr.m4invmodel.Transpoint3(rayOrig);
			var xDest = expr.m4invmodel.Transpoint3(rayDest);
			var t = expr.mesh.IntersectSeg(xOrig, sub3(xDest, xOrig));
			if(t != -1.0 && t < mint){
				var isectPt = add3(rayOrig, scale3(sub3(rayDest, rayOrig), t));
				mint = t;
				this.hitIdx = i;
				this.hitPlane[3] = -dot3(this.hitPlane, isectPt);
				this.hitOffset = sub3(isectPt, expr.position); // from origin to isect point.
			}
		}
	}

	// TODO: this belongs to a move tool
	Select.prototype.Drag = function(rayOrig, rayDest){
		var Eps = 0.000001;
		var rayDir = sub3(rayDest, rayOrig);

		var expr =  this.scene.csgExpr[this.hitIdx];
		var pldot = dot3(rayDir, this.hitPlane);
		if(pldot < Eps || pldot > Eps){
			var t = -(dot3(rayOrig, this.hitPlane) + this.hitPlane[3]) / pldot;
			if(t != -1.0){
				var isectPt = add3(rayOrig, scale3(sub3(rayDest, rayOrig), t));
				expr.position = sub3(isectPt, this.hitOffset); // from isect point to origin
				expr.m4model = mat4.New().Id().Translate(expr.position);
				expr.m4invmodel = expr.m4model.Copy().Inverse();
			}

		}
		updateFunc();
	}

	window["select"] = { New: New };

})(window);
