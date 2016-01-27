// Adaptation of a public TinkerCAD shape generator
// https://www.tinkercad.com/
function cylinder(gl, lod, height, r1, r2, color) {

	var cl = [0,0,-height/2];
	var ch = [0,0,height/2];
	var pl = [r1,0,-height/2];
	var ph = [r2,0,height/2];

	var tris = [];
	for (var i = 0; i < lod; i++) {
		var a = (i+1)/lod * Math.PI*2;
		var s = Math.sin(a);
		var c = Math.cos(a);
		var nl = [r1*c, -r1*s, -height/2];
		var nh = [r2*c, -r2*s, height/2];
		tris.push([pl, ph, nl]);
		tris.push([nl, ph, nh]);
		tris.push([cl, pl, nl]);
		tris.push([ch, nh, ph]);
		pl = nl;
		ph = nh;
	}

	console.log("cylinder of " + tris.length + " triangles");

	var m = mesh.New(tris.length, color);
	for (var i = 0; i < tris.length; i++)
		m.AddTriangle(null, tris[i][0], tris[i][1], tris[i][2], color);

	m.Load(gl);
	return m;
}

// Adaptation of a public TinkerCAD shape generator
// https://www.tinkercad.com/
function icosphere(gl, lod, r, color) {
	var tau = 0.8506508084;
	var one = 0.5257311121;

	var v = [
		[ tau, one, 0.0 ],
		[-tau, one, 0.0 ],
		[-tau,-one, 0.0 ],
		[ tau,-one, 0.0 ],
		[ one, 0.0, tau ],
		[ one, 0.0,-tau ],
		[-one, 0.0,-tau ],
		[-one, 0.0, tau ],
		[ 0.0, tau, one ],
		[ 0.0,-tau, one ],
		[ 0.0,-tau,-one ],
		[ 0.0, tau,-one ]
	];

	var tris = [
		[ v[4], v[8], v[7] ],
		[ v[4], v[7], v[9] ],
		[ v[5], v[6],v[11] ],
		[ v[5],v[10], v[6] ],
		[ v[0], v[4], v[3] ],
		[ v[0], v[3], v[5] ],
		[ v[2], v[7], v[1] ],
		[ v[2], v[1], v[6] ],
		[ v[8], v[0],v[11] ],
		[ v[8],v[11], v[1] ],
		[ v[9],v[10], v[3] ],
		[ v[9], v[2],v[10] ],
		[ v[8], v[4], v[0] ],
		[v[11], v[0], v[5] ],
		[ v[4], v[9], v[3] ],
		[ v[5], v[3],v[10] ],
		[ v[7], v[8], v[1] ],
		[ v[6], v[1],v[11] ], 
		[ v[7], v[2], v[9] ],
		[ v[6],v[10], v[2] ]
	];
    
	for (var i = 0; i < lod; i++) {
		var ntris = [];
		for(var j = 0; j < tris.length; j++) {
			var ma = norm3(add3(tris[j][0], tris[j][1]));
			var mb = norm3(add3(tris[j][1], tris[j][2]));
			var mc = norm3(add3(tris[j][2], tris[j][0]));

			ntris.push([tris[j][0], ma, mc]);
			ntris.push([tris[j][1], mb, ma]);
			ntris.push([tris[j][2], mc, mb]);
			ntris.push([ma, mb, mc]);
		}
		tris = ntris;
	}

	var m = mesh.New(tris.length, color);
	for (var i = 0; i < tris.length; i++){
		var v1 = scale3(tris[i][0],r);
		var v2 = scale3(tris[i][1],r);
		var v3 = scale3(tris[i][2],r);
		m.AddTriangle(normal3(v1, v2, v3), v1, v2, v3, color);
	}
	m.Load(gl);
 
	return m;
}
