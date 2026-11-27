'use strict';

/*
 * Algorithmen fuer ```algo-viz (Aufbau siehe templates/page.ftl, Anzeige js/algoviz.js).
 *
 * Reine Logik ohne DOM: Jeder Algorithmus laeuft einmal komplett durch und liefert die
 * Einzelbilder ("Frames") zurueck, damit die Anzeige vor- und zurueckspringen kann.
 * Dadurch laesst sich alles auch ohne Browser testen (Node: require).
 *
 *   run({ algo, data | grid | graph, target, start, goal })
 *     -> { kind: 'array' | 'grid' | 'graph', frames: [...], counters: [...], ... }
 *
 * Eine Notiz je Frame ist ein Feld [schluessel, arg, ...]; den Text dazu (Deutsch/
 * Englisch) liefert die Anzeige. Fehler sind Error-Objekte mit .key und .arg.
 */
(function (root) {
    var MAX_FRAMES = 3000;
    var MAX_ARRAY = 30;
    var MAX_GRID_W = 40, MAX_GRID_H = 25;
    var MAX_NODES = 26;

    function fail(key, arg) {
        var e = new Error(key + (arg === undefined ? '' : ': ' + arg));
        e.key = key;
        e.arg = arg;
        return e;
    }

    /* ---------- Eingaben lesen ---------- */

    /* "5, 2 9;1" -> [5,2,9,1]; nur ganze Zahlen 0..999. */
    function parseData(text) {
        var parts = String(text || '').split(/[\s,;]+/).filter(Boolean);
        var out = parts.map(function (p) {
            if (!/^\d{1,3}$/.test(p)) throw fail('badData', p);
            return parseInt(p, 10);
        });
        if (!out.length) throw fail('noData');
        if (out.length > MAX_ARRAY) throw fail('tooLong', MAX_ARRAY);
        return out;
    }

    /* Wiederholbare Zufallsdaten: n Werte 1..99, immer dieselben fuer dieselbe Anzahl. */
    function randomData(n) {
        n = Math.max(1, Math.min(MAX_ARRAY, n | 0));
        var s = 12345 + n;
        var out = [];
        while (out.length < n) {
            s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
            out.push(1 + (s >> 8) % 99);
        }
        return out;
    }

    /*
     * S Start, G Ziel, # Mauer, . frei, Ziffern 1-9 Kosten des Feldes.
     * -> { w, h, cost: [...] (-1 = Mauer), start, goal } (Feldnummer = y * w + x)
     */
    function parseGrid(text) {
        var rows = String(text || '').split(/\r?\n/).map(function (r) { return r.replace(/\s+$/, ''); });
        while (rows.length && !rows[0].length) rows.shift();
        while (rows.length && !rows[rows.length - 1].length) rows.pop();
        if (!rows.length) throw fail('noGrid');
        var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
        var h = rows.length;
        if (w > MAX_GRID_W || h > MAX_GRID_H) throw fail('gridTooBig', MAX_GRID_W + '×' + MAX_GRID_H);
        var g = { w: w, h: h, cost: [], start: -1, goal: -1 };
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                var c = rows[y].charAt(x) || '#';
                var id = y * w + x, cost = 1;
                if (c === '#') cost = -1;
                else if (c === 'S') { if (g.start < 0) g.start = id; }
                else if (c === 'G') { if (g.goal < 0) g.goal = id; }
                else if (/[1-9]/.test(c)) cost = parseInt(c, 10);
                else if (c !== '.') throw fail('badGridChar', c);
                g.cost.push(cost);
            }
        }
        if (g.start < 0 || g.goal < 0) throw fail('noStartGoal');
        return g;
    }

    /*
     * "A 0,0" ist ein Knoten (Name, Lage), "A-B 4" eine ungerichtete Kante (Gewicht, sonst 1).
     * -> { nodes: [{name,x,y}], edges: [{a,b,w}] } (a, b = Knotennummern)
     */
    function parseGraph(text) {
        var g = { nodes: [], edges: [] }, index = {}, pending = [];
        String(text || '').split(/\r?\n/).forEach(function (raw) {
            var line = raw.trim();
            if (!line) return;
            var nm = /^(\S+)\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/.exec(line);
            if (nm) {
                if (index[nm[1]] !== undefined) throw fail('dupNode', nm[1]);
                index[nm[1]] = g.nodes.length;
                g.nodes.push({ name: nm[1], x: parseFloat(nm[2]), y: parseFloat(nm[3]) });
                return;
            }
            var em = /^(\S+?)-(\S+?)(?:\s+(\d+(?:\.\d+)?))?$/.exec(line);
            if (!em) throw fail('badGraphLine', line);
            pending.push([em[1], em[2], em[3] === undefined ? 1 : parseFloat(em[3])]);
        });
        if (!g.nodes.length) throw fail('noNodes');
        if (g.nodes.length > MAX_NODES) throw fail('tooManyNodes', MAX_NODES);
        pending.forEach(function (e) {
            if (index[e[0]] === undefined) throw fail('unknownNode', e[0]);
            if (index[e[1]] === undefined) throw fail('unknownNode', e[1]);
            g.edges.push({ a: index[e[0]], b: index[e[1]], w: e[2] });
        });
        g.index = index;
        return g;
    }

    /* ---------- Arrays: Sortieren und Suchen ---------- */

    function Rec(values) {
        this.a = values.slice();
        this.frames = [];
        this.cmp = 0;
        this.swp = 0;
        this.wr = 0;
        this.done = values.map(function () { return false; });
    }
    Rec.prototype.mark = function (i) { this.done[i] = true; };
    Rec.prototype.swapAt = function (i, j) {
        var t = this.a[i];
        this.a[i] = this.a[j];
        this.a[j] = t;
        this.swp++;
    };
    Rec.prototype.push = function (note, extra) {
        if (this.frames.length >= MAX_FRAMES) throw fail('tooManyFrames', MAX_FRAMES);
        var sorted = [];
        this.done.forEach(function (d, i) { if (d) sorted.push(i); });
        var f = {
            a: this.a.slice(), compare: [], swap: [], pivot: -1, range: null, found: -1,
            ptr: null, aux: null, write: -1, sorted: sorted, note: note,
            stats: { comparisons: this.cmp, swaps: this.swp, writes: this.wr }
        };
        for (var k in extra) f[k] = extra[k];
        this.frames.push(f);
    };
    Rec.prototype.finish = function () {
        for (var i = 0; i < this.a.length; i++) this.mark(i);
        this.push(['sortedDone']);
    };

    function bubbleSort(r) {
        var a = r.a;
        r.push(['start']);
        for (var end = a.length - 1; end > 0; end--) {
            var swapped = false;
            for (var j = 0; j < end; j++) {
                r.cmp++;
                r.push(['compare', j, j + 1], { compare: [j, j + 1] });
                if (a[j] > a[j + 1]) {
                    r.swapAt(j, j + 1);
                    swapped = true;
                    r.push(['swap', j, j + 1], { swap: [j, j + 1] });
                }
            }
            r.mark(end);
            if (!swapped) {
                for (var k = 0; k < end; k++) r.mark(k);
                break;
            }
        }
        r.finish();
    }

    function selectionSort(r) {
        var a = r.a;
        r.push(['start']);
        for (var i = 0; i < a.length - 1; i++) {
            var min = i;
            r.push(['selectMin', i], { ptr: { min: min } });
            for (var j = i + 1; j < a.length; j++) {
                r.cmp++;
                r.push(['compare', j, min], { compare: [j, min], ptr: { min: min } });
                if (a[j] < a[min]) {
                    min = j;
                    r.push(['newMin', j], { ptr: { min: min } });
                }
            }
            if (min !== i) {
                r.swapAt(i, min);
                r.push(['swap', i, min], { swap: [i, min] });
            }
            r.mark(i);
        }
        r.finish();
    }

    function insertionSort(r) {
        var a = r.a;
        r.mark(0);
        r.push(['start']);
        for (var i = 1; i < a.length; i++) {
            var j = i;
            r.push(['pick', i], { ptr: { key: i } });
            while (j > 0) {
                r.cmp++;
                r.push(['compare', j - 1, j], { compare: [j - 1, j] });
                if (a[j - 1] > a[j]) {
                    r.swapAt(j - 1, j);
                    r.push(['swap', j - 1, j], { swap: [j - 1, j] });
                    j--;
                } else {
                    break;
                }
            }
            for (var k = 0; k <= i; k++) r.mark(k);
        }
        r.finish();
    }

    function mergeSort(r) {
        var a = r.a;
        function merge(lo, mid, hi) {
            var aux = a.slice(lo, hi + 1), used = aux.map(function () { return false; });
            var l = 0, rr = mid - lo + 1, k = lo, range = [lo, hi];
            function auxView(ptr) { return { from: lo, values: aux.slice(), used: used.slice(), ptr: ptr }; }
            function take(i) {
                a[k] = aux[i];
                used[i] = true;
                r.wr++;
                r.push(['write', a[k], k], { range: range, write: k, aux: auxView([]) });
                k++;
            }
            r.push(['mergeStart', lo, hi], { range: range, aux: auxView([]) });
            while (l <= mid - lo && rr <= hi - lo) {
                r.cmp++;
                r.push(['compareAux', aux[l], aux[rr]], { range: range, aux: auxView([l, rr]) });
                if (aux[l] <= aux[rr]) take(l++); else take(rr++);
            }
            while (l <= mid - lo) take(l++);
            while (rr <= hi - lo) take(rr++);
        }
        function sort(lo, hi) {
            if (lo >= hi) return;
            var mid = (lo + hi) >> 1;
            sort(lo, mid);
            sort(mid + 1, hi);
            merge(lo, mid, hi);
        }
        r.push(['start']);
        sort(0, a.length - 1);
        r.finish();
    }

    function quickSort(r) {
        var a = r.a;
        function sort(lo, hi) {
            if (lo > hi) return;
            if (lo === hi) { r.mark(lo); return; }
            var range = [lo, hi], p = a[hi], i = lo - 1;
            r.push(['pivot', hi], { pivot: hi, range: range });
            for (var j = lo; j < hi; j++) {
                r.cmp++;
                r.push(['compare', j, hi], { pivot: hi, range: range, compare: [j, hi], ptr: { i: i } });
                if (a[j] < p) {
                    i++;
                    if (i !== j) {
                        r.swapAt(i, j);
                        r.push(['swap', i, j], { pivot: hi, range: range, swap: [i, j] });
                    }
                }
            }
            if (i + 1 !== hi) r.swapAt(i + 1, hi);
            r.mark(i + 1);
            r.push(['place', i + 1], { pivot: i + 1, range: range, swap: i + 1 !== hi ? [i + 1, hi] : [] });
            sort(lo, i);
            sort(i + 2, hi);
        }
        r.push(['start']);
        sort(0, a.length - 1);
        r.finish();
    }

    function linearSearch(r, target) {
        var a = r.a;
        r.push(['searchFor', target]);
        for (var i = 0; i < a.length; i++) {
            r.cmp++;
            r.push(['compareTarget', i, a[i]], { compare: [i], ptr: { i: i } });
            if (a[i] === target) {
                r.push(['foundAt', i], { found: i, ptr: { i: i } });
                return;
            }
        }
        r.push(['notFound', target]);
    }

    function binarySearch(r, target) {
        var a = r.a, lo = 0, hi = a.length - 1;
        r.push(['searchFor', target], { range: [lo, hi], ptr: { lo: lo, hi: hi } });
        while (lo <= hi) {
            var mid = (lo + hi) >> 1;
            r.cmp++;
            r.push(['compareTarget', mid, a[mid]], { range: [lo, hi], compare: [mid], ptr: { lo: lo, mid: mid, hi: hi } });
            if (a[mid] === target) {
                r.push(['foundAt', mid], { range: [lo, hi], found: mid, ptr: { lo: lo, mid: mid, hi: hi } });
                return;
            }
            if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
            r.push([a[mid] < target ? 'goRight' : 'goLeft', mid], lo <= hi ? { range: [lo, hi], ptr: { lo: lo, hi: hi } } : {});
        }
        r.push(['notFound', target]);
    }

    var ARRAY_ALGOS = {
        'bubble-sort':    { fn: bubbleSort,    counters: ['comparisons', 'swaps'] },
        'selection-sort': { fn: selectionSort, counters: ['comparisons', 'swaps'] },
        'insertion-sort': { fn: insertionSort, counters: ['comparisons', 'swaps'] },
        'merge-sort':     { fn: mergeSort,     counters: ['comparisons', 'writes'] },
        'quick-sort':     { fn: quickSort,     counters: ['comparisons', 'swaps'] },
        'linear-search':  { fn: linearSearch,  counters: ['comparisons'], search: true },
        'binary-search':  { fn: binarySearch,  counters: ['comparisons'], search: true, needsSorted: true }
    };

    function runArray(spec, def) {
        var data = spec.data;
        if (!data || !data.length) throw fail('noData');
        var sortedFirst = false;
        if (def.needsSorted) {
            var ok = data.every(function (v, i) { return i === 0 || data[i - 1] <= v; });
            if (!ok) {
                data = data.slice().sort(function (x, y) { return x - y; });
                sortedFirst = true;
            }
        }
        if (def.search && (spec.target === undefined || isNaN(spec.target))) throw fail('noTarget');
        var r = new Rec(data);
        def.fn(r, spec.target);
        return { kind: 'array', frames: r.frames, counters: def.counters, sortedFirst: sortedFirst, search: !!def.search };
    }

    /* ---------- Wegsuche: BFS, DFS, Dijkstra, A* auf Raster und Graph ---------- */

    /*
     * Gemeinsame Suche ueber n Knoten. o.neighbors(u) -> [{ v, cost, edge }], o.h(u) ist die
     * Schaetzung fuer A*. Je besuchtem Knoten ruft o.frame(note, s) auf; s enthaelt
     *   st    0 unbekannt, 1 Rand (entdeckt), 2 fertig, 3 aktuell, 4 Pfad
     *   dist  bisher gefundene Kosten (nur fuer fertige Knoten)   closed  prev  prevEdge  path
     */
    function search(o) {
        var n = o.n, algo = o.algo;
        var st = [], prev = [], prevEdge = [], dist = [], best = [], closed = [], seen = [];
        for (var i = 0; i < n; i++) {
            st.push(0); prev.push(-1); prevEdge.push(-1); dist.push(Infinity);
            best.push(Infinity); closed.push(false); seen.push(false);
        }
        var open = [], seq = 0, visited = 0, path = [];
        function state() {
            return { st: st, dist: dist, closed: closed, prev: prev, prevEdge: prevEdge, path: path, visited: visited };
        }
        function add(v, from, edge, g) {
            var h = algo === 'astar' ? o.h(v) : 0;
            open.push({ v: v, from: from, edge: edge, g: g, key: g + h, h: h, seq: seq++ });
            if (st[v] === 0) st[v] = 1;
        }
        function pick() {
            if (algo === 'bfs') return open.shift();
            if (algo === 'dfs') return open.pop();
            var bi = 0;
            for (var k = 1; k < open.length; k++) {
                var e = open[k], b = open[bi];
                if (e.key < b.key || (e.key === b.key && (e.h < b.h || (e.h === b.h && e.seq < b.seq)))) bi = k;
            }
            return open.splice(bi, 1)[0];
        }
        best[o.start] = 0;
        seen[o.start] = true;
        add(o.start, -1, -1, 0);
        while (open.length) {
            var e = pick(), u = e.v;
            if (closed[u]) continue;
            closed[u] = true;
            prev[u] = e.from;
            prevEdge[u] = e.edge;
            dist[u] = e.g;
            visited++;
            st[u] = 3;
            var found = 0;
            if (u !== o.goal) {
                o.neighbors(u).forEach(function (nb) {
                    var v = nb.v;
                    if (closed[v]) return;
                    var g = e.g + nb.cost;
                    if (algo === 'bfs') {
                        if (seen[v]) return;
                        seen[v] = true;
                    } else if (algo !== 'dfs') {
                        if (g >= best[v]) return;
                        best[v] = g;
                    }
                    add(v, u, nb.edge, g);
                    found++;
                });
            }
            o.frame(['visit', u, found], state());
            if (u === o.goal) {
                for (var p = u; p >= 0; p = prev[p]) { path.unshift(p); st[p] = 4; }
                o.frame(['pathFound', path.length - 1, dist[u]], state());
                return;
            }
            st[u] = 2;
        }
        o.frame([o.goal >= 0 ? 'noPath' : 'allDone'], state());
    }

    function pathFrames(o, build) {
        var frames = [];
        o.frame = function (note, s) {
            if (frames.length >= MAX_FRAMES) throw fail('tooManyFrames', MAX_FRAMES);
            frames.push(build(note, s));
        };
        search(o);
        return frames;
    }

    function runGrid(spec) {
        var g = spec.grid, w = g.w, h = g.h;
        var algo = spec.algo;
        var gx = g.goal % w, gy = (g.goal / w) | 0;
        var dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        var o = {
            n: w * h, algo: algo, start: g.start, goal: g.goal,
            neighbors: function (u) {
                var x = u % w, y = (u / w) | 0, out = [];
                dirs.forEach(function (d) {
                    var nx = x + d[0], ny = y + d[1];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
                    var v = ny * w + nx;
                    if (g.cost[v] >= 0) out.push({ v: v, cost: algo === 'bfs' || algo === 'dfs' ? 1 : g.cost[v], edge: -1 });
                });
                return out;
            },
            h: function (u) { return Math.abs((u % w) - gx) + Math.abs(((u / w) | 0) - gy); }
        };
        var frames = pathFrames(o, function (note, s) {
            return {
                st: s.st.slice(),
                dist: s.dist.map(function (d, i) { return s.closed[i] ? d : null; }),
                note: note,
                stats: { visited: s.visited, pathLength: s.path.length ? s.path.length - 1 : null,
                         pathCost: s.path.length ? s.dist[s.path[s.path.length - 1]] : null }
            };
        });
        return { kind: 'grid', frames: frames, w: w, h: h, cost: g.cost, start: g.start, goal: g.goal,
                 weighted: algo === 'dijkstra' || algo === 'astar', counters: ['visited', 'pathLength', 'pathCost'] };
    }

    function runGraph(spec) {
        var g = spec.graph, algo = spec.algo;
        if (algo === 'astar') throw fail('astarNeedsGrid');
        var start = g.index[spec.start], goal = spec.goal === undefined ? -1 : g.index[spec.goal];
        if (start === undefined) throw fail('unknownNode', spec.start === undefined ? 'start:' : spec.start);
        if (goal === undefined) throw fail('unknownNode', spec.goal);
        var adj = g.nodes.map(function () { return []; });
        g.edges.forEach(function (e, i) {
            adj[e.a].push({ v: e.b, cost: e.w, edge: i });
            adj[e.b].push({ v: e.a, cost: e.w, edge: i });
        });
        // Feste Reihenfolge (alphabetisch nach Nachbarname), damit der Ablauf wiederholbar ist.
        adj.forEach(function (list) {
            list.sort(function (p, q) { return g.nodes[p.v].name < g.nodes[q.v].name ? -1 : 1; });
        });
        var weighted = algo === 'dijkstra';
        if (!weighted) {
            adj.forEach(function (list) { list.forEach(function (nb) { nb.cost = 1; }); });
        }
        var o = { n: g.nodes.length, algo: algo, start: start, goal: goal, neighbors: function (u) { return adj[u]; } };
        var frames = pathFrames(o, function (note, s) {
            var edges = g.edges.map(function () { return 0; });
            s.closed.forEach(function (c, v) { if (c && s.prevEdge[v] >= 0) edges[s.prevEdge[v]] = 1; });
            s.path.forEach(function (v) { if (s.prevEdge[v] >= 0) edges[s.prevEdge[v]] = 2; });
            return {
                st: s.st.slice(), edges: edges,
                dist: s.dist.map(function (d, i) { return s.closed[i] ? d : null; }),
                note: note,
                stats: { visited: s.visited, pathLength: s.path.length ? s.path.length - 1 : null,
                         pathCost: s.path.length ? s.dist[s.path[s.path.length - 1]] : null }
            };
        });
        return { kind: 'graph', frames: frames, nodes: g.nodes, edges: g.edges, start: start, goal: goal,
                 weighted: weighted, counters: ['visited', 'pathLength', 'pathCost'] };
    }

    var PATH_ALGOS = { bfs: true, dfs: true, dijkstra: true, astar: true };

    /*
     * spec: { algo, data: [..] | grid: parseGrid(..) | graph: parseGraph(..),
     *         target, start, goal }
     */
    function run(spec) {
        var algo = spec.algo;
        if (ARRAY_ALGOS[algo]) return runArray(spec, ARRAY_ALGOS[algo]);
        if (PATH_ALGOS[algo]) {
            if (spec.grid) return runGrid(spec);
            if (spec.graph) return runGraph(spec);
            throw fail('noInput');
        }
        throw fail('unknownAlgo', algo);
    }

    root.AlgoVizAlgos = {
        run: run, parseData: parseData, randomData: randomData, parseGrid: parseGrid, parseGraph: parseGraph,
        names: Object.keys(ARRAY_ALGOS).concat(Object.keys(PATH_ALGOS)), MAX_FRAMES: MAX_FRAMES
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = root.AlgoVizAlgos;
}(typeof window !== 'undefined' ? window : globalThis));
