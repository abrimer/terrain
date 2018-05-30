/**
 * @module height.js ... functions to generate/mutate/query height maps
 *
 * 	a height map is a list of (nomally 0-1) heights,
 *	with a 1x1 correspondance to chosen horizontal mesh
 */
"use strict";

function sumArray(a, b) {
    return a + b;
}

/**
 * zero ... return a heightmap of all zeroes
 *
 * @param	mesh
 * @return	heightmap of all zeroes
 */
function zero(mesh) {
    var z = [];
    for (var i = 0; i < mesh.vxs.length; i++) {
        z[i] = 0;
    }
    z.mesh = mesh;
    return z;
}

function randArb(min, max) {
  return Math.random() * (max - min) + min;
}


/**
 * slopeRiver ... create a sloping height map
 *
 * @param	mesh
 * @param	imposed slope gradient
 */
function slopeRiver(mesh, direction) {
    return mesh.map(function (x) {
      if (x[0] < 0) {
        return Math.pow(1.75*x[0]*-direction[0],1)
        - Math.sin(x[1]*direction[0])
        - Math.sin(0.7*x[1]*direction[0])
        // return Math.pow(x[0]*-direction[0],1) - Math.cos(x[1]*direction[0])
      } else {
        return Math.pow(1.75*x[0]*direction[0],1)
        + Math.sin(x[1]*direction[0])
        + Math.sin(0.7*x[1]*direction[0])
        // + Math.sin(0.25*x[1]*direction[0])
      }
    });
}
// /**
//  * slopeRiver ... create a sloping height map
//  *
//  * @param	mesh
//  * @param	imposed slope gradient
//  */
// function slopeRiver(mesh, direction) {
//     return mesh.map(function (x) {
//         if (x[0] < 0) {
//
//           return Math.pow(x[0]*-1*direction[0],1) - 8*Math.cos(x[1]*direction[1]);
//         } else {
//
//           return Math.pow(x[0]*direction[0],1) + 8*Math.cos(x[1]*direction[1]);
//         }
//     });
// }

//
// /**
//  * slope ... create a sloping height map
//  *
//  * @param	mesh
//  * @param	imposed slope gradient
//  */
// function slopeRiver(mesh, direction) {
//     return mesh.map(function (x) {
//       if (x[0] < 0) {
//         return -(x[0]*direction[0] + 2*Math.cos(x[1]*direction[1]));
//       } else {
//         return x[0]*direction[0] + 2*Math.cos(x[1]*direction[1]);
//       }
//     });
// }

/**
 * slope ... create a sloping height map
 *
 * @param	mesh
 * @param	imposed slope gradient
 */
function slope(mesh, direction) {
    return mesh.map(function (x) {
        return   x[0]*direction[0] + x[1]*direction[1]
    });
}

/**
 * cone ... create centered conical height map
 *	height = slope x radius out from center
 *
 * @param	mesh
 * @param	cone slope (dz/dxy)
 * @return	new height map
 */
function cone(mesh, slope) {
    return mesh.map(function (x) {
        return Math.pow(x[0] * x[0] + x[1] * x[1], 0.5) * slope;
    });
}

/**
 * heightmap.map(f) applies f to every point in heightmap
 */
function map(h, f) {
    var newh = h.map(f);
    newh.mesh = h.mesh;
    return newh;
}

/**
 * normalize ... normalize a height map to (0-1)
 *
 * @param	height map
 * @return	new height map
 */
function normalize(h) {
    var lo = d3.min(h);
    var hi = d3.max(h);
    return map(h, function (x) {return (x - lo) / (hi - lo)});
}

/**
 * peaky ... exaggerate the vertical relief
 *
 *	replace each height with its square root
 *	leaves mountains high, but flattens low-lands
 *
 * @param	height map
 * @return	new (normalized) height map
 */
function peaky(h) {
    return map(normalize(h), Math.sqrt);
}

/**
 * spiky ... make mountains concave
 *
 *  replace each height with its square
 *  leaves tallest mountains high and lowers all else
 *
 * @param   height map
 * @return  new (normalized) height map
 */
function spiky(h) {
    return map(normalize(h), function (x) {return Math.pow(x, 2)});
}

/**
 * downhill - construct/return a
 *
 * @param	height map
 * @return	list <x,y> of most down-hill neigtbor of every point
 *
 * We remember this, so we don't have to recompute it
 */
function downhill(h) {
    if (h.downhill) return h.downhill;

    /**
     * downfrom - return index of down-hill neighbor
     *	-1 if this is a local minimum
     *	-2 if this is at edge of map
     */
    function downfrom(i) {
        if (isedge(h.mesh, i)) return -2;
        var best = -1;
        var besth = h[i];
        var nbs = neighbours(h.mesh, i);
        for (var j = 0; j < nbs.length; j++) {
            if (h[nbs[j]] < besth) {
                besth = h[nbs[j]];
                best = nbs[j];
            }
        }
        return best;
    }

    // find down-hill from every point in mesh
    var downs = [];
    for (var i = 0; i < h.length; i++) {
        downs[i] = downfrom(i);
    }
    h.downhill = downs;
    return downs;
}

/**
 * trislope - return the gradient at a point
 *
 * @param	height map
 * @param	index of point of interest
 * @return	<dx,dy> gradient
 */
function trislope(h, i) {
    var nbs = neighbours(h.mesh, i);
    if (nbs.length != 3) return [0,0];
    var p0 = h.mesh.vxs[nbs[0]];
    var p1 = h.mesh.vxs[nbs[1]];
    var p2 = h.mesh.vxs[nbs[2]];

    var x1 = p1[0] - p0[0];
    var x2 = p2[0] - p0[0];
    var y1 = p1[1] - p0[1];
    var y2 = p2[1] - p0[1];

    var det = x1 * y2 - x2 * y1;
    var h1 = h[nbs[1]] - h[nbs[0]];
    var h2 = h[nbs[2]] - h[nbs[0]];

    return [(y2 * h1 - y1 * h2) / det,
            (-x2 * h1 + x1 * h2) / det];
}

/**
 * getSlope - compute a steepness map
 *
 * @param	height map
 * @return	new map of steepness
 */
function getSlope(h) {
    var dh = downhill(h);
    var slope = zero(h.mesh);

    for (var i = 0; i < h.length; i++) {
        var s = trislope(h, i);
        slope[i] = Math.sqrt(s[0] * s[0] + s[1] * s[1]);
        continue;

	// apparently an abandoned older version
        if (dh[i] < 0) {	// local minima have no slope
            slope[i] = 0;
        } else {		// slope to downhill neighbor
            slope[i] = (h[i] - h[dh[i]]) / distance(h.mesh, i, dh[i]);
        }
    }
    return slope;
}


/**
 * add ... sum multiple height maps
 *
 * @param	first map
 * @param	... n'th map
 * @return	new height map (sum of args)
 */
function add() {
    var n = arguments[0].length;
    var newvals = zero(arguments[0].mesh);
    // for each point in mesh
    for (var i = 0; i < n; i++) {
	// for each map
        for (var j = 0; j < arguments.length; j++) {
            newvals[i] += arguments[j][i];
        }
    }
    return newvals;
}

/**
 * mountains ... create a mountainous height map
 *	height = (e^-dist/radius)^2
 *
 * @param	mesh
 * @param	number of mountains
 * @param	desired radius
 * @return	new height map
 */
function mountains(mesh, n, r) {
    r = r || 0.05;

    // choose a center location for each desired mountain
    var mounts = [];
    for (var i = 0; i < n; i++) {
        mounts.push([mesh.extent.width * (Math.random() - 0.5), mesh.extent.height * (Math.random() - 0.5)]);
    }

    var newvals = zero(mesh);
    // for each point in mesh
    for (var i = 0; i < mesh.vxs.length; i++) {
        var p = mesh.vxs[i];
	// for each mountain
        for (var j = 0; j < n; j++) {
            var m = mounts[j];
	    // compute the height that mounain adds to this point
            newvals[i] += Math.pow(Math.exp(-((p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1])) / (2 * r * r)), 2);
        }
    }
    return newvals;
}

/**
 * ridges ... create long mountains on the height map
 *  height = (e^-dist/radius)^2
 *
 * @param   mesh
 * @param   number of ridges
 * @param   desired width of ridges
 * @param   desired length of ridges (in units of width)
 * @return  new height map
 */
function ridges(mesh, n, r1, r2) {
    n = n || 5;
    r1 = r1 || 0.02;
    r2 = r2 || 20;

    // choose a center location for the ridges
    var cent = [((Math.random() - 0.5) * 0.5), ((Math.random() - 0.5) * 0.5)];
    var angle = Math.random() * 2 * Math.PI;
    var ridgeangle = angle + Math.PI / 2;
    var inter = [];
    for (var i = 0; i < n; i++) {
        inter.push((2.5 + Math.random() * 0.5) * r1);
    }
    var interCenter = inter.reduce(sumArray, 0) / 2.0;
    // extrapolate from center to each ridge center
    var mounts = [];
    for (var i = 0; i < n; i++) {
        var ridgecheatw = (Math.random() - 0.5) * r1 * 2;
        var ridgecheath = (Math.random() - 0.5) * r1 * 2;
        var fromCenter = interCenter - inter.slice(0,i).reduce(sumArray, 0);
        var ridgecent = [cent[0] + Math.cos(angle) * fromCenter + ridgecheatw, cent[1] + Math.sin(angle) * fromCenter + ridgecheath];
        var ridgeLength = Math.floor(Math.random() * (r2 + 1)) + Math.floor(r2 / 2);
        for (var j = 0; j < ridgeLength; j++) {
            var thisAngle = ridgeangle + (Math.random() - 0.5) * Math.PI * 0.1;
            var cheatw = (Math.random() - 0.5) * r1 * 0.5;
            var cheath = (Math.random() - 0.5) * r1 * 0.5;
            var wdist = r1 * (j - r2/2) + (Math.random() - 0.5) * r1 * 0.5;
            var hdist = r1 * (j - r2/2) + (Math.random() - 0.5) * r1 * 0.5;
            mounts.push([ridgecent[0] + Math.cos(thisAngle) * wdist + cheatw, ridgecent[1] + Math.sin(thisAngle) * hdist + cheath]);
        }
    }

    var newvals = zero(mesh);
    // for each point in mesh
    for (var i = 0; i < mesh.vxs.length; i++) {
        var p = mesh.vxs[i];
        // for each mountain
        for (var j = 0; j < mounts.length; j++) {
            var m = mounts[j];
            // compute the height that mountain adds to this point
            newvals[i] += 0.5 * Math.pow(Math.exp(-((p[0] - m[0]) * (p[0] - m[0]) + (p[1] - m[1]) * (p[1] - m[1])) / (2 * r1 * r1)), 2);
        }
    }
    return newvals;
}

/**
 * relax ... average with neighbors to smoothe terrain
 *
 * @param	height map
 * @return	new height map
 */
function relax(h) {
    var newh = zero(h.mesh);
    for (var i = 0; i < h.length; i++) {
        var nbs = neighbours(h.mesh, i);
	// points on border are set to zero
        if (nbs.length < 3) {
            newh[i] = 0;
            continue;
        }
	// new height = average height of neighbors
        newh[i] = d3.mean(nbs.map(function (j) {return h[j]}));
    }
    return newh;
}

/**
 * quantile (return the n'th highest value)
 *
 * @param	height map
 * @param	target fraction (0-1)
 * @return	height of chosen value
 */
function quantile(h, q) {
    var sortedh = [];
    for (var i = 0; i < h.length; i++) {
        sortedh[i] = h[i];
    }
    sortedh.sort(d3.ascending);
    return d3.quantile(sortedh, q);
}

/**
 * setSeaLevel ... readjust heights relative to sea-level
 *
 * @param	height map
 * @param	sea level height (0-1)
 * @return	new height map
 */
function setSeaLevel(h, q) {
    var newh = zero(h.mesh);
    // find the sea level altitude
    var delta = quantile(h, q);

    // subtract that altitude from every value
    for (var i = 0; i < h.length; i++) {
        newh[i] = h[i] - delta;
    }
    return newh;
}

/**
 * visualizeVoronoi - display a height map
 *
 * @param	SVG field
 * @param	height map to be rendered
 * @param	low value (to be displayed as zero)
 * @param	high value (to be displayed as one)
 */
function visualizeVoronoi(svg, field, lo, hi) {
    // generate a map of values to be plotted
    if (hi == undefined) hi = d3.max(field) + 1e-9;
    if (lo == undefined) lo = d3.min(field) - 1e-9;
    var mappedvals = field.map(function (x) {return x > hi ? 1 : x < lo ? 0 : (x - lo) / (hi - lo)});

    // remove all existing field path lines
    var tris = svg.selectAll('path.field').data(field.mesh.tris);
    var threeQuarters = d3.quantile(mappedvals, 0.75);
    tris.enter()
        .append('path')
        .classed('field', true);
    tris.exit()
        .remove();

    // draw a line along the connecting path
    //	using the Veridis value-to-color mapping
    svg.selectAll('path.field')
        .attr('d', makeD3Path)
        .classed('sea', function(e, i) { return mappedvals[i] === 0; })
        // .classed('land', function(e, i) { return mappedvals[i] === 0; })
        // .classed('land', function(e, i) { return mappedvals[i] > threeQuarters; })
        // .style('fill', function (d, i) {
        //   return d3.interpolateViridis(mappedvals[i]);
        // });

}
