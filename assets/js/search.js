'use strict';

(function () {

    function getParam(name) {
        return new URLSearchParams(window.location.search).get(name) || '';
    }

    function lastLecture() {
        try { return localStorage.getItem('currentLecture') || ''; } catch (e) { return ''; }
    }

    /* Oberflaechensprache (DE/EN) – einheitlich mit i18n.js ueber "lang":
       URL-Param ?lang > von i18n gesetzter Wert > localStorage > de. */
    function uiLang() {
        var p = getParam('lang'); if (p === 'en' || p === 'de') return p;
        if (window.__lang) return window.__lang;
        try { return localStorage.getItem('lang') || 'de'; } catch (e) { return 'de'; }
    }

    /* Lokalisierte Suchmeldungen kommen aus window.I18N (content/search_<lang>.properties);
       Platzhalter {scope}/{q}/{n} werden per fill() ersetzt. */
    function t() {
        return (window.I18N && (window.I18N[uiLang()] || window.I18N.de)) || {};
    }
    function fill(tmpl, vars) {
        return String(tmpl || '').replace(/\{(\w+)\}/g, function (_, k) {
            return (vars[k] != null) ? vars[k] : '';
        });
    }

    /* Welche Vorlesung ist gerade ausgewaehlt? (verstecktes Formularfeld > URL-Param
       > aktive Suchseite > zuletzt besuchte Vorlesung) */
    function activeLecture(form) {
        if (form) { var h = form.querySelector('input[name="lecture"]'); if (h && h.value) return h.value; }
        var p = getParam('lecture'); if (p) return p;
        if (window.__activeLecture) return window.__activeLecture;
        return lastLecture();
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function escapeRegex(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* Ausschnitt um den ersten Treffer herum (Plain-Text) */
    function getSnippet(body, query) {
        var HALF = 120;
        var words = query.toLowerCase().split(/\s+/).filter(Boolean);
        var lower = body.toLowerCase();
        var pos = -1;
        for (var i = 0; i < words.length; i++) {
            var p = lower.indexOf(words[i]);
            if (p !== -1 && (pos === -1 || p < pos)) pos = p;
        }
        var start = Math.max(0, (pos === -1 ? 0 : pos) - HALF);
        var end   = Math.min(body.length, start + HALF * 2 + (pos === -1 ? 0 : words[0].length));
        while (start > 0 && body[start - 1] !== ' ') start--;
        while (end < body.length && body[end] !== ' ') end++;
        var snippet = body.slice(start, end);
        if (start > 0)          snippet = '…' + snippet;
        if (end < body.length)  snippet = snippet + '…';
        return snippet;
    }

    /* Suchbegriffe im Snippet mit <mark> hervorheben */
    function highlight(text, query) {
        var words = query.split(/\s+/).filter(Boolean);
        var result = escapeHtml(text);
        words.forEach(function (w) {
            result = result.replace(
                new RegExp('(' + escapeRegex(escapeHtml(w)) + ')', 'gi'),
                '<mark>$1</mark>'
            );
        });
        return result;
    }

    /* Weiterleitung zur Suchseite – Basis-URL aus dem Formular (rootpath-korrekt,
       auch aus Unterverzeichnissen). Vorlesungs- (lecture) und Oberflaechensprache (ui,
       nur bei EN) bleiben erhalten – einheitlich mit i18n.js. */
    function redirectToSearch(q, form) {
        var base = (form && form.getAttribute('action')) || 'search.html';
        var lecture = activeLecture(form);
        var params = [];
        if (q)  params.push('q='  + encodeURIComponent(q));
        if (lecture) params.push('lecture=' + encodeURIComponent(lecture));
        /* lang, sb & hd konsequent mitfuehren – einheitlich mit i18n.js an jedem Link. */
        params.push('lang=' + encodeURIComponent(uiLang()));
        params.push('sb=' + (document.documentElement.classList.contains('nav-collapsed') ? 'c' : 'e'));
        params.push('hd=' + (document.documentElement.classList.contains('header-collapsed') ? 'c' : 'e'));
        window.location.href = base + '?' + params.join('&');
    }

    /* Such-Formular (Header-Lupe und In-Page-Suchfeld) abfangen und weiterleiten */
    function initSearchForm(formId, inputId) {
        var form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var input = document.getElementById(inputId);
            redirectToSearch(input ? input.value.trim() : '', form);
        });
    }

    /* Suchergebnisse mit Titel, Link und Snippet darstellen */
    function renderResults(results, store, query) {
        var container = document.getElementById('search-results');
        if (!container) return;
        var m = t();
        if (!results.length) {
            container.innerHTML = '<p class="no-results">' + fill(m.none, { q: escapeHtml(query) }) + '</p>';
            return;
        }
        var items = results.map(function (r) {
            var entry   = store[r.ref] || {};
            var title   = entry.section ? (entry.page + ' – ' + entry.section) : (entry.page || r.ref);
            var snippet = entry.body ? getSnippet(entry.body, query) : '';
            return '<li class="result-item">'
                + '<a class="result-title" href="' + escapeHtml(r.ref) + '">'
                + escapeHtml(title) + '</a>'
                + (snippet ? '<p class="result-snippet">' + highlight(snippet, query) + '</p>' : '')
                + '</li>';
        }).join('');
        container.innerHTML = '<p class="result-count">'
            + fill(results.length === 1 ? m.resultsOne : m.resultsMany,
                   { n: results.length, q: escapeHtml(query) })
            + '</p><ul class="result-list">' + items + '</ul>';
        if (window.__propagateState) window.__propagateState();
    }

    /* Suchergebnisseite: Index aus eingebetteten Daten bauen und suchen –
       eingeschraenkt auf die aktuell ausgewaehlte Vorlesung. */
    function runSearch() {
        var query   = getParam('q').trim();
        var lecture      = getParam('lecture') || lastLecture();
        var m       = t();
        window.__activeLecture = lecture;

        var input   = document.getElementById('search-input');
        var heading = document.getElementById('search-heading');
        var out     = document.getElementById('search-results');
        var titles  = (uiLang() === 'en' && window.SEARCH_LECTURE_TITLES_EN)
                      ? window.SEARCH_LECTURE_TITLES_EN : (window.SEARCH_LECTURE_TITLES || {});
        var scope   = (lecture && titles[lecture]) ? titles[lecture] : '';

        if (input)   input.value = query;
        if (heading) heading.textContent = scope
            ? (query ? fill(m.headingScopeQuery, { scope: scope, q: query }) : fill(m.headingScope, { scope: scope }))
            : (query ? fill(m.headingQuery, { q: query }) : (m.heading || ''));
        if (!query)  return;

        if (query.length < 3) {
            if (out) out.innerHTML = '<p class="no-results">' + m.min + '</p>';
            return;
        }
        if (typeof window.SEARCH_DOCS === 'undefined' || typeof lunr === 'undefined') {
            if (out) out.innerHTML = '<p class="no-results">' + m.unavailable + '</p>';
            return;
        }

        /* Dokumente der aktuellen Vorlesung; bevorzugt in der Oberflaechensprache,
           sonst Fallback auf Deutsch (analog zum Inhalts-Fallback der Seiten). */
        var pool = window.SEARCH_DOCS;
        if (lecture) pool = pool.filter(function (d) { return d.lecture === lecture; });
        var want = uiLang();
        var inUi = pool.filter(function (d) { return (d.lang || 'de') === want; });
        var docs = inUi.length ? inUi : pool.filter(function (d) { return (d.lang || 'de') === 'de'; });

        var store = {};
        var idx = lunr(function () {
            this.use(lunr.de);
            this.pipeline.after(lunr.de.stemmer, lunr.de.stopWordFilter);
            this.searchPipeline.before(lunr.de.stemmer, lunr.de.stopWordFilter);
            var minLen = function (token) { return token.toString().length < 3 ? null : token; };
            lunr.Pipeline.registerFunction(minLen, 'minLen3');
            this.pipeline.add(minLen);
            this.ref('id');
            this.field('section', { boost: 12 });
            this.field('page', { boost: 6 });
            this.field('body');
            docs.forEach(function (d) {
                store[d.id] = { page: d.page, section: d.section, body: d.body };
                this.add(d);
            }, this);
        });

        var results;
        try { results = idx.search(query); } catch (e) { results = []; }
        renderResults(results, store, query);
    }

    document.addEventListener('DOMContentLoaded', function () {
        initSearchForm('header-search-form', 'header-search-input');
        initSearchForm('search-form', 'search-input');
        if (document.getElementById('search-results')) {
            runSearch();
            /* Beim Sprachwechsel (i18n.js ruft __onLangChange) Ueberschrift +
               Trefferliste in der neuen Sprache neu rendern. */
            window.__onLangChange = function () { runSearch(); };
        }
    });

}());
