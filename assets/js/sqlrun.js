/*
 * SQL im Browser (```sql-db und ```sql-query, Aufbau siehe page.ftl).
 *
 * Die Seite laedt nur dieses kleine Skript. PGlite (PostgreSQL als WebAssembly,
 * js/pglite/, gzip etwa 4 MB) wird erst nachgeladen, wenn jemand in einen
 * SQL-Editor klickt oder eine Anfrage ausfuehrt - wer nur liest, laedt nichts.
 *
 * Pro Datenbankname gibt es eine PGlite-Instanz. Beim ersten Gebrauch fuehrt sie
 * die Skripte aller ```sql-db-Bloecke dieses Namens in Dokumentreihenfolge aus.
 * Jede Anfrage laeuft in einer Transaktion, die danach zurueckgerollt wird:
 * INSERT, UPDATE, DELETE und sogar CREATE TABLE zeigen ihre Wirkung innerhalb
 * derselben Ausfuehrung, die Datenbank bleibt aber fuer alle Bloecke im
 * Ausgangszustand.
 *
 * Hat ein Block eine Musterloesung, vergleicht das Skript nach jeder Ausfuehrung
 * die letzte Ergebnistabelle mit der der Loesung: gleiche Spaltenzahl und
 * gleiche Zeilen (Spaltennamen egal; Reihenfolge nur, wenn die Loesung mit
 * ORDER BY sortiert; Zahlen numerisch, also 2 = 2.0).
 */
(function () {
    var DEFAULTS = {
        de: {
            run: 'Ausführen', reset: 'Zurücksetzen', show: 'Lösung zeigen', hide: 'Lösung verbergen',
            loading: 'Datenbank wird geladen (beim ersten Mal einige MB) …', running: 'Läuft …',
            error: 'Fehler:', setupError: 'Fehler beim Aufbau der Datenbank:',
            loadError: 'PGlite konnte nicht geladen werden:',
            fileProto: 'SQL-Blöcke brauchen einen Webserver: Browser laden die Datenbank (WebAssembly-Module) nicht über file://. Lokal etwa im Ordner target/website „python3 -m http.server 8080“ starten und http://localhost:8080 öffnen.',
            row: '1 Zeile', rows: '{n} Zeilen', col: '1 Spalte', cols: '{n} Spalten',
            more: '… {n} weitere nicht angezeigt',
            affected: '{cmd}: {n} betroffen', done: '{cmd} ausgeführt',
            ok: 'Richtig – das Ergebnis stimmt mit der Musterlösung überein.',
            wrongCols: 'Noch nicht richtig: {exp} erwartet, {got} erhalten.',
            wrongRows: 'Noch nicht richtig: {exp} erwartet, {got} erhalten.',
            wrongVals: 'Noch nicht richtig: Die Zeilen weichen von der Musterlösung ab.',
            wrongOrder: 'Fast: Die Zeilen stimmen, aber nicht ihre Reihenfolge.',
            noTable: 'Noch nicht richtig: Die Anfrage liefert keine Ergebnistabelle.',
            empty: 'Bitte zuerst eine Anfrage eingeben.',
            schema: 'Datenbank: Schema und Beispieldaten', schemaNamed: 'Datenbank „{name}“: Schema und Beispieldaten',
            hint: 'Strg+Enter führt aus. Änderungen an den Daten werden nach jeder Ausführung zurückgesetzt.'
        },
        en: {
            run: 'Run', reset: 'Reset', show: 'Show solution', hide: 'Hide solution',
            loading: 'Loading database (a few MB the first time) …', running: 'Running …',
            error: 'Error:', setupError: 'Error while setting up the database:',
            loadError: 'Could not load PGlite:',
            fileProto: 'SQL blocks need a web server: browsers do not load the database (WebAssembly modules) via file://. Locally, e.g. run “python3 -m http.server 8080” in target/website and open http://localhost:8080.',
            row: '1 row', rows: '{n} rows', col: '1 column', cols: '{n} columns',
            more: '… {n} more not shown',
            affected: '{cmd}: {n} affected', done: '{cmd} executed',
            ok: 'Correct – the result matches the model solution.',
            wrongCols: 'Not yet: {exp} expected, {got} returned.',
            wrongRows: 'Not yet: {exp} expected, {got} returned.',
            wrongVals: 'Not yet: the rows differ from the model solution.',
            wrongOrder: 'Almost: the rows are right, but not their order.',
            noTable: 'Not yet: the query does not return a result table.',
            empty: 'Please enter a query first.',
            schema: 'Database: schema and sample data', schemaNamed: 'Database “{name}”: schema and sample data',
            hint: 'Ctrl+Enter runs the query. Changes to the data are undone after each run.'
        }
    };
    var MAX_ROWS = 200;
    /* date, time, timestamp, timestamptz, timetz, interval: Text von Postgres zeigen */
    var RAW_TYPES = [1082, 1083, 1114, 1184, 1266, 1186];

    var base = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/[^/]*$/, '') + 'pglite/' : 'js/pglite/';
    }());

    function lang() {
        var l = document.documentElement.getAttribute('data-lang') || document.documentElement.getAttribute('lang') || 'de';
        return l === 'en' ? 'en' : 'de';
    }
    function t(key, vars) {
        var l = lang();
        var site = window.I18N && window.I18N[l] && window.I18N[l]['sql.' + key];
        var s = site || DEFAULTS[l][key];
        if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
        return s;
    }
    /* "1 Zeile" / "3 Zeilen" bzw. Spalten (unit: 'row' oder 'col') */
    function count(n, unit) { return n === 1 ? t(unit) : t(unit + 's', { n: n }); }
    /* Rueckmeldung aus gespeichertem Zustand, damit sie beim Sprachwechsel neu entsteht */
    function stateText(state) {
        if (!Array.isArray(state)) return t(state);
        var unit = state[0] === 'wrongCols' ? 'col' : 'row';
        return t(state[0], { exp: count(state[1].exp, unit), got: count(state[1].got, unit) });
    }
    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    /* ---- PGlite laden und Datenbanken aufbauen (jeweils nur einmal) ---- */
    var libPromise = null;
    function lib() {
        if (!libPromise) libPromise = import(base + 'index.js');
        return libPromise;
    }
    var dbs = {};
    function setupScript(name) {
        return [].slice.call(document.querySelectorAll('.sqldb')).filter(function (d) {
            return (d.getAttribute('data-db') || '') === name;
        }).map(function (d) { return d.querySelector('code').textContent; }).join('\n;\n');
    }
    /* Ueber file:// verweigern Browser ES-Module und fetch() - dann gar nicht erst laden. */
    var FILE = location.protocol === 'file:';
    function database(name) {
        if (FILE) return Promise.reject({ fileProto: true });
        if (!dbs[name]) {
            dbs[name] = lib().then(function (m) {
                return m.PGlite.create();
            }).then(function (db) {
                var parsers = {};
                RAW_TYPES.forEach(function (id) { parsers[id] = function (v) { return v; }; });
                var queue = Promise.resolve();
                var script = setupScript(name);
                var wrapped = {
                    /* Anfragen nacheinander ausfuehren, jede in eigener Transaktion */
                    run: function (sql) {
                        var p = queue.then(function () {
                            return db.exec('BEGIN').then(function () {
                                return db.exec(sql, { rowMode: 'array', parsers: parsers });
                            }).then(function (res) {
                                return db.exec('ROLLBACK').then(function () { return res; });
                            }, function (err) {
                                return db.exec('ROLLBACK').then(function () { throw err; }, function () { throw err; });
                            });
                        });
                        queue = p.catch(function () {});
                        return p;
                    }
                };
                if (!script.trim()) return wrapped;
                return db.exec(script).then(function () { return wrapped; }, function (err) {
                    err.setup = true; throw err;
                });
            });
            dbs[name].catch(function () { delete dbs[name]; });
        }
        return dbs[name];
    }

    /* ---- Ausgabe ---- */
    function fmt(v) {
        if (v === null || v === undefined) return null;
        if (v instanceof Uint8Array) return '\\x' + Array.prototype.map.call(v, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        if (v instanceof Date) return v.toISOString();
        if (typeof v === 'object') return JSON.stringify(v);
        return String(v);
    }
    /* int2/4/8, oid, float4/8, numeric, money: rechtsbuendig */
    var NUM_TYPES = [20, 21, 23, 26, 700, 701, 790, 1700];
    function table(res) {
        var wrap = el('div', 'sqlq-table-wrap');
        var tab = el('table', 'sqlq-table');
        var tr = el('tr');
        res.fields.forEach(function (f) { tr.appendChild(el('th', '', f.name)); });
        var thead = el('thead'); thead.appendChild(tr); tab.appendChild(thead);
        var tbody = el('tbody');
        var numeric = res.fields.map(function (f) { return NUM_TYPES.indexOf(f.dataTypeID) >= 0; });
        res.rows.slice(0, MAX_ROWS).forEach(function (row) {
            var r = el('tr');
            row.forEach(function (v, i) {
                var s = fmt(v);
                r.appendChild(s === null ? el('td', 'sqlq-null', 'NULL') : el('td', numeric[i] ? 'sqlq-num' : '', s));
            });
            tbody.appendChild(r);
        });
        tab.appendChild(tbody); wrap.appendChild(tab);
        var n = res.rows.length;
        var info = el('p', 'sqlq-info', count(n, 'row'));
        if (n > MAX_ROWS) info.textContent += ' ' + t('more', { n: n - MAX_ROWS });
        var box = el('div'); box.appendChild(wrap); box.appendChild(info);
        return box;
    }
    function lastTable(results) {
        for (var i = results.length - 1; i >= 0; i--) if (results[i].fields && results[i].fields.length) return results[i];
        return null;
    }
    function render(out, results) {
        out.textContent = '';
        results.forEach(function (res) {
            if (res.fields && res.fields.length) out.appendChild(table(res));
            else if (res.command) {
                var n = res.rowCount !== undefined ? res.rowCount : res.affectedRows;
                out.appendChild(el('p', 'sqlq-info', /^(INSERT|UPDATE|DELETE|MERGE)$/.test(res.command) && n !== undefined
                    ? t('affected', { cmd: res.command, n: count(n, 'row') }) : t('done', { cmd: res.command })));
            }
        });
    }
    function showError(out, err, setup) {
        out.textContent = '';
        var p = el('p', 'sqlq-error');
        p.appendChild(el('strong', '', (setup ? t('setupError') : t('error')) + ' '));
        p.appendChild(document.createTextNode(err && err.message ? err.message : String(err)));
        out.appendChild(p);
    }

    /* ---- Vergleich mit der Musterloesung ---- */
    function norm(v) {
        var s = fmt(v);
        if (s === null) return '\u0000NULL';
        if (/^\s*[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?\s*$/i.test(s)) {
            var x = Number(s);
            return 'n:' + (Math.round(x * 1e9) / 1e9);
        }
        return 's:' + s;
    }
    function compare(got, exp, ordered) {
        if (!got) return 'noTable';
        if (got.fields.length !== exp.fields.length) return ['wrongCols', { exp: exp.fields.length, got: got.fields.length }];
        if (got.rows.length !== exp.rows.length) return ['wrongRows', { exp: exp.rows.length, got: got.rows.length }];
        var a = got.rows.map(function (r) { return JSON.stringify(r.map(norm)); });
        var b = exp.rows.map(function (r) { return JSON.stringify(r.map(norm)); });
        if (ordered && a.join('\n') === b.join('\n')) return 'ok';
        var sa = a.slice().sort().join('\n'), sb = b.slice().sort().join('\n');
        if (sa !== sb) return 'wrongVals';
        return ordered ? 'wrongOrder' : 'ok';
    }
    function lastStatement(sql) {
        var parts = sql.replace(/--[^\n]*/g, '').split(';').filter(function (s) { return s.trim(); });
        return parts.length ? parts[parts.length - 1] : '';
    }

    /* ---- Bedienung ---- */
    function setFeedback(q, state) {
        var fb = q.querySelector('.sqlq-feedback');
        if (!state) { fb.textContent = ''; fb.className = 'sqlq-feedback'; fb.removeAttribute('data-state'); return; }
        var key = Array.isArray(state) ? state[0] : state;
        fb.setAttribute('data-state', JSON.stringify(state));
        fb.className = 'sqlq-feedback ' + (key === 'ok' ? 'sqlq-feedback-ok' : (key === 'empty' ? '' : 'sqlq-feedback-wrong'));
        fb.textContent = stateText(state);
    }
    function setStatus(q, key) {
        var st = q.querySelector('.sqlq-status');
        st.textContent = key ? t(key) : '';
        if (key) st.setAttribute('data-key', key); else st.removeAttribute('data-key');
    }
    function run(q) {
        var ed = q.querySelector('.sqlq-editor'), out = q.querySelector('.sqlq-out');
        var sol = q.querySelector('.sqlq-solution code');
        var sql = ed.value;
        setFeedback(q, null);
        if (!sql.trim()) { setFeedback(q, 'empty'); return Promise.resolve(); }
        var name = q.getAttribute('data-db') || '';
        var btn = q.querySelector('.sqlq-run');
        btn.disabled = true;
        setStatus(q, dbs[name] || FILE ? 'running' : 'loading');
        return database(name).then(function (db) {
            setStatus(q, 'running');
            return db.run(sql).then(function (results) {
                render(out, results);
                if (!sol) return;
                var solSql = sol.textContent;
                return db.run(solSql).then(function (expRes) {
                    var exp = lastTable(expRes);
                    if (exp) setFeedback(q, compare(lastTable(results), exp, /\border\s+by\b/i.test(lastStatement(solSql))));
                });
            }, function (err) { showError(out, err, false); });
        }, function (err) {
            if (err && err.fileProto) { out.textContent = ''; out.appendChild(el('p', 'sqlq-error', t('fileProto'))); return; }
            showError(out, err, !!(err && err.setup));
            if (!(err && err.setup)) out.querySelector('strong').textContent = t('loadError') + ' ';
        }).then(function () {
            btn.disabled = false; setStatus(q, null);
        });
    }
    function reset(q) {
        var ed = q.querySelector('.sqlq-editor');
        ed.value = ed.defaultValue;
        q.querySelector('.sqlq-out').textContent = '';
        setFeedback(q, null);
    }
    function label(q) {
        q.querySelector('.sqlq-run').textContent = t('run');
        q.querySelector('.sqlq-reset').textContent = t('reset');
        var sb = q.querySelector('.sqlq-show'), sol = q.querySelector('.sqlq-solution');
        if (sb) sb.textContent = sol.hidden ? t('show') : t('hide');
        q.querySelector('.sqlq-editor').title = t('hint');
        var fb = q.querySelector('.sqlq-feedback'), st = fb.getAttribute('data-state');
        if (st) fb.textContent = stateText(JSON.parse(st));
        var status = q.querySelector('.sqlq-status').getAttribute('data-key');
        if (status) setStatus(q, status);
    }
    function labelDb(d) {
        var name = d.getAttribute('data-db') || '';
        var s = d.querySelector('summary');
        if (s) s.textContent = name ? t('schemaNamed', { name: name }) : t('schema');
    }

    function init() {
        document.querySelectorAll('.sqldb').forEach(labelDb);
        document.querySelectorAll('.sqlq').forEach(function (q) {
            var ed = q.querySelector('.sqlq-editor');
            /* Schon beim Hineinklicken laden, damit "Ausfuehren" kaum warten muss. */
            ed.addEventListener('focus', function () { database(q.getAttribute('data-db') || '').catch(function () {}); }, { once: true });
            ed.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(q); }
            });
            q.querySelector('.sqlq-run').addEventListener('click', function () { run(q); });
            q.querySelector('.sqlq-reset').addEventListener('click', function () { reset(q); });
            var sb = q.querySelector('.sqlq-show');
            if (sb) sb.addEventListener('click', function () {
                var sol = q.querySelector('.sqlq-solution');
                sol.hidden = !sol.hidden; label(q);
            });
            label(q);
        });
        document.addEventListener('lang-change', function () {
            document.querySelectorAll('.sqldb').forEach(labelDb);
            document.querySelectorAll('.sqlq').forEach(label);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
