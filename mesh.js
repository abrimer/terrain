/**
 * @module mesh ... functions to generate the basic map
 *
 *	a mesh is a triangular tessalation of the map.
 *	a mesh includes:
 *		pts	... the original well spaced points
 *		vor	... Voronoi tesselation of those points
 *		vxs	... <x,y> coordinate of each Voronoi vertex
 *		adj	... list of vertex indices of neighors of each vertex
 *		tris	... list of <x,y> coordinates neighbors of each vertex
 *
 *		edges	... list of [index, index, <x,y>, <x,y>] tupples
 *
 *	O'Leary observed that a map created on a square grid never
 *	loses its regularity, so he wanted to build the map on an
 *	irregular grid.  But he found randomly chosen grids to be
 *	too irregular.  Mesh generation implements his compromise.
 *
 *	1. He starts by generating N completely randomly chosen points.
 *	   But these turn out to be a little to clumpy, so he smoothes
 *	   them out (improves them) by finding the Voronoi polygons
 *	   around those points and using their vertices.
 *
 *	2. He uses those (improved) points as the centers for a
 *	   second Voronoi tesselation.  The edges of those polygons
 *	   are then converted into a triangular grid
 *
 * NOTE: <x,y> coordinates are relative to the center of the map
 */
"use strict";

/**
 * generatePoints: generate N random <x,y> points
 *	-0.5 <= x,y < 0.5
 *
 * @param	number of desired points
 * @param	extent (range limits)
 * @return	a list of n tupples
 */
function generatePoints(n, extent) {
    extent = extent || defaultExtent;
    var pts = [];
    for (var i = 0; i < n; i++) {
        pts.push([(runif(0,1) - 0.5) * extent.width, (runif(0,1) - 0.5) * extent.height]);
    }

    return pts;
}

var randomSeed = 0;

var seedRandom = new Math.seedrandom(randomSeed);

var simplexPoints = new FastSimplexNoise({
        amplitude: 1,
				frequency: 8,
				octaves: 1,
				max: 1,
				min: -1,
        random: seedRandom
});

// var value = simplexPoints.raw2D(x,y)

var newRand = new MersenneTwister(randomSeed);
  newRand.random()

function generateSimplexPoints(n, extent) {
    extent = extent || defaultExtent;
    var pts = [];
    for (var i = 0; i < n; i++) {
        pts.push([(runif(0,1) - 0.5) * extent.width, (runif(0,1) - 0.5) * extent.height]);
    }




    return pts;
}

// // Linear Congruential Generator
// // Variant of a Lehman Generator
// var lcg = (function() {
//   // Set to values from http://en.wikipedia.org/wiki/Numerical_Recipes
//       // m is basically chosen to be large (as it is the max period)
//       // and for its relationships to a and c
//   var m = 4294967296,
//       // a - 1 should be divisible by m's prime factors
//       a = 1664525,
//       // c and m should be co-prime
//       c = 1013904223,
//       seed, z;
//   return {
//     setSeed : function(val) {
//       z = seed = val || Math.round(Math.random() * m);
//     },
//     getSeed : function() {
//       return seed;
//     },
//     rand : function() {
//       // define the recurrence relationship
//       z = (a * z + c) % m;
//       // return a float in [0, 1)
//       // if z = m then z / m = 0 therefore (z % m) / m < 1 always
//       return z / m;
//     }
//   };
// }());



function createLCG(options) {
	options = options || {};
	var seed = typeof options.seed === 'undefined' ?
		1 : options.seed;
	var a = typeof options.multiplier === 'undefined' ?
		16807 : options.multiplier;
	var c = typeof options.increment === 'undefined' ?
		0 : options.increment;
	var m = typeof options.modulus === 'undefined' ?
		2147483647 : options.modulus;

	var state = Math.abs(seed);
  var stateCount = 0;
	return {
    rand: function() {
  		var result = (state*a + c) % m;
  		state = result;
      stateCount++;

  		return result / m;
    },
    getState: function() {
      return state;
    }
	};
}
var randLCG = createLCG(lcgOptions)

function skipLCG(n) {
  for (let i = 0; i < n-1; i++) {
    randLCG.rand();
  }
  return randLCG.rand();
}


var lcgOptions = {
  seed: 1,
  a: 5^19,
  b: 11,
  m: Math.pow(2,32)
};

skipLCG(1000000)


var globalY = -1;
var sliceHeight = 0.01

function generateSlicePoints(n,extent,sliceCount) {

  var sumSlices = [];
  var tempSlice;
  for (let i = 0; i < sliceCount; i++) {
    sumSlices.push(generateRowSlice(n,extent));
    globalY = sliceHeight + globalY;
  }
  var merged = [].concat.apply([], sumSlices);
  return merged;
  globalY = extent.height-sliceHeight;
}

function generateRowSlice(n, extent) {
  extent = extent || defaultExtent;
  var pts = [];
  var nCol = 50;

  for (let i = 0; i < nCol; i++) {
    pts.push([
      runif(-extent.width/2,extent.width/2),
      runif(globalY,globalY+sliceHeight)
    ]);
  }
  return pts;
}


function generateGrid(n, extent) {
  extent = extent || defaultExtent;
  var pts = [];

  var rowSize = Math.round(Math.sqrt(n/aspectRatio));
  var columnSize = Math.round(Math.sqrt(n*aspectRatio));
  var height = columnSize;
  var width = rowSize;
  // var value = [];
  // for (let y = 0; y < height; y++) {
  //   value[y] = [];
  //   for (let x = 0; x < width; x++) {
  //     let nx = x/width - 0.5;
  //     let ny = y/height - 0.5;
  //     if (simplexPoints.in2D(nx, ny) < 0.75) {
  //       value[y][x] = 0;
  //     } else {
  //       value[y][x] = simplexPoints.in2D(nx, ny);
  //     }
  //   }
  // }

  var halfWidth = 0.5*extent.width;
  var halfHeight = 0.5*extent.height;
  var arrX = linSpace(-halfWidth,halfWidth,rowSize);
  var arrY = linSpace(-halfHeight,halfHeight,columnSize);

  for (var i = 0; i < rowSize; i++) {
      for (var j = 0; j < columnSize; j++) {
        if (Math.round(runif(0,1)) == 1) {
          pts.push([arrX[i],arrY[j]]);
          // pts.push([simplex.noise2D(i,j), simplex.noise2D(j,i)]);
        }

      }
  }
  return pts;
}

function linSpace(startValue, stopValue, cardinality) {
  var arr = [];
  var currValue = startValue;
  var step = (stopValue - startValue) / (cardinality - 1);
  for (var i = 0; i < cardinality; i++) {
    arr.push(Math.round((currValue + (step * i)) * 10000) / 10000);
  }
  return arr;
}



/**
 * centroid - centroid of
 * @param	set of <x,y> points
 * @return	<x,y> centroid coordinates
 */
function centroid(pts) {
    var x = 0;
    var y = 0;
    for (var i = 0; i < pts.length; i++) {
        x += pts[i][0];
        y += pts[i][1];
    }
    return [x/pts.length, y/pts.length];
}

/**
 * improvePoints: smooth a set of random points
 *
 * @param 	set of <x,y> points
 * @param	number of smoothing iterations
 * @param	extent (range limits)
 * @return	list of smoother <x,y> coordinates
 *
 * each iteration smooths out the distribution of the points
 *	for each point in the set
 *	    generate surrounding Voronoi polygon
 *	    use the centroid of that polygon
 */
function improvePoints(pts, n, extent) {
    n = n || 1;
    extent = extent || defaultExtent;
    for (var i = 0; i < n; i++) {
        pts = voronoi(pts, extent)
            .polygons(pts)
            .map(centroid);
    }

    pts.sort(function(a, b) {
      //sort by y, secondary by x
      return a[1] == b[1] ? a[0] - b[0] : a[1] - b[1];
    });



    // if (previousMesh !== undefined) {
    //   var tempPts = previousMesh.mesh.pts.slice(pts.length - overlapAmount);
    //   tempPts.forEach(function (item,index,arr) {
    //       var newItem = [item[0], item[1]-(2-overlap)];
    //       arr[index] = newItem;
    //   });
    //   pts.splice(0,overlapAmount,...tempPts);
    //   return pts;
    // }

    return pts;
}

/**
 * generateGoodPoints: generate attractive random grid
 *
 * @param	number of points
 * @param	extent (range limits)
 * @return	list of <x,y> coordinates
 *
 * 1. generate a set of random points in the map
 * 2. run one improvement iteration on them
 */
function generateGoodPoints(n, extent) {
    extent = extent || defaultExtent;
    var pts = generatePoints(n, extent);
    // var pts = generateGrid(n, extent);


    // pts = sortWithIndices(pts);
    pts.sort(function(a, b) {
      //sort by x, secondary by y
      return a[1] == b[1] ? a[0] - b[0] : a[1] - b[1];
    });

    return improvePoints(pts, 1, extent);
}

// identify the Voronoi sets associated with a set of points
/**
 * voronoi: compute the Voronoi tesselation for a set or points
 *
 * @param	list of <x,y> coordinates
 * @param	extent (range limits)
 * @param	list of Voronoi regions
 */
function voronoi(pts, extent) {
    extent = extent || defaultExtent;
    var w = extent.width/2;
    var h = extent.height/2;
    return d3.voronoi().extent([[-w, -h], [w, h]])(pts);
}

/**
 * makeMesh - turn a set of well distributed points into a mesh
 *
 * @param	list of <x,y> coordinates
 * @param	extent (size range)
 */
function makeMesh(pts, extent) {
    extent = extent || defaultExtent;

    // compute the Voronoi polygons
    var vor = voronoi(pts, extent);
    var vxs = [];	// vertex locations
    var vxids = {};	// vertex ID #s
    var adj = [];	// adjacent vertices
    var edges = [];	// list of vertex IDs and positions
    var tris = [];	// coordinates of neighbors of this vertex

    // for each edge of each Voronoi polygon
    for (var i = 0; i < vor.edges.length; i++) {
	// get the two end points of this edge
        var e = vor.edges[i];
        if (e == undefined) continue;

	// lookup (or assign) their vertex IDs
        var e0 = vxids[e[0]];
        if (e0 == undefined) {
            e0 = vxs.length;
            vxids[e[0]] = e0;
            vxs.push(e[0]);
        }
        var e1 = vxids[e[1]];
        if (e1 == undefined) {
            e1 = vxs.length;
            vxids[e[1]] = e1;
            vxs.push(e[1]);
        }

	// note that each end-point is adjacent to the other
        adj[e0] = adj[e0] || [];
        adj[e0].push(e1);
        adj[e1] = adj[e1] || [];
        adj[e1].push(e0);

	// add indices and coordinates to known edges
        edges.push([e0, e1, e.left, e.right]);

	// note all edges entering the left end point
        tris[e0] = tris[e0] || [];
        if (!tris[e0].includes(e.left)) tris[e0].push(e.left);
        if (e.right && !tris[e0].includes(e.right)) tris[e0].push(e.right);

	// note all edges entering the right end point
        tris[e1] = tris[e1] || [];
        if (!tris[e1].includes(e.left)) tris[e1].push(e.left);
        if (e.right && !tris[e1].includes(e.right)) tris[e1].push(e.right);
    }

    // the new mesh contains all of these things
    var mesh = {
        pts: pts,	// a set of nicely spaced random points
        vor: vor,	// Voronoi tesselation of those points
        vxs: vxs,	// locations of each vertex
        adj: adj,	// indices of neighbors
        tris: tris,	// coordinates of neighbors
        edges: edges,	// the set of all edges
        extent: extent	// the scale
    }

    /*
     * mesh.map(f) applies f to every vertex in mesh
     */
    mesh.map = function (f) {
        var mapped = vxs.map(f);
        mapped.mesh = mesh;
        return mapped;
    }
    return mesh;
}


/**
 * generateGoodMesh - top level mesh generation
 *
 * @param	number of desired points
 * @param	extent (size limits)
 * @return	mesh
 */
function generateGoodMesh(n, extent) {
    extent = extent || defaultExtent;
    var pts = generateGoodPoints(n, extent);
    // var pts = generateSlicePoints(n, extent, 200);
    // var pts = generateGrid(n,extent);
    return makeMesh(pts, extent);
}

/**
 * isedge - is a point on the map edge
 *
 * @param	mesh
 * @param	index of point of interest
 * @return	true ... point is on the edge
 *
 * In the final (triangular) grid points on the edge have
 * only two neighbors, while internal points have 3 or more.
 */
function isedge(mesh, i) {
    return (mesh.adj[i].length < 3);
}

// near edge means in the outer 5% of the map
/**
 * isnearedge - is a point near the map edge
 *
 * @param	mesh
 * @param	index of point of interest
 * @return	true ... point is within 5% of edge
 */
function isnearedge(mesh, i) {
    var x = mesh.vxs[i][0];
    var y = mesh.vxs[i][1];
    var w = mesh.extent.width;
    var h = mesh.extent.height;
    return x < -0.475 * w || x > 0.475 * w || y < -0.475 * h || y > 0.475 * h;
}

/**
 * neighbors - neighbors of a vertex
 *
 * @param	mesh
 * @param	index of point of interest
 * @return	list of indices (of neighboring points)
 */
function neighbours(mesh, i) {
    var onbs = mesh.adj[i];
    var nbs = [];
    for (var i = 0; i < onbs.length; i++) {
        nbs.push(onbs[i]);
    }
    return nbs;
}

/**
 * distance - distance between two points
 *
 * @param	mesh
 * @param	index of first point
 * @param	index of second point
 * @return	(positive) distance between them
 */
function distance(mesh, i, j) {
    var p = mesh.vxs[i];
    var q = mesh.vxs[j];
    return Math.sqrt((p[0] - q[0]) * (p[0] - q[0]) + (p[1] - q[1]) * (p[1] - q[1]));
}


/**
 * visualizePoints - plot points on a map
 *
 * @param	SVG field
 *		(1000x1000, centered <0,0>)
 * @param	list of <x,y> coordinates
 *		in range <-0.5,-0.5> to <0.5,0.5>
 */
function visualizePoints(svg, pts) {
    // remove all exising circles from the SVG
    var circle = svg.selectAll('circle').data(pts);
    circle.enter()		// HELP
        .append('circle');	// HELP
    circle.exit().remove();	// HELP

    // translate 0-1 coordinates into 1Kx1K coordinaces
    // with radius of 1% of field with
    d3.selectAll('circle')
        .attr('cx', function (d) {return 1000*d[0]})
        .attr('cy', function (d) {return 1000*d[1]})
        .attr('r', 100 / Math.sqrt(pts.length));
}

/**
 * makeD3Path - construct path connecting a set of points
 *	start at first point, draw line to each subsequent point
 *
 * @param	list of <x,y> coordinates
 * @return	string representation of connecting path
 */
function makeD3Path(path) {
    var p = d3.path();
    p.moveTo(1000*path[0][0], 1000*path[0][1]);
    for (var i = 1; i < path.length; i++) {
        p.lineTo(1000*path[i][0], 1000*path[i][1]);
    }
    return p.toString();
}

/**
 * drawPaths - draw line connecting a set of points
 *
 * @param	SVG field
 * @param	class of path to draw
 * @param	list of <x,y> coordinates
 */
function drawPaths(svg, cls, paths) {
    // remove all existing paths from the SVG
    var paths = svg.selectAll('path.' + cls).data(paths)
    paths.enter()
            .append('path')
            .classed(cls, true)
    paths.exit()
            .remove();

    // draw line along the connecting path
    svg.selectAll('path.' + cls)
        .attr('d', makeD3Path);
}
