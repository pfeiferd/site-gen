'use strict';

/*
 * Algorithmus Schritt fuer Schritt (```java-steps-Block, HTML-Aufbau siehe templates/page.ftl).
 *
 * Laeuft nach highlight.js: zerlegt den eingefaerbten Code (Java und optional
 * Pseudocode) in einzelne Zeilen (span.jl, nummeriert per CSS) und hebt je Schritt
 * die zugehoerigen Zeilen hervor. Dazu kommen Erklaerung, Variablenwerte (geaenderte
 * werden markiert) und die Knoepfe Zurueck / Weiter / Neu starten.
 *
 * Im Folienmodus steuern die Pfeiltasten zuerst die Schritte der aktuellen Folie
 * und wechseln erst danach die Folie (js/slidesteps.js). Mit "viz: a (i, j)" im Kopf
 * des Blocks zeichnet js/algoviz.js ausserdem das Array a als Saeulen, die Indexvariablen
 * i und j als Zeiger - aus denselben Variablenwerten wie die Chips unter dem Code, also
 * immer passend zur hervorgehobenen Zeile. Die Beschriftungen gibt es auf Deutsch und
 * Englisch; eine Site kann sie ueber ihre UI-Strings (jsteps.prev, jsteps.next,
 * jsteps.reset, jsteps.step, jsteps.vars) ueberschreiben. Beim Sprachwechsel
 * (Ereignis lang-change aus i18n.js) werden sie neu gesetzt.
 */
(function () {
    var DEFAULTS = {
        de: { prev: 'Zurück', next: 'Weiter', reset: 'Neu starten', step: 'Schritt {n} von {m}', vars: 'Variablen' },
        en: { prev: 'Back', next: 'Next', reset: 'Restart', step: 'Step {n} of {m}', vars: 'Variables' }
    };

    function lang() {
        var l = document.documentElement.getAttribute('data-lang') || document.documentElement.getAttribute('lang') || 'de';
        return l === 'en' ? 'en' : 'de';
    }
    function t(key) {
        var l = lang();
        var site = window.I18N && window.I18N[l] && window.I18N[l]['jsteps.' + key];
        return site || DEFAULTS[l][key];
    }

    /* "2", "1,3" oder "2-4" -> [2] / [1,3] / [2,3,4] (1-basiert). */
    function parseLines(s) {
        var out = [];
        String(s || '').split(',').forEach(function (part) {
            var m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
            if (!m) return;
            var a = parseInt(m[1], 10), b = m[2] ? parseInt(m[2], 10) : a;
            for (var i = a; i <= b && i - a < 500; i++) out.push(i);
        });
        return out;
    }

    /* "i=0; a[i]=7" -> [['i','0'], ['a[i]','7']] */
    function parseVars(s) {
        var out = [];
        String(s || '').split(';').forEach(function (part) {
            var i = part.indexOf('=');
            if (i < 0) { if (part.trim()) out.push([part.trim(), '']); return; }
            var name = part.slice(0, i).trim();
            if (name) out.push([name, part.slice(i + 1).trim()]);
        });
        return out;
    }

    /* "[4, 8, 15]" -> [4, 8, 15]; null, wenn das keine Zahlenliste ist. */
    function parseArray(text) {
        if (!/^\s*\[.*\]\s*$/.test(text)) return null;
        var nums = String(text).match(/-?\d+/g);
        return nums ? nums.map(Number) : null;
    }

    /* Zerlegt den (eingefaerbten) Inhalt von <code> in Zeilen. Offene Farb-<span>s
       werden am Zeilenende geschlossen und in der naechsten Zeile neu geoeffnet. */
    function wrapLines(code) {
        var lines = [], openers = [], top;
        function newLine() {
            var line = document.createElement('span');
            line.className = 'jl';
            lines.push(line);
            top = line;
            openers.forEach(function (o) {
                var c = o.cloneNode(false);
                top.appendChild(c);
                top = c;
            });
        }
        function walk(node) {
            if (node.nodeType === 3) {
                node.nodeValue.split('\n').forEach(function (piece, i) {
                    if (i > 0) newLine();
                    if (piece) top.appendChild(document.createTextNode(piece));
                });
            } else if (node.nodeType === 1) {
                var c = node.cloneNode(false);
                top.appendChild(c);
                openers.push(node);
                top = c;
                Array.prototype.slice.call(node.childNodes).forEach(walk);
                openers.pop();
                top = top.parentNode;
            }
        }
        newLine();
        Array.prototype.slice.call(code.childNodes).forEach(walk);
        code.textContent = '';
        lines.forEach(function (line, i) {
            if (i < lines.length - 1) line.appendChild(document.createTextNode('\n'));
            code.appendChild(line);
        });
        return lines;
    }

    function init(block) {
        var items = block.querySelectorAll('.jsteps-list > li');
        var steps = Array.prototype.map.call(items, function (li) {
            return { p: parseLines(li.getAttribute('data-p')), j: parseLines(li.getAttribute('data-j')),
                     v: parseVars(li.getAttribute('data-v')), html: li.innerHTML };
        });
        if (!steps.length) return;

        var panes = {};
        Array.prototype.forEach.call(block.querySelectorAll('.jsteps-pane'), function (pane) {
            var code = pane.querySelector('code');
            panes[pane.getAttribute('data-kind')] = { el: pane, lines: code ? wrapLines(code) : [] };
        });

        var expl = block.querySelector('.jsteps-expl');
        var varsEl = block.querySelector('.jsteps-vars');
        var prev = block.querySelector('.jsteps-prev');
        var next = block.querySelector('.jsteps-next');
        var reset = block.querySelector('.jsteps-reset');
        var count = block.querySelector('.jsteps-count');
        var idx = 0;

        var vizName = block.getAttribute('data-viz-array');
        var vizPtrs = (block.getAttribute('data-viz-ptrs') || '').split(',')
            .map(function (n) { return n.trim(); }).filter(Boolean);
        var vizEl = block.querySelector('.jsteps-viz');
        function valueOf(step, name) {
            var kv = step.v.filter(function (x) { return x[0] === name; })[0];
            return kv ? kv[1] : null;
        }
        function arrayOf(step) {
            var text = valueOf(step, vizName);
            return text === null ? null : parseArray(text);
        }
        // Eine gemeinsame Skala fuer alle Schritte, damit die Saeulen nicht von Bild zu Bild springen.
        var vizMax = 1;
        if (vizEl && vizName) {
            steps.forEach(function (s) { (arrayOf(s) || []).forEach(function (v) { vizMax = Math.max(vizMax, v); }); });
        }
        function renderViz() {
            if (!vizEl || !vizName || !window.AlgoViz) return;
            var a = arrayOf(steps[idx]);
            if (!a) { vizEl.textContent = ''; return; }
            var before = idx > 0 ? arrayOf(steps[idx - 1]) : null;
            var changed = [];
            if (before && before.length === a.length) {
                a.forEach(function (v, i) { if (v !== before[i]) changed.push(i); });
            }
            var ptr = {};
            vizPtrs.forEach(function (name) {
                var v = valueOf(steps[idx], name);
                if (v !== null && /^-?\d+$/.test(v)) ptr[name] = parseInt(v, 10);
            });
            window.AlgoViz.renderArray(vizEl, { a: a, ptr: ptr, changed: changed, max: vizMax });
        }

        function mark(kind, nums) {
            var pane = panes[kind];
            if (!pane) return;
            var any = false;
            pane.lines.forEach(function (line, i) {
                var on = nums.indexOf(i + 1) >= 0;
                line.classList.toggle('active', on);
                if (on) any = true;
            });
            pane.el.classList.toggle('has-active', any);
        }

        function render() {
            var s = steps[idx];
            mark('pseudo', s.p);
            mark('java', s.j);
            expl.innerHTML = s.html;
            varsEl.textContent = '';
            if (s.v.length) {
                var before = {};
                (idx > 0 ? steps[idx - 1].v : []).forEach(function (kv) { before[kv[0]] = kv[1]; });
                s.v.forEach(function (kv) {
                    var chip = document.createElement('span');
                    chip.className = 'jsteps-var' + (before[kv[0]] !== kv[1] ? ' chg' : '');
                    var n = document.createElement('span');
                    n.className = 'jsteps-var-name';
                    n.textContent = kv[0];
                    var v = document.createElement('span');
                    v.className = 'jsteps-var-val';
                    v.textContent = kv[1];
                    chip.appendChild(n);
                    chip.appendChild(v);
                    varsEl.appendChild(chip);
                });
            }
            renderViz();
            count.textContent = t('step').replace('{n}', idx + 1).replace('{m}', steps.length);
            prev.disabled = idx === 0;
            next.disabled = idx === steps.length - 1;
        }

        function labels() {
            prev.textContent = t('prev');
            next.textContent = t('next');
            reset.textContent = t('reset');
            varsEl.setAttribute('aria-label', t('vars'));
            render();
        }

        block.jsteps = {
            canMove: function (d) { return d > 0 ? idx < steps.length - 1 : idx > 0; },
            move: function (d) { idx = Math.max(0, Math.min(steps.length - 1, idx + d)); render(); }
        };
        prev.addEventListener('click', function () { block.jsteps.move(-1); });
        next.addEventListener('click', function () { block.jsteps.move(1); });
        reset.addEventListener('click', function () { idx = 0; render(); });
        document.addEventListener('lang-change', labels);
        if (window.SlideSteps) window.SlideSteps.register(block, block.jsteps);
        labels();
    }

    Array.prototype.forEach.call(document.querySelectorAll('.jsteps'), init);
}());
