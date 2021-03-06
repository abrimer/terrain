"use strict";

// DEFAULT PARAMS
var defaultParams = {
    extent: defaultExtent,
    generator: generateCoast,
    npts: 32768/4,
    ncities: 24,
    nterrs: 6,
    fontsizes: {
        region: 40,
        city: 25,
        town: 20
    }
}

var defaultExtent = {
    width: 1,
    height: 2
};
var aspectRatio = defaultExtent.height/defaultExtent.width;


var previousMesh;
var previousMeshCount = 0;

function generateRiver(params) {
    var mesh = generateGoodMesh(params.npts, params.extent);

    var h = add(
            simplexRiver(mesh, [1,0]),
            simplexNoise(mesh, 2),
            // simplexFuzzyNoise(mesh, 2),


            // slopeRiver(mesh, [1,0]),

            // mountains(mesh, 80)
            );
    for (var i = 0; i < 4; i++) {
        h = relax(h);
    }
    h = peaky(h);


    // previousMesh = h.seedRow;
    h = doErosion(h, runif(0.3,0.3), 3);

    h = setSeaLevel(h, runif(0.4, 0.4));

    h = fillSinks(h);
    h = cleanCoast(h, 3);

    console.log("=======")
    console.log("=======")
    console.log("=======")

    // previousMesh = h;
    previousMeshCount++;

    return h;
}


function setSeedRow(currentMesh) {

  if (previousMesh !== undefined) {
    var tempMesh = currentMesh.mesh;
    var tempRow = previousMesh.slice(previousMesh.length - overlapAmount);

    var newMesh = currentMesh.splice(0,overlapAmount,...tempRow);
    newMesh.mesh = tempMesh;
    return newMesh;
  }

  return currentMesh;
}



/**
 * rnorm - random vector generation
 *
 *	This routine is meant to be called twice, and returns
 *	first an X coordinate, and then a Y coordiante.
 */
var rnorm = (function () {
    var z2 = null;

    function rnorm() {
	// if we have a y coordinate, return it
        if (z2 != null) {
            var tmp = z2;
            z2 = null;
            return tmp;
        }

	// loop until we get a radius <= 1
        var x1 = 0;
        var x2 = 0;
        var w = 2.0;
        while (w >= 1) {
            x1 = runif(-1, 1);
            x2 = runif(-1, 1);
            w = x1 * x1 + x2 * x2;
        }
	// HELP: this has me baffled
        w = Math.sqrt(-2 * Math.log(w) / w);
        z2 = x2 * w;
        return x1 * w;
    }
    return rnorm;
})();

/**
 * randomVector - generate a random vector
 *
 * @param	maximum size
 * @return	<x,y> coordinate
 */
function randomVector(scale) {
    return [scale * rnorm(), scale * rnorm()];
}




function cleanCoast(h, iters) {
    for (var iter = 0; iter < iters; iter++) {
        var changed = 0;
        var newh = zero(h.mesh);
        for (var i = 0; i < h.length; i++) {
            newh[i] = h[i];
            var nbs = neighbours(h.mesh, i);
            if (h[i] <= 0 || nbs.length != 3) continue;
            var count = 0;
            var best = -999999;
            for (var j = 0; j < nbs.length; j++) {
                if (h[nbs[j]] > 0) {
                    count++;
                } else if (h[nbs[j]] > best) {
                    best = h[nbs[j]];
                }
            }
            if (count > 1) continue;
            newh[i] = best / 2;
            changed++;
        }
        h = newh;
        newh = zero(h.mesh);
        for (var i = 0; i < h.length; i++) {
            newh[i] = h[i];
            var nbs = neighbours(h.mesh, i);
            if (h[i] > 0 || nbs.length != 3) continue;
            var count = 0;
            var best = 999999;
            for (var j = 0; j < nbs.length; j++) {
                if (h[nbs[j]] <= 0) {
                    count++;
                } else if (h[nbs[j]] < best) {
                    best = h[nbs[j]];
                }
            }
            if (count > 1) continue;
            newh[i] = best / 2;
            changed++;
        }
        h = newh;
    }
    return h;
}

function contour(h, level) {
    level = level || 0;
    var edges = [];
    for (var i = 0; i < h.mesh.edges.length; i++) {
        var e = h.mesh.edges[i];
        if (e[3] == undefined) continue;
        // if (isnearedge(h.mesh, e[0]) || isnearedge(h.mesh, e[1])) continue;
        if ((h[e[0]] > level && h[e[1]] <= level) ||
            (h[e[1]] > level && h[e[0]] <= level)) {
            edges.push([e[2], e[3]]);
        }
    }
    return mergeSegments(edges);
}



function mergeSegments(segs) {
    var adj = {};
    for (var i = 0; i < segs.length; i++) {
        var seg = segs[i];
        var a0 = adj[seg[0]] || [];
        var a1 = adj[seg[1]] || [];
        a0.push(seg[1]);
        a1.push(seg[0]);
        adj[seg[0]] = a0;
        adj[seg[1]] = a1;
    }
    var done = [];
    var paths = [];
    var path = null;
    while (true) {
        if (path == null) {
            for (var i = 0; i < segs.length; i++) {
                if (done[i]) continue;
                done[i] = true;
                path = [segs[i][0], segs[i][1]];
                break;
            }
            if (path == null) break;
        }
        var changed = false;
        for (var i = 0; i < segs.length; i++) {
            if (done[i]) continue;
            if (adj[path[0]].length == 2 && segs[i][0] == path[0]) {
                path.unshift(segs[i][1]);
            } else if (adj[path[0]].length == 2 && segs[i][1] == path[0]) {
                path.unshift(segs[i][0]);
            } else if (adj[path[path.length - 1]].length == 2 && segs[i][0] == path[path.length - 1]) {
                path.push(segs[i][1]);
            } else if (adj[path[path.length - 1]].length == 2 && segs[i][1] == path[path.length - 1]) {
                path.push(segs[i][0]);
            } else {
                continue;
            }
            done[i] = true;
            changed = true;
            break;
        }
        if (!changed) {
            paths.push(path);
            path = null;
        }
    }
    return paths;
}

function relaxPath(path) {
    var newpath = [path[0]];
    for (var i = 1; i < path.length - 1; i++) {
        var newpt = [0.25 * path[i-1][0] + 0.5 * path[i][0] + 0.25 * path[i+1][0],
                     0.25 * path[i-1][1] + 0.5 * path[i][1] + 0.25 * path[i+1][1]];
        newpath.push(newpt);
    }
    newpath.push(path[path.length - 1]);
    return newpath;
}

function visualizeSlopes(svg, render) {
    var h = render.h;
    var strokes = [];
    var r = 0.25 / Math.sqrt(h.length);
    for (var i = 0; i < h.length; i++) {
        if (h[i] <= 0) continue;
        var nbs = neighbours(h.mesh, i);
        nbs.push(i);
        var s = 0;
        var s2 = 0;
        for (var j = 0; j < nbs.length; j++) {
            var slopes = trislope(h, nbs[j]);
            s += slopes[0] / 10;
            s2 += slopes[1];
        }
        s /= nbs.length;
        s2 /= nbs.length;
        if (Math.abs(s) < runif(0.1, 0.4)) continue;
        var l = r * runif(1, 2) * (1 - 0.2 * Math.pow(Math.atan(s), 2)) * Math.exp(s2/100);
        var x = h.mesh.vxs[i][0];
        var y = h.mesh.vxs[i][1];
        if (Math.abs(l*s) > 2 * r) {
            var n = Math.floor(Math.abs(l*s/r));
            l /= n;
            if (n > 4) n = 4;
            for (var j = 0; j < n; j++) {
                var u = rnorm() * r;
                var v = rnorm() * r;
                strokes.push([[x+u-l, y+v+l*s], [x+u+l, y+v-l*s]]);
            }
        } else {
            strokes.push([[x-l, y+l*s], [x+l, y-l*s]]);
        }
    }
    var lines = svg.selectAll('line.slope').data(strokes)
    lines.enter()
            .append('line')
            .classed('slope', true);
    lines.exit()
            .remove();
    svg.selectAll('line.slope')
        .attr('x1', function (d) {return 1000*d[0][0]})
        .attr('y1', function (d) {return 1000*d[0][1]})
        .attr('x2', function (d) {return 1000*d[1][0]})
        .attr('y2', function (d) {return 1000*d[1][1]})
}


function dropEdge(h, p) {
    p = p || 4
    var newh = zero(h.mesh);
    for (var i = 0; i < h.length; i++) {
        var v = h.mesh.vxs[i];
        var x = 2.4*v[0] / h.mesh.extent.width;
        var y = 2.4*v[1] / h.mesh.extent.height;
        newh[i] = h[i] - Math.exp(10*(Math.pow(Math.pow(x, p) + Math.pow(y, p), 1/p) - 1));
    }
    return newh;
}





function sortWithIndices(toSort) {
  for (var i = 0; i < toSort.length; i++) {
    toSort[i] = [toSort[i], i];
  }

  //====
  var arranged = [];
  toSort.sort(function(a, b) {
    //sort by x, secondary by y
    return a[0] == b[0] ? a[1] - b[1] : a[0] - b[0];
  });

  for (var i = 0; i < toSort.length; i++) {

    //check if was already added
    if (typeof(toSort[i].wasAdded) == "undefined") {
      arranged.push(toSort[i]);
      toSort[i].wasAdded = "true";

      for (j = i + 1; j < toSort.length; j++) {
        if (toSort[i][1] > toSort[j][1] && typeof(toSort[j].wasAdded) == "undefined") {
          arranged.push(toSort[j]);
          toSort[j].wasAdded = "true";
        }
      }
    }
  }
  // console.log(arranged);
  toSort = arranged;
  //=====

  toSort.sortIndices = [];
  for (var j = 0; j < toSort.length; j++) {
    toSort.sortIndices.push(toSort[j][1]);
    toSort[j] = toSort[j][0];
  }
  return toSort;
}


function sortByY(a, b){
  if (a[1] == b[1]) return a[0] - b[0];
  return a[1] - b[1];
}

function sortByX(a, b){
  if (a[0] == b[0]) return a[1] - b[1];
  return a[0] - b[0];
}



function generateCoast(params) {
    var mesh = generateGoodMesh(params.npts, params.extent);
    var h = add(
            slope(mesh, randomVector(4)),
            cone(mesh, runif(-.5, -.5)),
            mountains(mesh, 40)
            );
    for (var i = 0; i < 10; i++) {
        h = relax(h);
    }
    h = peaky(h);
    h = doErosion(h, runif(0, 0.1), 5);
    // h = doErosion(h, runif(0.15,0.15), 5);
    h = setSeaLevel(h, runif(0.2, 0.6));
    h = fillSinks(h);
    h = cleanCoast(h, 3);
    return h;
}

function generateFjord(params) {
    var mesh = generateGoodMesh(params.npts, params.extent);
    var h = add(
            slope(mesh, [4,0]),
            //Changed randomVector(4)
            cone(mesh, runif(-1, -1)),
            ridges(mesh, runif(3,7), runif(0.02, 0.05), runif(5,15)),
            mountains(mesh, 30)
            );
    for (var i = 0; i < 10; i++) {
        h = relax(h);
    }
    h = peaky(h);
    h = doErosion(h, runif(0, 0.1), 5);
    h = setSeaLevel(h, runif(0.2, 0.6));
    h = fillSinks(h);
    h = cleanCoast(h, 3);
    return h;
}

function generateMountain(params) {
    var mesh = generateGoodMesh(params.npts, params.extent);
    var h = add(
            slope(mesh, randomVector(4)),
            // cone(mesh, runif(-1, -1)),
            mountains(mesh, 50)
            );
    for (var i = 0; i < 5; i++) {
        h = relax(h);
    }
    h = peaky(h);
    h = doErosion(h, runif(0.05, 0.15), 5);
    h = setSeaLevel(h, runif(0.0, 0.05));
    h = fillSinks(h);
    h = cleanCoast(h, 3);
    return h;
}

function generateIsland(params) {
    var mesh = generateGoodMesh(params.npts, params.extent);
    var h = add(
            //slope(mesh, randomVector(4)),
            cone(mesh, runif(-1, -1)),
            mountains(mesh, runif(10,20))
        )
    var numRidges = runif(1, 2);
    for (var i = 0; i < numRidges; i++) {
        h = add(h, ridges(mesh, runif(1,2), runif(0.02, 0.05), runif(5,15)));
    }
    for (var i = 0; i < 10; i++) {
        h = relax(h);
    }
    h = peaky(h);
    h = doErosion(h, runif(0.05, 0.1), 5);
    h = setSeaLevel(h, runif(0.6, 0.75));
    h = fillSinks(h);
    h = cleanCoast(h, 3);
    return h;
}

function drawLabels(svg, render, newLang = false) {
    var params = render.params;
    var h = render.h;
    var terr = render.terr;
    var cities = render.cities;
    var nterrs = render.params.nterrs;
    var avoids = [render.rivers, render.coasts, render.borders];
    if (newLang) {
        render.lang = makeRandomLanguage();
    }
    var citylabels = [];
    function penalty(label) {
        var pen = 0;
        if (label.x0 < -0.45 * h.mesh.extent.width) pen += 100;
        if (label.x1 > 0.45 * h.mesh.extent.width) pen += 100;
        if (label.y0 < -0.45 * h.mesh.extent.height) pen += 100;
        if (label.y1 > 0.45 * h.mesh.extent.height) pen += 100;
        for (var i = 0; i < citylabels.length; i++) {
            var olabel = citylabels[i];
            if (label.x0 < olabel.x1 && label.x1 > olabel.x0 &&
                label.y0 < olabel.y1 && label.y1 > olabel.y0) {
                pen += 100;
            }
        }

        for (var i = 0; i < cities.length; i++) {
            var c = h.mesh.vxs[cities[i]];
            if (label.x0 < c[0] && label.x1 > c[0] && label.y0 < c[1] && label.y1 > c[1]) {
                pen += 100;
            }
        }
        for (var i = 0; i < avoids.length; i++) {
            var avoid = avoids[i];
            for (var j = 0; j < avoid.length; j++) {
                var avpath = avoid[j];
                for (var k = 0; k < avpath.length; k++) {
                    var pt = avpath[k];
                    if (pt[0] > label.x0 && pt[0] < label.x1 && pt[1] > label.y0 && pt[1] < label.y1) {
                        pen++;
                    }
                }
            }
        }
        return pen;
    }
    for (var i = 0; i < cities.length; i++) {
        var x = h.mesh.vxs[cities[i]][0];
        var y = h.mesh.vxs[cities[i]][1];
        var text = makeName(render.lang, 'city');


        var size = i < nterrs ? params.fontsizes.city : params.fontsizes.town;
        var sx = 0.65 * size/1000 * text.length;
        var sy = size/1000;
        var posslabels = [
        {
            x: x + 0.8 * sy,
            y: y + 0.3 * sy,
            align: 'start',
            x0: x + 0.7 * sy,
            y0: y - 0.6 * sy,
            x1: x + 0.7 * sy + sx,
            y1: y + 0.6 * sy
        },
        {
            x: x - 0.8 * sy,
            y: y + 0.3 * sy,
            align: 'end',
            x0: x - 0.9 * sy - sx,
            y0: y - 0.7 * sy,
            x1: x - 0.9 * sy,
            y1: y + 0.7 * sy
        },
        {
            x: x,
            y: y - 0.8 * sy,
            align: 'middle',
            x0: x - sx/2,
            y0: y - 1.9*sy,
            x1: x + sx/2,
            y1: y - 0.7 * sy
        },
        {
            x: x,
            y: y + 1.2 * sy,
            align: 'middle',
            x0: x - sx/2,
            y0: y + 0.1*sy,
            x1: x + sx/2,
            y1: y + 1.3*sy
        }
        ];
        var label = posslabels[d3.scan(posslabels, function (a, b) {return penalty(a) - penalty(b)})];
        label.text = text;
        label.size = size;
        citylabels.push(label);
        var cityEl = document.getElementById(cities[i])
        cityEl.setAttribute('name', text);
    }
    var texts = svg.selectAll('text.city').data(citylabels);
    texts.enter()
        .append('text')
        .classed('city', true);
    texts.exit()
        .remove();
    svg.selectAll('text.city')
        .attr('x', function (d) {return 1000*d.x})
        .attr('y', function (d) {return 1000*d.y})
        .style('font-size', function (d) {return d.size})
        .style('text-anchor', function (d) {return d.align})
        .text(function (d) {return d.text})
        .raise();

    $("circle.city").hover(function() {
      $("#cityModal").show();
      let cityName = $(this).attr("name");
      $("#modalCityName").text(cityName);
      let cityDescription = "This is example text as a placeholder.";
      $(".modal-city-description").text(cityDescription);

      let cx = $(this).attr("cx");
      let cy = $(this).attr("cy");
      let tempWidth = defaultExtent.width*500;
      let tempHeight = defaultExtent.height*500;
      let xx = $(this)[0].getBoundingClientRect().x;
      let yy = $(this)[0].getBoundingClientRect().y + window.scrollY;
      let modalHeight = $("#cityModal")[0].getBoundingClientRect().height;
      let modalPaddingBottom = 20;
      $("#cityModal").css("margin-top",yy - modalHeight/2 - modalPaddingBottom);
      $("#cityModal").css("margin-left",xx);
      dontGoOffScreenX();

      $(this).css("fill", "white");

      let scaleFactor = 1.5
      let t1 = "translate(" + -cx*scaleFactor + " " + -cy*scaleFactor +")";
      let t2 = "scale(" + scaleFactor + ")";
      let t3 = "translate(" + cx/scaleFactor + " " + cy/scaleFactor + ")";
      $(this).attr("transform",t1 + " " + t2 + " " + t3);


    }, function(){
      $(this).css("fill", "red");
      let cx = $(this).attr("cx");
      let cy = $(this).attr("cy");
      $("#cityModal").hide();
      let t1 = "translate(" + -cx + " " + -cy +")";
      let t2 = "scale(" + 1 + ")";
      let t3 = "translate(" + cx + " " + cy + ")";
      $(this).attr("transform",t1 + " " + t2 + " " + t3);
    });

    function dontGoOffScreenX() {
      var myLeft = $("#cityModal")[0].getBoundingClientRect().left;
      let modalWidth = $("#cityModal")[0].getBoundingClientRect().width;
      let windowWidth = $(window).width();

			var windowLeft = $(window).scrollLeft();

			// if the tooltip goes off the left side of the screen, line it up with the left side of the window
			if((myLeft - windowLeft) < 0) {

				// arrowReposition = myLeft - windowLeft;
				myLeft = windowLeft + modalWidth/2;
        $("#cityModal").css("margin-left",myLeft);

			} else if (((myLeft + modalWidth) - windowLeft) > windowWidth) {
				myLeft = (windowWidth + windowLeft) - modalWidth/2;
        $("#cityModal").css("margin-left",myLeft);


			}
		}

    var reglabels = [];
    for (var i = 0; i < nterrs; i++) {
        var city = cities[i];
        var text = makeName(render.lang, 'region');
        var sy = params.fontsizes.region / 1000;
        var sx = 0.6 * text.length * sy;
        var lc = terrCenter(h, terr, city, true);
        var oc = terrCenter(h, terr, city, false);
        var best = 0;
        var bestscore = -999999;
        for (var j = 0; j < h.length; j++) {
            var score = 0;
            var v = h.mesh.vxs[j];
            score -= 3000 * Math.sqrt((v[0] - lc[0]) * (v[0] - lc[0]) + (v[1] - lc[1]) * (v[1] - lc[1]));
            score -= 1000 * Math.sqrt((v[0] - oc[0]) * (v[0] - oc[0]) + (v[1] - oc[1]) * (v[1] - oc[1]));
            if (terr[j] != city) score -= 3000;
            for (var k = 0; k < cities.length; k++) {
                var u = h.mesh.vxs[cities[k]];
                if (Math.abs(v[0] - u[0]) < sx &&
                    Math.abs(v[1] - sy/2 - u[1]) < sy) {
                    score -= k < nterrs ? 4000 : 500;
                }
                if (v[0] - sx/2 < citylabels[k].x1 &&
                    v[0] + sx/2 > citylabels[k].x0 &&
                    v[1] - sy < citylabels[k].y1 &&
                    v[1] > citylabels[k].y0) {
                    score -= 5000;
                }
            }
            for (var k = 0; k < reglabels.length; k++) {
                var label = reglabels[k];
                if (v[0] - sx/2 < label.x + label.width/2 &&
                    v[0] + sx/2 > label.x - label.width/2 &&
                    v[1] - sy < label.y &&
                    v[1] > label.y - label.size) {
                    score -= 20000;
                }
            }
            if (h[j] <= 0) score -= 500;
            if (v[0] + sx/2 > 0.5 * h.mesh.extent.width) score -= 50000;
            if (v[0] - sx/2 < -0.5 * h.mesh.extent.width) score -= 50000;
            if (v[1] > 0.5 * h.mesh.extent.height) score -= 50000;
            if (v[1] - sy < -0.5 * h.mesh.extent.height) score -= 50000;
            if (score > bestscore) {
                bestscore = score;
                best = j;
            }
        }
        reglabels.push({
            text: text,
            x: h.mesh.vxs[best][0],
            y: h.mesh.vxs[best][1],
            size:sy,
            width:sx
        });
    }
    texts = svg.selectAll('text.region').data(reglabels);
    texts.enter()
        .append('text')
        .classed('region', true);
    texts.exit()
        .remove();
    svg.selectAll('text.region')
        .attr('x', function (d) {return 1000*d.x})
        .attr('y', function (d) {return 1000*d.y})
        .style('font-size', function (d) {return 1000*d.size})
        .style('text-anchor', 'middle')
        .text(function (d) {return d.text})
        .raise();

}

function drawMap(svg, render) {
    render.rivers = getRivers(render.h, 0.01);
    render.coasts = contour(render.h, 0);
    render.terr = getTerritories(render);
    render.borders = getBorders(render);
    visualizeVoronoi(svg, render.h, 0);
    drawPaths(svg, 'river', render.rivers);
    drawPaths(svg, 'coast', render.coasts);
    drawPaths(svg, 'border', render.borders);
    visualizeSlopes(svg, render);
    visualizeCities(svg, render);
    drawLabels(svg, render);
}

function doMap(svg, params) {
    var render = {
        params: params
    };
    var width = svg.attr('width');
    svg.attr('height', width * params.extent.height / params.extent.width);
    svg.attr('viewBox', -1000 * params.extent.width/2 + ' ' +
                        -1000 * params.extent.height/2 + ' ' +
                        1000 * params.extent.width + ' ' +
                        1000 * params.extent.height);
    svg.selectAll().remove();
    render.h = params.generator(params);
    placeCities(render);
    drawMap(svg, render);
}
