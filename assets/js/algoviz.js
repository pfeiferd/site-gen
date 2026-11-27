'use strict';

/*
 * Algorithmen-Animation (```algo-viz-Block, HTML-Aufbau siehe templates/page.ftl).
 *
 * Der Block traegt nur die Eingabe (data-algo, data-data, data-target, ...; Raster und
 * Graph stehen als Text in <pre class="algoviz-grid"/"algoviz-graph">). Hier wird sie mit
 * js/algoviz-algos.js einmal komplett durchgerechnet; die Einzelbilder werden als SVG
 * gezeichnet und lassen sich mit Zurueck / Weiter / Abspielen durchgehen. Kein Autoplay.
 * Die Pfeiltasten schalten ueber js/slidesteps.js weiter, bevor die Folie wechselt.
 *
 * Fuer java-steps (Option "viz:") gibt es AlgoViz.renderArray: dieselbe Saeulenansicht,
 * gespeist aus den Variablen des Schritts.
 *
 * Beschriftungen und Hinweise gibt es auf Deutsch und Englisch; eine Site kann die
 * Beschriftungen ueber ihre UI-Strings (algoviz.<schluessel>) ueberschreiben. Beim
 * Sprachwechsel (Ereignis lang-change aus i18n.js) wird neu gezeichnet.
 */
(function () {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var SPEEDS = [1500, 900, 500, 250, 110];   /* ms je Bild, Stufe 1..5 */

    /* ---------- Texte ---------- */

    function pos(f, w) { return '(' + (f % w) + ', ' + Math.floor(f / w) + ')'; }

    var T = {
        de: {
            back: 'Zurück', next: 'Weiter', play: 'Abspielen', pause: 'Pause', restart: 'Neu starten',
            speed: 'Tempo', frame: 'Bild {n} von {m}', buffer: 'Zwischenspeicher',
            comparisons: 'Vergleiche', swaps: 'Tausche', writes: 'Schreibzugriffe',
            visited: 'Besucht', pathLength: 'Pfadlänge', pathCost: 'Pfadkosten',
            lgCompare: 'verglichen', lgSwap: 'getauscht', lgSorted: 'sortiert', lgPivot: 'Pivot',
            lgRange: 'Suchbereich', lgLook: 'betrachtet', lgFound: 'gefunden', lgWrite: 'geschrieben',
            lgFrontier: 'Rand (entdeckt)', lgVisited: 'besucht', lgCurrent: 'aktuell', lgPath: 'Pfad', lgWall: 'Mauer',
            lgStart: 'Start', lgGoal: 'Ziel',
            errors: {
                badData: function (a) { return 'data: „' + a + '“ ist keine ganze Zahl von 0 bis 999.'; },
                noData: function () { return 'Es fehlen Werte (data: 5, 2, 9 oder random: 8).'; },
                tooLong: function (a) { return 'Höchstens ' + a + ' Werte.'; },
                noTarget: function () { return 'Für die Suche fehlt target:.'; },
                noGrid: function () { return 'Das Raster ist leer.'; },
                gridTooBig: function (a) { return 'Das Raster darf höchstens ' + a + ' Felder groß sein.'; },
                badGridChar: function (a) { return 'Unbekanntes Zeichen im Raster: „' + a + '“ (erlaubt: S G # . 1-9).'; },
                noStartGoal: function () { return 'Im Raster fehlen S (Start) und/oder G (Ziel).'; },
                dupNode: function (a) { return 'Knoten „' + a + '“ ist doppelt definiert.'; },
                badGraphLine: function (a) { return 'Graph-Zeile nicht verständlich: „' + a + '“.'; },
                noNodes: function () { return 'Der Graph hat keine Knoten.'; },
                tooManyNodes: function (a) { return 'Höchstens ' + a + ' Knoten.'; },
                unknownNode: function (a) { return 'Unbekannter Knoten: „' + a + '“ (start:/goal: prüfen).'; },
                astarNeedsGrid: function () { return 'A* gibt es nur für ein Raster (grid:).'; },
                tooManyFrames: function (a) { return 'Mehr als ' + a + ' Einzelbilder – bitte die Eingabe verkleinern.'; },
                noInput: function () { return 'Es fehlt grid: oder graph:.'; },
                unknownAlgo: function (a) { return 'Unbekannter Algorithmus: „' + a + '“.'; },
                generic: function (a) { return String(a); }
            },
            notes: {
                start: function () { return 'Ausgangslage.'; },
                compare: function (f, i, j) { return 'Vergleiche ' + f.a[i] + ' und ' + f.a[j] + '.'; },
                swap: function (f, i, j) { return 'Tausche ' + f.a[j] + ' und ' + f.a[i] + '.'; },
                selectMin: function (f, i) { return 'Suche das kleinste Element ab Position ' + i + '.'; },
                newMin: function (f, j) { return 'Neues Minimum: ' + f.a[j] + '.'; },
                pick: function (f, i) { return 'Füge ' + f.a[i] + ' in den sortierten Teil links ein.'; },
                mergeStart: function (f, lo, hi) { return 'Mische Position ' + lo + ' bis ' + hi + ' (beide Hälften sind sortiert).'; },
                compareAux: function (f, x, y) { return 'Vergleiche ' + x + ' und ' + y + ': das kleinere kommt zuerst.'; },
                write: function (f, v, k) { return 'Schreibe ' + v + ' an Position ' + k + '.'; },
                pivot: function (f, i) { return 'Pivot ist ' + f.a[i] + ': Kleineres kommt nach links, Größeres nach rechts.'; },
                place: function (f, i) { return 'Das Pivot ' + f.a[i] + ' steht jetzt an seiner endgültigen Position ' + i + '.'; },
                sortedDone: function () { return 'Fertig sortiert.'; },
                searchFor: function (f, t) { return 'Gesucht wird ' + t + '.'; },
                compareTarget: function (f, i, v) { return 'Position ' + i + ' hat den Wert ' + v + '.'; },
                goRight: function (f, i) { return 'Zu klein: weiter in der rechten Hälfte (ab Position ' + (i + 1) + ').'; },
                goLeft: function (f, i) { return 'Zu groß: weiter in der linken Hälfte (bis Position ' + (i - 1) + ').'; },
                foundAt: function (f, i) { return 'Gefunden an Position ' + i + '.'; },
                notFound: function (f, t) { return t + ' kommt nicht vor.'; },
                visit: function (f, u, n, c) { return 'Besuche ' + c.label(u) + (n ? ': ' + n + ' neu entdeckt.' : ': nichts Neues.'); },
                pathFound: function (f, len, cost, c) { return 'Pfad gefunden: ' + len + ' Schritte' + (c.weighted ? ', Kosten ' + cost : '') + '.'; },
                noPath: function () { return 'Es gibt keinen Weg zum Ziel.'; },
                allDone: function () { return 'Alle erreichbaren Knoten besucht.'; }
            },
            sortedFirst: 'Die Binärsuche braucht sortierte Daten – die Eingabe wurde zuerst sortiert.'
        },
        en: {
            back: 'Back', next: 'Next', play: 'Play', pause: 'Pause', restart: 'Restart',
            speed: 'Speed', frame: 'Frame {n} of {m}', buffer: 'buffer',
            comparisons: 'Comparisons', swaps: 'Swaps', writes: 'Writes',
            visited: 'Visited', pathLength: 'Path length', pathCost: 'Path cost',
            lgCompare: 'compared', lgSwap: 'swapped', lgSorted: 'sorted', lgPivot: 'pivot',
            lgRange: 'search range', lgLook: 'looking at', lgFound: 'found', lgWrite: 'written',
            lgFrontier: 'frontier (discovered)', lgVisited: 'visited', lgCurrent: 'current', lgPath: 'path', lgWall: 'wall',
            lgStart: 'start', lgGoal: 'goal',
            errors: {
                badData: function (a) { return 'data: "' + a + '" is not a whole number from 0 to 999.'; },
                noData: function () { return 'No values (data: 5, 2, 9 or random: 8).'; },
                tooLong: function (a) { return 'At most ' + a + ' values.'; },
                noTarget: function () { return 'A search needs target:.'; },
                noGrid: function () { return 'The grid is empty.'; },
                gridTooBig: function (a) { return 'The grid may be at most ' + a + ' cells.'; },
                badGridChar: function (a) { return 'Unknown character in the grid: "' + a + '" (allowed: S G # . 1-9).'; },
                noStartGoal: function () { return 'The grid needs S (start) and G (goal).'; },
                dupNode: function (a) { return 'Node "' + a + '" is defined twice.'; },
                badGraphLine: function (a) { return 'Cannot read graph line: "' + a + '".'; },
                noNodes: function () { return 'The graph has no nodes.'; },
                tooManyNodes: function (a) { return 'At most ' + a + ' nodes.'; },
                unknownNode: function (a) { return 'Unknown node: "' + a + '" (check start:/goal:).'; },
                astarNeedsGrid: function () { return 'A* is only available for a grid (grid:).'; },
                tooManyFrames: function (a) { return 'More than ' + a + ' frames – please use a smaller input.'; },
                noInput: function () { return 'Needs grid: or graph:.'; },
                unknownAlgo: function (a) { return 'Unknown algorithm: "' + a + '".'; },
                generic: function (a) { return String(a); }
            },
            notes: {
                start: function () { return 'Initial state.'; },
                compare: function (f, i, j) { return 'Compare ' + f.a[i] + ' and ' + f.a[j] + '.'; },
                swap: function (f, i, j) { return 'Swap ' + f.a[j] + ' and ' + f.a[i] + '.'; },
                selectMin: function (f, i) { return 'Find the smallest element from position ' + i + ' on.'; },
                newMin: function (f, j) { return 'New minimum: ' + f.a[j] + '.'; },
                pick: function (f, i) { return 'Insert ' + f.a[i] + ' into the sorted part on the left.'; },
                mergeStart: function (f, lo, hi) { return 'Merge positions ' + lo + ' to ' + hi + ' (both halves are sorted).'; },
                compareAux: function (f, x, y) { return 'Compare ' + x + ' and ' + y + ': the smaller one goes first.'; },
                write: function (f, v, k) { return 'Write ' + v + ' to position ' + k + '.'; },
                pivot: function (f, i) { return 'Pivot is ' + f.a[i] + ': smaller values go left, larger ones right.'; },
                place: function (f, i) { return 'Pivot ' + f.a[i] + ' is now in its final position ' + i + '.'; },
                sortedDone: function () { return 'Sorted.'; },
                searchFor: function (f, t) { return 'Looking for ' + t + '.'; },
                compareTarget: function (f, i, v) { return 'Position ' + i + ' holds ' + v + '.'; },
                goRight: function (f, i) { return 'Too small: continue in the right half (from position ' + (i + 1) + ').'; },
                goLeft: function (f, i) { return 'Too large: continue in the left half (up to position ' + (i - 1) + ').'; },
                foundAt: function (f, i) { return 'Found at position ' + i + '.'; },
                notFound: function (f, t) { return t + ' is not in the array.'; },
                visit: function (f, u, n, c) { return 'Visit ' + c.label(u) + (n ? ': ' + n + ' newly discovered.' : ': nothing new.'); },
                pathFound: function (f, len, cost, c) { return 'Path found: ' + len + ' steps' + (c.weighted ? ', cost ' + cost : '') + '.'; },
                noPath: function () { return 'There is no way to the goal.'; },
                allDone: function () { return 'All reachable nodes visited.'; }
            },
            sortedFirst: 'Binary search needs sorted data – the input was sorted first.'
        }
    };

    function lang() {
        var l = document.documentElement.getAttribute('data-lang') || document.documentElement.getAttribute('lang') || 'de';
        return l === 'en' ? 'en' : 'de';
    }
    function t(key) {
        var l = lang();
        var site = window.I18N && window.I18N[l] && window.I18N[l]['algoviz.' + key];
        return site || T[l][key];
    }

    /* ---------- SVG-Helfer ---------- */

    function svgEl(name, attrs, parent) {
        var e = document.createElementNS(SVGNS, name);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    function svgText(parent, x, y, text, cls, size) {
        var e = svgEl('text', { x: x, y: y, 'text-anchor': 'middle', 'class': cls || '' }, parent);
        if (size) e.setAttribute('font-size', size);
        e.textContent = text;
        return e;
    }
    function newSvg(host, w, h, label) {
        host.textContent = '';
        var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, 'class': 'algoviz-svg', role: 'img', 'aria-label': label || '' }, host);
        // Kleine Raster und Graphen nicht auf die volle Folienbreite aufziehen.
        svg.style.maxWidth = Math.round(w * 2) + 'px';
        return svg;
    }

    /* ---------- Saeulen (Sortieren, Suchen, java-steps) ---------- */

    /*
     * f: { a, compare[], swap[], pivot, range, found, ptr, aux, write, sorted[] }
     * ptr ist { name: index }; o.max = gemeinsame Skala, o.reserveAux = Platz fuer die Mischzeile.
     */
    function drawArray(host, f, o) {
        o = o || {};
        var n = f.a.length, W = 600, slot = W / n, bw = Math.min(slot * 0.78, 56);
        var max = o.max || Math.max.apply(null, f.a) || 1;
        var H = 170, top = 40, base = top + H;
        var auxTop = base + 66;
        var total = base + 58 + (o.reserveAux ? 56 : 0);
        var svg = newSvg(host, W, total, o.label);
        var fs = Math.min(15, slot * 0.5), showNums = slot >= 14;
        var inList = function (list, i) { return list && list.indexOf(i) >= 0; };

        for (var i = 0; i < n; i++) {
            var h = Math.max(3, f.a[i] / max * H), x = i * slot + (slot - bw) / 2, cx = i * slot + slot / 2;
            var cls = 'av-bar';
            if (inList(f.sorted, i)) cls += ' is-sorted';
            if (f.range && (i < f.range[0] || i > f.range[1])) cls += ' is-out';
            if (inList(f.compare, i)) cls += ' is-compare';
            if (i === f.found) cls += ' is-found';
            if (i === f.pivot) cls += ' is-pivot';
            if (inList(f.swap, i) || i === f.write) cls += ' is-swap';
            svgEl('rect', { x: x, y: base - h, width: bw, height: h, rx: 3, 'class': cls }, svg);
            if (showNums) svgText(svg, cx, base - h - 6, f.a[i], 'av-val', fs);
            if (showNums) svgText(svg, cx, base + 14, i, 'av-idx', Math.min(11, slot * 0.4));
            if (i === f.pivot) svgText(svg, cx, base - h - 22, '▼', 'av-mark');
            if (i === f.found) svgText(svg, cx, base - h - 22, '✓', 'av-mark');
        }
        if (f.swap && f.swap.length === 2) {
            svgText(svg, (f.swap[0] + f.swap[1] + 1) * slot / 2, top - 18, '⇄', 'av-mark');
        } else if (f.compare && f.compare.length === 2) {
            svgText(svg, (f.compare[0] + f.compare[1] + 1) * slot / 2, top - 18, '?', 'av-mark');
        }
        // Zeiger (lo, mid, hi, i, min, ...): mehrere am selben Index teilen sich eine Beschriftung.
        var byIndex = {};
        if (f.ptr) {
            Object.keys(f.ptr).forEach(function (name) {
                var idx = f.ptr[name];
                if (idx >= 0 && idx < n) (byIndex[idx] = byIndex[idx] || []).push(name);
            });
        }
        Object.keys(byIndex).forEach(function (idx) {
            var cx = idx * slot + slot / 2;
            svgText(svg, cx, base + 30, '▲', 'av-ptr');
            svgText(svg, cx, base + 46, byIndex[idx].join(', '), 'av-ptr', 12);
        });
        if (f.aux || o.reserveAux) {
            svgText(svg, 4, auxTop - 8, t('buffer'), 'av-idx').setAttribute('text-anchor', 'start');
            if (f.aux) {
                f.aux.values.forEach(function (v, k) {
                    var x = (f.aux.from + k) * slot + (slot - bw) / 2;
                    var c = 'av-cell' + (f.aux.used[k] ? ' is-used' : '') + (f.aux.ptr.indexOf(k) >= 0 ? ' is-compare' : '');
                    svgEl('rect', { x: x, y: auxTop, width: bw, height: 28, rx: 3, 'class': c }, svg);
                    svgText(svg, x + bw / 2, auxTop + 19, v, 'av-val', Math.min(14, slot * 0.5));
                });
            }
        }
    }

    /* ---------- Raster ---------- */

    function drawGrid(host, r, f, o) {
        var cs = Math.min(36, Math.floor(600 / r.w)), W = r.w * cs, H = r.h * cs;
        var svg = newSvg(host, W, H, o.label);
        var showCost = cs >= 22;
        for (var y = 0; y < r.h; y++) {
            for (var x = 0; x < r.w; x++) {
                var id = y * r.w + x, c = r.cost[id], st = f.st[id];
                var cls = 'gv-cell';
                if (c < 0) cls += ' is-wall';
                else if (st === 4) cls += ' is-path';
                else if (st === 3) cls += ' is-current';
                else if (st === 2) cls += ' is-visited';
                else if (st === 1) cls += ' is-frontier';
                svgEl('rect', { x: x * cs + 0.5, y: y * cs + 0.5, width: cs - 1, height: cs - 1, rx: 2, 'class': cls }, svg);
                if (c > 1 && r.weighted && st === 0) svgEl('rect', { x: x * cs + 0.5, y: y * cs + 0.5, width: cs - 1, height: cs - 1, rx: 2, 'class': 'gv-terrain', opacity: Math.min(0.55, 0.08 * c) }, svg);
                var label = id === r.start ? 'S' : id === r.goal ? 'G' : '';
                if (label) svgText(svg, x * cs + cs / 2, y * cs + cs / 2 + cs * 0.17, label, 'gv-label', cs * 0.5);
                else if (c > 1 && r.weighted && showCost) svgText(svg, x * cs + cs / 2, y * cs + cs / 2 + cs * 0.16, c, 'gv-cost', cs * 0.42);
                else if (r.weighted && showCost && f.dist[id] !== null && f.dist[id] !== undefined && st !== 0) svgText(svg, x * cs + cs / 2, y * cs + cs / 2 + cs * 0.14, f.dist[id], 'gv-dist', cs * 0.34);
            }
        }
    }

    /* ---------- Graph ---------- */

    function drawGraph(host, r, f, o) {
        var pad = 36, maxW = 600, maxH = 340, step = 100;
        var xs = r.nodes.map(function (n) { return n.x; }), ys = r.nodes.map(function (n) { return n.y; });
        var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
        var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
        var spanX = maxX - minX, spanY = maxY - minY;
        var sx = spanX ? Math.min(step, (maxW - 2 * pad) / spanX) : 1;
        var sy = spanY ? Math.min(step, (maxH - 2 * pad) / spanY) : 1;
        var width = Math.max(spanX * sx + 2 * pad, 160), height = Math.max(spanY * sy + 2 * pad, 120);
        var svg = newSvg(host, width, height, o.label);
        function px(n) { return (width - spanX * sx) / 2 + (n.x - minX) * sx; }
        function py(n) { return (height - spanY * sy) / 2 + (n.y - minY) * sy; }
        r.edges.forEach(function (e, i) {
            var a = r.nodes[e.a], b = r.nodes[e.b];
            var cls = 'gr-edge' + (f.edges[i] === 2 ? ' is-path' : f.edges[i] === 1 ? ' is-tree' : '');
            svgEl('line', { x1: px(a), y1: py(a), x2: px(b), y2: py(b), 'class': cls }, svg);
        });
        if (r.weighted) {
            r.edges.forEach(function (e) {
                var a = r.nodes[e.a], b = r.nodes[e.b];
                svgText(svg, (px(a) + px(b)) / 2, (py(a) + py(b)) / 2 + 4, e.w, 'gr-weight', 13);
            });
        }
        r.nodes.forEach(function (n, i) {
            var st = f.st[i], cls = 'gr-node';
            if (st === 4) cls += ' is-path';
            else if (st === 3) cls += ' is-current';
            else if (st === 2) cls += ' is-visited';
            else if (st === 1) cls += ' is-frontier';
            if (i === r.start) svgEl('circle', { cx: px(n), cy: py(n), r: 21, 'class': 'gr-ring' }, svg);
            if (i === r.goal) svgEl('circle', { cx: px(n), cy: py(n), r: 21, 'class': 'gr-ring is-goal' }, svg);
            svgEl('circle', { cx: px(n), cy: py(n), r: 16, 'class': cls }, svg);
            svgText(svg, px(n), py(n) + 5, n.name, 'gr-name', 14);
            if (r.weighted && f.dist[i] !== null && f.dist[i] !== undefined) svgText(svg, px(n), py(n) + 36, f.dist[i], 'gr-dist', 12);
            if (i === r.start) svgText(svg, px(n), py(n) - 26, t('lgStart'), 'gr-tag', 11);
            else if (i === r.goal) svgText(svg, px(n), py(n) - 26, t('lgGoal'), 'gr-tag', 11);
        });
    }

    /* ---------- Legende ---------- */

    function legendFor(r) {
        var items = [], fr = r.frames;
        function any(fn) { return fr.some(fn); }
        if (r.kind === 'array') {
            if (r.search) {
                if (any(function (f) { return f.range; })) items.push(['range', t('lgRange')]);
                items.push(['compare', t('lgLook')], ['found', t('lgFound')]);
            } else {
                items.push(['compare', t('lgCompare')]);
                if (any(function (f) { return f.swap.length; })) items.push(['swap', t('lgSwap')]);
                if (any(function (f) { return f.write >= 0; })) items.push(['swap', t('lgWrite')]);
                if (any(function (f) { return f.pivot >= 0; })) items.push(['pivot', t('lgPivot')]);
                items.push(['sorted', t('lgSorted')]);
            }
        } else if (r.kind === 'grid') {
            items.push(['frontier', t('lgFrontier')], ['visited', t('lgVisited')], ['current', t('lgCurrent')],
                       ['path', t('lgPath')], ['wall', t('lgWall')]);
        } else {
            items.push(['frontier', t('lgFrontier')], ['visited', t('lgVisited')], ['current', t('lgCurrent')], ['path', t('lgPath')]);
        }
        return items;
    }

    /* ---------- Block ---------- */

    function field(block, name) {
        var v = block.getAttribute('data-' + name);
        return v === null ? '' : v;
    }
    function source(block, cls) {
        var pre = block.querySelector('.' + cls);
        return pre ? pre.textContent : '';
    }

    function compute(block) {
        var A = window.AlgoVizAlgos;
        var algo = field(block, 'algo').trim().toLowerCase();
        var spec = { algo: algo };
        if (field(block, 'random')) spec.data = A.randomData(parseInt(field(block, 'random'), 10) || 8);
        else if (field(block, 'data')) spec.data = A.parseData(field(block, 'data'));
        if (field(block, 'target')) spec.target = parseInt(field(block, 'target'), 10);
        if (source(block, 'algoviz-grid').trim()) spec.grid = A.parseGrid(source(block, 'algoviz-grid'));
        if (source(block, 'algoviz-graph').trim()) spec.graph = A.parseGraph(source(block, 'algoviz-graph'));
        if (field(block, 'start')) spec.start = field(block, 'start').trim();
        if (field(block, 'goal')) spec.goal = field(block, 'goal').trim();
        return A.run(spec);
    }

    function init(block) {
        var title = block.querySelector('.algoviz-title');
        var host = document.createElement('div'), noteEl = document.createElement('p'), statsEl = document.createElement('div');
        var legendEl = document.createElement('ul'), bar = document.createElement('div'), msg = document.createElement('p');
        host.className = 'algoviz-stage';
        noteEl.className = 'algoviz-note';
        noteEl.setAttribute('aria-live', 'polite');
        statsEl.className = 'algoviz-stats';
        legendEl.className = 'algoviz-legend';
        bar.className = 'algoviz-actions';
        msg.className = 'algoviz-msg';
        [host, noteEl, statsEl, legendEl, bar, msg].forEach(function (e) { block.appendChild(e); });

        var result;
        try {
            result = compute(block);
        } catch (e) {
            var texts = T[lang()].errors;
            var f = texts[e.key] || texts.generic;
            host.className = 'algoviz-error';
            host.textContent = f(e.arg !== undefined ? e.arg : e.message);
            [noteEl, statsEl, legendEl, bar, msg].forEach(function (x) { x.hidden = true; });
            return;
        }

        var frames = result.frames, idx = 0, timer = null, speed = 3;
        var reserveAux = result.kind === 'array' && frames.some(function (f) { return f.aux; });
        var maxVal = result.kind === 'array' ? Math.max.apply(null, frames[0].a) || 1 : 1;
        var label = (title ? title.textContent : '') || field(block, 'algo');
        var ctx = {
            weighted: result.weighted,
            label: function (u) {
                return result.kind === 'grid' ? pos(u, result.w) : result.nodes[u].name;
            }
        };

        function button(cls) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = cls;
            bar.appendChild(b);
            return b;
        }
        var back = button('algoviz-back'), play = button('algoviz-play'), next = button('algoviz-next'), restart = button('algoviz-restart');
        var speedLabel = document.createElement('label'), speedIn = document.createElement('input'), count = document.createElement('span');
        speedLabel.className = 'algoviz-speed';
        speedIn.type = 'range';
        speedIn.min = 1; speedIn.max = 5; speedIn.step = 1; speedIn.value = speed;
        count.className = 'algoviz-count';
        speedLabel.appendChild(document.createTextNode(''));
        speedLabel.appendChild(speedIn);
        bar.appendChild(speedLabel);
        bar.appendChild(count);

        function draw() {
            var f = frames[idx], o = { label: label, reserveAux: reserveAux, max: maxVal };
            if (result.kind === 'array') drawArray(host, f, o);
            else if (result.kind === 'grid') drawGrid(host, result, f, o);
            else drawGraph(host, result, f, o);
            var fn = T[lang()].notes[f.note[0]];
            noteEl.textContent = fn ? fn.apply(null, [f].concat(f.note.slice(1), [ctx])) : '';
            statsEl.textContent = '';
            result.counters.forEach(function (key) {
                var v = f.stats[key];
                if (v === null || v === undefined) return;
                var chip = document.createElement('span');
                chip.className = 'algoviz-stat';
                chip.textContent = t(key) + ': ';
                var b = document.createElement('strong');
                b.textContent = v;
                chip.appendChild(b);
                statsEl.appendChild(chip);
            });
            msg.textContent = result.sortedFirst ? T[lang()].sortedFirst : '';
            msg.hidden = !result.sortedFirst;
            count.textContent = t('frame').replace('{n}', idx + 1).replace('{m}', frames.length);
            back.disabled = idx === 0;
            next.disabled = idx === frames.length - 1;
        }

        function labels() {
            back.textContent = t('back');
            next.textContent = t('next');
            restart.textContent = t('restart');
            play.textContent = timer ? t('pause') : t('play');
            speedLabel.firstChild.nodeValue = t('speed') + ' ';
            legendEl.textContent = '';
            legendFor(result).forEach(function (it) {
                var li = document.createElement('li');
                var sw = document.createElement('span');
                sw.className = 'algoviz-swatch sw-' + it[0];
                sw.setAttribute('aria-hidden', 'true');
                li.appendChild(sw);
                li.appendChild(document.createTextNode(' ' + it[1]));
                legendEl.appendChild(li);
            });
            draw();
        }

        function stop() {
            if (timer) { clearTimeout(timer); timer = null; }
            play.textContent = t('play');
        }
        function tick() {
            // Eine ausgeblendete Folie laeuft nicht weiter.
            if (!block.offsetParent || idx >= frames.length - 1) { stop(); return; }
            idx++;
            draw();
            if (idx >= frames.length - 1) stop(); else timer = setTimeout(tick, SPEEDS[speed - 1]);
        }
        function go(d) {
            stop();
            idx = Math.max(0, Math.min(frames.length - 1, idx + d));
            draw();
        }

        back.addEventListener('click', function () { go(-1); });
        next.addEventListener('click', function () { go(1); });
        restart.addEventListener('click', function () { stop(); idx = 0; draw(); });
        play.addEventListener('click', function () {
            if (timer) { stop(); return; }
            if (idx >= frames.length - 1) { idx = 0; draw(); }
            play.textContent = t('pause');
            timer = setTimeout(tick, SPEEDS[speed - 1]);
        });
        speedIn.addEventListener('input', function () { speed = parseInt(speedIn.value, 10) || 3; });
        document.addEventListener('lang-change', labels);
        // Druck: das Endergebnis zeigen, danach den Stand wiederherstellen.
        var savedIdx = null;
        window.addEventListener('beforeprint', function () { stop(); savedIdx = idx; idx = frames.length - 1; draw(); });
        window.addEventListener('afterprint', function () { if (savedIdx !== null) { idx = savedIdx; savedIdx = null; draw(); } });
        if (window.SlideSteps) {
            window.SlideSteps.register(block, {
                canMove: function (d) { return d > 0 ? idx < frames.length - 1 : idx > 0; },
                move: go
            });
        }
        labels();
    }

    window.AlgoViz = {
        /* Saeulenansicht fuer java-steps: o = { a, ptr: {name: index}, changed: [index], max } */
        renderArray: function (host, o) {
            drawArray(host, { a: o.a, ptr: o.ptr, swap: o.changed || [], compare: [], sorted: [], range: null, found: -1, pivot: -1, aux: null, write: -1 },
                      { max: o.max, label: 'array' });
        }
    };

    Array.prototype.forEach.call(document.querySelectorAll('.algoviz'), function (block) {
        if (window.AlgoVizAlgos) init(block);
    });
}());
