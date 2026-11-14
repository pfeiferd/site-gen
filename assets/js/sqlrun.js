/*
 * SQL im Browser (```sql-db und ```sql-query, Aufbau siehe page.ftl).
 *
 * Die Seite laedt nur dieses kleine Skript. PGlite (PostgreSQL als WebAssembly,
 * js/pglite/, gzip etwa 4 MB) wird erst nachgeladen, wenn jemand in einen
 * SQL-Editor klickt oder eine Anfrage ausfuehrt - wer nur liest, laedt nichts.
 *
 * Pro Datenbankname gibt es eine PGlite-Instanz. Beim ersten Gebrauch fuehrt sie
 * die Skripte aller ```sql-db-Bloecke dieses Namens in Dokumentreihenfolge aus.
 * Standard ist Autocommit wie in psql: Jede Anweisung wird einzeln ausgefuehrt
 * und festgeschrieben, Aenderungen gelten fuer alle Editoren dieser Datenbank,
 * bis jemand "Datenbank zuruecksetzen" waehlt oder die Seite neu laedt. BEGIN,
 * COMMIT und ROLLBACK funktionieren wie gewohnt; eine am Ende offene
 * Transaktion wird zurueckgerollt.
 *
 * Mit "autocommit: off" (am Editor oder an der Datenbank) laeuft jede
 * Ausfuehrung stattdessen in einer Transaktion, die danach zurueckgerollt wird.
 * Steuert eine solche Anfrage ihre Transaktionen selbst (BEGIN, COMMIT, CALL,
 * DO …), laeuft sie ohne Huelle, und vor der naechsten Anfrage wird die
 * Datenbank neu aufgebaut - samt allem, was andere Editoren im Autocommit
 * festgeschrieben haben.
 *
 * Hat ein Block eine Musterloesung, wird sie vor jeder Ausfuehrung auf dem
 * aktuellen Stand ausgewertet (und immer zurueckgerollt); verglichen wird die
 * letzte Ergebnistabelle beider: gleiche Spaltenzahl und
 * gleiche Zeilen (Spaltennamen egal; Reihenfolge nur, wenn die Loesung mit
 * ORDER BY sortiert; Zahlen numerisch, also 2 = 2.0).
 */
(function () {
    var DEFAULTS = {
        de: {
            run: 'Ausführen', reset: 'Anfrage zurücksetzen', show: 'Lösung zeigen', hide: 'Lösung verbergen',
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
            hint: 'Strg+Enter führt aus. Änderungen bleiben erhalten, bis die Datenbank zurückgesetzt oder die Seite neu geladen wird.',
            hintSandbox: 'Strg+Enter führt aus. Änderungen an den Daten werden nach jeder Ausführung zurückgesetzt.',
            dbreset: 'Datenbank zurücksetzen', dbresetDone: 'Datenbank ist im Ausgangszustand.'
        },
        en: {
            run: 'Run', reset: 'Reset query', show: 'Show solution', hide: 'Hide solution',
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
            hint: 'Ctrl+Enter runs the query. Changes persist until the database is reset or the page is reloaded.',
            hintSandbox: 'Ctrl+Enter runs the query. Changes to the data are undone after each run.',
            dbreset: 'Reset database', dbresetDone: 'The database is in its initial state.'
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

    /* SQL-Text in einzelne Anweisungen zerlegen, wie psql es tut: Semikolons in
       Zeichenketten, Bezeichnern in "…", Kommentaren und $$-Rumpfen (PL/pgSQL)
       trennen nicht. Reine Kommentar-Reste fallen weg. */
    function splitStatements(sql) {
        var out = [], cur = '', i = 0, n = sql.length, j, m;
        while (i < n) {
            var c = sql[i], d = sql[i + 1];
            if (c === '-' && d === '-') { j = sql.indexOf('\n', i); if (j < 0) j = n; }
            else if (c === '/' && d === '*') { j = sql.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; }
            else if (c === "'" || c === '"') {
                j = i + 1;
                while (j < n && !(sql[j] === c && sql[j + 1] !== c)) j += sql[j] === c ? 2 : 1;
                j = Math.min(j + 1, n);
            }
            else if (c === '$' && !(i > 0 && /[A-Za-z_0-9]/.test(sql[i - 1])) && (m = /^\$([A-Za-z_][A-Za-z_0-9]*)?\$/.exec(sql.slice(i)))) {
                j = sql.indexOf(m[0], i + m[0].length); j = j < 0 ? n : j + m[0].length;
            }
            else if (c === ';') { out.push(cur); cur = ''; i++; continue; }
            else j = i + 1;
            cur += sql.slice(i, j); i = j;
        }
        out.push(cur);
        return out.filter(function (st) { return stripLead(st) !== ''; });
    }
    function stripLead(st) { return st.replace(/^(\s+|--[^\n]*|\/\*[\s\S]*?\*\/)+/, ''); }

    /* Steuert die Anfrage ihre Transaktionen selbst (BEGIN, COMMIT, ROLLBACK …)?
       CALL und DO gehoeren dazu, weil Prozeduren selbst COMMIT ausfuehren duerfen. */
    var TX_START = /^(begin|start\s+transaction|commit|end|rollback|abort|savepoint|release|prepare\s+transaction|call|do)\b/i;
    function controlsTransactions(sql) {
        return splitStatements(sql).some(function (st) { return TX_START.test(stripLead(st)); });
    }

    function noop() {}
    function database(name) {
        if (FILE) return Promise.reject({ fileProto: true });
        if (!dbs[name]) {
            dbs[name] = lib().then(function (m) {
                var script = setupScript(name);
                var parsers = {};
                RAW_TYPES.forEach(function (id) { parsers[id] = function (v) { return v; }; });
                var opts = { rowMode: 'array', parsers: parsers };
                var db = null;
                var log = [];      /* im Autocommit ausgefuehrte Anweisungen, je Ausfuehrung eine Liste */
                var stale = true;  /* vor der naechsten Anfrage neu aufbauen */
                var queue = Promise.resolve();

                /* Anweisungen einzeln ausfuehren wie psql; bei einem Fehler stoppen.
                   done(st) meldet jede erfolgreiche Anweisung. */
                function each(list, done) {
                    var all = [];
                    return list.reduce(function (p, st) {
                        return p.then(function () {
                            return db.exec(st, opts).then(function (r) { all = all.concat(r); if (done) done(st); });
                        });
                    }, Promise.resolve()).then(function () { return all; }, function (err) {
                        err.partial = all; throw err;
                    });
                }
                /* Eine am Ende einer Ausfuehrung offene Transaktion zuruecknehmen. */
                function closeTx() {
                    return db.isInTransaction() ? db.exec('ROLLBACK').then(noop, noop) : Promise.resolve();
                }
                function settle(p) {
                    return p.then(function (r) { return closeTx().then(function () { return r; }); },
                                  function (e) { return closeTx().then(function () { throw e; }); });
                }
                /* Frische Instanz: Aufbauskript, dann alles bisher Festgeschriebene erneut. */
                function rebuild() {
                    return (db ? db.close().catch(noop) : Promise.resolve()).then(function () {
                        return m.PGlite.create();
                    }).then(function (d) {
                        db = d;
                        if (script.trim()) return db.exec(script).then(noop, function (err) { err.setup = true; throw err; });
                    }).then(function () {
                        return log.reduce(function (p, unit) {
                            return p.then(function () { return settle(each(unit)).catch(noop); });
                        }, Promise.resolve());
                    }).then(function () { stale = false; });
                }
                /* Standard: Autocommit wie in psql - Aenderungen bleiben bestehen. */
                function autocommit(sql) {
                    var unit = [];
                    log.push(unit);
                    return settle(each(splitStatements(sql), function (st) { unit.push(st); }));
                }
                /* autocommit: off - jede Ausfuehrung wird zurueckgerollt. Steuert die Anfrage
                   ihre Transaktionen selbst, laeuft sie ohne Huelle, und die Datenbank wird
                   vor der naechsten Anfrage neu aufgebaut. */
                function sandbox(sql) {
                    if (controlsTransactions(sql)) {
                        stale = true;
                        return settle(each(splitStatements(sql)));
                    }
                    return db.exec('BEGIN').then(function () {
                        return db.exec(sql, opts);
                    }).then(function (res) {
                        return db.exec('ROLLBACK').then(function () { return res; });
                    }, function (err) {
                        return db.exec('ROLLBACK').then(function () { throw err; }, function () { throw err; });
                    });
                }
                /* Alles strikt nacheinander; bei Bedarf vorher neu aufbauen. */
                function queued(fn) {
                    return function (arg) {
                        var p = queue.then(function () { return stale ? rebuild() : null; }).then(function () { return fn(arg); });
                        queue = p.catch(noop);
                        return p;
                    };
                }
                var api = {
                    run: queued(autocommit),
                    probe: queued(sandbox),
                    reset: queued(function () { log = []; return rebuild(); })
                };
                return queued(noop)().then(function () { return api; });
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
        if (err && err.partial && err.partial.length) render(out, err.partial);
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
    /* Autocommit gilt, solange weder der Editor noch seine Datenbank "off" sagen. */
    function autocommitOf(q) {
        var v = q.getAttribute('data-autocommit');
        if (!v) {
            var name = q.getAttribute('data-db') || '';
            [].slice.call(document.querySelectorAll('.sqldb')).forEach(function (d) {
                if ((d.getAttribute('data-db') || '') === name && d.getAttribute('data-autocommit')) v = d.getAttribute('data-autocommit');
            });
        }
        return !/^(off|no|false|0)$/i.test(v || 'on');
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
            /* Musterloesung zuerst, auf demselben Stand und immer zurueckgerollt -
               sonst fuehrte sie z.B. ein INSERT der Aufgabe ein zweites Mal aus. */
            var solSql = sol ? sol.textContent : null;
            var expected = solSql ? db.probe(solSql).then(lastTable, function () { return null; }) : Promise.resolve(null);
            return expected.then(function (exp) {
                return (autocommitOf(q) ? db.run(sql) : db.probe(sql)).then(function (results) {
                    render(out, results);
                    if (exp) setFeedback(q, compare(lastTable(results), exp, /\border\s+by\b/i.test(lastStatement(solSql))));
                }, function (err) { showError(out, err, !!(err && err.setup)); });
            });
        }, function (err) {
            if (err && err.fileProto) { out.textContent = ''; out.appendChild(el('p', 'sqlq-error', t('fileProto'))); return; }
            showError(out, err, !!(err && err.setup));
            if (!(err && err.setup)) out.querySelector('strong').textContent = t('loadError') + ' ';
        }).then(function () {
            btn.disabled = false; setStatus(q, null);
        });
    }
    /* Datenbank in den Ausgangszustand (Aufbauskript) zuruecksetzen - fuer alle
       Editoren dieser Datenbank. */
    function resetDb(q) {
        var name = q.getAttribute('data-db') || '';
        if (!dbs[name]) { setStatus(q, 'dbresetDone'); return; }
        var b = q.querySelector('.sqlq-dbreset');
        b.disabled = true;
        dbs[name].then(function (db) { return db.reset(); }).then(function () {
            setStatus(q, 'dbresetDone');
        }, function (err) { showError(q.querySelector('.sqlq-out'), err, true); }).then(function () { b.disabled = false; });
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
        var dbr = q.querySelector('.sqlq-dbreset');
        if (dbr) dbr.textContent = t('dbreset');
        q.querySelector('.sqlq-editor').title = t(autocommitOf(q) ? 'hint' : 'hintSandbox');
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
            if (autocommitOf(q)) {
                var dbr = el('button', 'sqlq-dbreset'); dbr.type = 'button';
                q.querySelector('.sqlq-reset').insertAdjacentElement('afterend', dbr);
                dbr.addEventListener('click', function () { resetDb(q); });
            }
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
