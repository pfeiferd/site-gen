'use strict';

/*
 * Client-seitige Oberflaechen-Uebersetzung (DE/EN).
 *
 * Die Seiten werden serverseitig in ihrer Inhaltssprache gerendert; dieses
 * Skript ersetzt beim Umschalten auf EN alle mit data-i18n* markierten
 * Chrome-Texte durch die englische Variante. Der eigentliche Vorlesungs-INHALT
 * bleibt in der vorhandenen Sprache (Fallback de), nur die Beschriftungen
 * wechseln.
 *
 * Sprachzustand — EINHEITLICH ueber den Schluessel/Parameter "lang":
 *   - URL-Parameter ?lang=de|en (an interne Links weitergereicht),
 *   - localStorage-Schluessel "lang",
 *   - das Attribut <html data-lang> (im frueh ausgefuehrten <head>-Script
 *     gesetzt, BEVOR gerendert wird -> aktiver Button rein per CSS, kein
 *     Umschalt-Flackern).
 *
 * Woerterbuch-Attribute (Schluessel -> I18N_EN):
 *   data-i18n / -html / -title / -placeholder / -aria
 * Inline-Paar (Wert direkt am Element, z. B. Vorlesungsnamen):
 *   data-i18n-en [+ data-i18n-de] -> textContent
 */
(function () {
    /* Die UI-Strings kommen aus content/*.properties (site_<lang> + <page>_<lang>)
       und werden zur Bauzeit als window.I18N = {de:{…}, en:{…}} ins HTML emittiert
       (kein Uebersetzungs-Inhalt in assets/). i18n.js ist nur der Mechanismus.
       Die deutsche Tabelle ueberschreibt die im Template stehenden Vorgaben -
       so kann eine Site Begriffe umbenennen ("Unterlagen" -> "Menue"), ohne die
       Templates anzufassen. Fehlt ein Schluessel, bleibt der Template-Text. */
    var EN = (window.I18N && window.I18N.en) || {};
    var DE = (window.I18N && window.I18N.de) || {};

    /* [Attribut, Ziel-Property/Attribut, Art] */
    var SPECS = [
        ['data-i18n',             null,          'text'],
        ['data-i18n-html',        null,          'html'],
        ['data-i18n-title',       'title',       'attr'],
        ['data-i18n-placeholder', 'placeholder', 'attr'],
        ['data-i18n-aria',        'aria-label',  'attr']
    ];

    function param() {
        try {
            var p = new URLSearchParams(location.search).get('lang');
            return (p === 'en' || p === 'de') ? p : '';
        } catch (e) { return ''; }
    }
    function stored() {
        try { return localStorage.getItem('lang') || ''; } catch (e) { return ''; }
    }
    /* URL-Parameter > localStorage > vom <head> gesetztes data-lang/lang > de. */
    function getLang() {
        return param() || stored()
            || document.documentElement.getAttribute('data-lang')
            || document.documentElement.getAttribute('lang') || 'de';
    }
    function store(l) {
        try { localStorage.setItem('lang', l); } catch (e) {}
    }

    function applyOne(el, spec, lang) {
        var attr = spec[0], target = spec[1], kind = spec[2];
        var key = el.getAttribute(attr);
        if (!key) return;
        var cache = '_i18n_' + attr;
        if (el[cache] === undefined) {
            el[cache] = kind === 'text' ? el.textContent
                      : kind === 'html' ? el.innerHTML
                      : el.getAttribute(target);
        }
        var table = (lang === 'en') ? EN : DE;
        var val = (table[key] != null) ? table[key] : el[cache];
        if (kind === 'text')      el.textContent = val;
        else if (kind === 'html') el.innerHTML = val;
        else                      el.setAttribute(target, val);
    }

    /* Inline-Paare am Element:
       - data-i18n-en (+ optional data-i18n-de)  -> textContent
       - data-i18n-en-html (+ optional data-i18n-de-html) -> innerHTML (z. B. mit <br>/<strong>)
       Der de-Wert ist der Ausgangsinhalt bzw. das -de-Attribut. */
    function applyInline(lang) {
        var nodes = document.querySelectorAll('[data-i18n-en]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el._i18nInlineDe === undefined) {
                var de = el.getAttribute('data-i18n-de');
                el._i18nInlineDe = (de != null) ? de : el.textContent;
            }
            el.textContent = (lang === 'en') ? (el.getAttribute('data-i18n-en') || el._i18nInlineDe)
                                             : el._i18nInlineDe;
        }
        /* Inline-Paare fuer Attribute: data-i18n-en-placeholder / -aria
           (+ optional die -de-Gegenstuecke). Gedacht fuer Beschriftungen, die
           im Markdown stehen und deshalb keinen Woerterbuch-Schluessel haben. */
        [['placeholder', 'placeholder'], ['aria', 'aria-label']].forEach(function (pair) {
            var attr = 'data-i18n-en-' + pair[0], target = pair[1];
            var list = document.querySelectorAll('[' + attr + ']');
            for (var k = 0; k < list.length; k++) {
                var el = list[k], cache = '_i18nInline_' + pair[0];
                if (el[cache] === undefined) {
                    var de = el.getAttribute('data-i18n-de-' + pair[0]);
                    el[cache] = (de != null) ? de : el.getAttribute(target);
                }
                el.setAttribute(target, (lang === 'en')
                    ? (el.getAttribute(attr) || el[cache]) : el[cache]);
            }
        });

        var htmlNodes = document.querySelectorAll('[data-i18n-en-html]');
        for (var h = 0; h < htmlNodes.length; h++) {
            var e2 = htmlNodes[h];
            if (e2._i18nInlineDeHtml === undefined) {
                var deh = e2.getAttribute('data-i18n-de-html');
                e2._i18nInlineDeHtml = (deh != null) ? deh : e2.innerHTML;
            }
            e2.innerHTML = (lang === 'en') ? (e2.getAttribute('data-i18n-en-html') || e2._i18nInlineDeHtml)
                                           : e2._i18nInlineDeHtml;
        }
    }

    /* --- Zustand an JEDEN internen Link anhaengen: lang UND sb (Sidebar). --- */
    function internal(href) {
        return href && !/^(?:[a-z]+:|\/\/|#)/i.test(href);
    }
    function sbState() {   /* Sidebar: c = eingeklappt, e = ausgeklappt */
        return document.documentElement.classList.contains('nav-collapsed') ? 'c' : 'e';
    }
    function hdState() {   /* Kopfbereich: c = eingeklappt, e = ausgeklappt */
        return document.documentElement.classList.contains('header-collapsed') ? 'c' : 'e';
    }
    function viewState() { /* Ansicht: doc = Dokument, slides = Foliensatz */
        return document.documentElement.classList.contains('mode-slides') ? 'slides' : 'doc';
    }
    /* Kennt die Seite beide Ansichten? Die Markierung setzt das Kopf-Skript
       (header.ftl) - nicht am Umschalter festmachen, der laesst sich per
       showViewSwitch=false ausblenden, ohne dass die Ansicht verschwindet. */
    function hasViews() {
        return document.documentElement.classList.contains('has-views');
    }
    /* Kopfbereich ein-/ausklappbar? Ohne Umschalter (showHeaderToggle=false)
       gibt es keinen Zustand, der mitgefuehrt werden muesste. */
    function hasHeaderToggle() {
        return !!document.querySelector('.header-toggle-bar');
    }
    function themeState() { /* Anzeige: light = hell, dark = Nachtmodus */
        return document.documentElement.getAttribute('data-theme') || 'light';
    }
    /* Nur eine ausdrueckliche Wahl (Klick oder ?theme=) wird mitgefuehrt; eine
       vom System geerbte Einstellung bleibt unangetastet (s. header.ftl). */
    function themeChosen() {
        return document.documentElement.hasAttribute('data-theme-chosen');
    }
    function langState() {
        return document.documentElement.getAttribute('data-lang') || getLang();
    }
    /* Einen einzelnen Query-Parameter in einen (internen) URL/Link setzen/ersetzen. */
    function putParam(href, name, value) {
        if (!internal(href)) return href;
        var hash = '', hi = href.indexOf('#');
        if (hi !== -1) { hash = href.slice(hi); href = href.slice(0, hi); }
        var base = href, query = '', qi = href.indexOf('?');
        if (qi !== -1) { base = href.slice(0, qi); query = href.slice(qi + 1); }
        var parts = query ? query.split('&').filter(Boolean) : [];
        var out = [];
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].indexOf(name + '=') !== 0) out.push(parts[i]);
        }
        out.push(name + '=' + value);
        return base + '?' + out.join('&') + hash;
    }
    /* Interne Links tragen lang + sb und – auf Vorlesungsseiten – auch die Ansicht
       "view" (Dokument/Slides). So bleibt die gewaehlte Ansicht beim Navigieren
       zwischen Vorlesungsteilen (Sidebar) global erhalten, nicht nur ueber
       localStorage. Auf Nicht-Vorlesungsseiten (Start, Suche) waere view sinnlos
       und wird weggelassen; dort greift beim Sprung in eine Vorlesung der
       localStorage-Fallback. */
    function decorate(href, lang) {
        if (!internal(href)) return href;
        href = putParam(href, 'lang', lang || langState());
        href = putParam(href, 'sb', sbState());
        if (hasHeaderToggle()) {
            href = putParam(href, 'hd', hdState());
        }
        if (hasViews()) {
            href = putParam(href, 'view', viewState());
        }
        if (themeChosen()) {
            href = putParam(href, 'theme', themeState());
        }
        return href;
    }
    /* Alle vorhandenen internen Links dekorieren (auch fuer Middle-Click / neue Tabs). */
    function propagateAll() {
        var links = document.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
            var a = links[i], h = a.getAttribute('href'), n = decorate(h);
            if (n !== h) a.setAttribute('href', n);
        }
    }
    window.__propagateState = propagateAll;

    /* Aktuelle URL selbst mit lang+sb+theme synchronisieren (ohne Reload), damit
       der Zustand bei jeder Aenderung (Sprache, Sidebar, Ansicht, Nachtmodus)
       UND beim Neuladen erhalten bleibt und nie aus der Adresse "verloren" geht. */
    function syncUrl() {
        try {
            var here = location.pathname + location.search + location.hash;
            var next = decorate(here);                       // lang + sb
            if (hasViews()) {                                // nur Vorlesungsseiten
                next = putParam(next, 'view', viewState());   // Dokument/Slides
            }
            if (next !== here) history.replaceState(history.state, '', next);
        } catch (e) {}
    }
    window.__syncUrl = syncUrl;

    /* Sicherheitsnetz: beim Klick den Ziel-Link JIT mit dem AKTUELLEN Zustand
       dekorieren – faengt dynamisch erzeugte Links (z. B. Suchtreffer) und
       zwischenzeitliche Zustandsaenderungen (Sidebar auf/zu) zuverlaessig ab. */
    document.addEventListener('click', function (e) {
        var t = e.target;
        while (t && t.nodeName !== 'A') t = t.parentNode;
        if (t && t.getAttribute) {
            var h = t.getAttribute('href'), n = decorate(h);
            if (n !== h) t.setAttribute('href', n);
        }
    }, true);

    function applyLang(lang) {
        document.documentElement.setAttribute('data-lang', lang);
        document.documentElement.setAttribute('lang', lang);
        store(lang);

        for (var s = 0; s < SPECS.length; s++) {
            var nodes = document.querySelectorAll('[' + SPECS[s][0] + ']');
            for (var i = 0; i < nodes.length; i++) applyOne(nodes[i], SPECS[s], lang);
        }
        applyInline(lang);

        /* Sprachspezifisches Link-Ziel (z. B. Vorlesungs-Kacheln auf der Startseite):
           href je nach Sprache auf die de- bzw. en-Variante setzen. Der de-Wert wird
           einmal (unveraendert) gemerkt; propagateAll haengt danach lang+sb an. */
        var langLinks = document.querySelectorAll('[data-href-en]');
        for (var k = 0; k < langLinks.length; k++) {
            var ll = langLinks[k];
            if (ll._hrefDe === undefined) ll._hrefDe = ll.getAttribute('href');
            ll.setAttribute('href', (lang === 'en')
                ? (ll.getAttribute('data-href-en') || ll._hrefDe) : ll._hrefDe);
        }

        /* Sprachspezifische Bildquelle (z. B. das Hochschul-Logo de/en). */
        var langImgs = document.querySelectorAll('[data-src-en]');
        for (var s2 = 0; s2 < langImgs.length; s2++) {
            var im = langImgs[s2];
            if (im._srcDe === undefined) im._srcDe = im.getAttribute('src');
            im.setAttribute('src', (lang === 'en')
                ? (im.getAttribute('data-src-en') || im._srcDe) : im._srcDe);
        }

        var btns = document.querySelectorAll('.lang-switch-btn');
        for (var j = 0; j < btns.length; j++) {
            if (btns[j].getAttribute('data-lang') === lang) btns[j].setAttribute('aria-current', 'true');
            else btns[j].removeAttribute('aria-current');
        }
        propagateAll();
        syncUrl();
        window.__lang = lang;
        /* Wer eigene Beschriftungen aufbaut (z. B. die Filterleiste der Karten),
           haengt sich hier ein statt den Zustand einmalig beim Laden zu lesen. */
        try {
            document.dispatchEvent(new CustomEvent('lang-change', { detail: lang }));
        } catch (e) {}
        if (typeof window.__onLangChange === 'function') window.__onLangChange(lang);
    }

    function onClick() {
        var lang = this.getAttribute('data-lang');
        store(lang);
        /* Gibt es die Vorlesung in dieser Sprache als eigene Seite -> dorthin
           wechseln (mit vollem Zustand). Sonst nur die Oberflaeche uebersetzen. */
        if (this.getAttribute('data-nav') === 'true') {
            window.location.href = decorate(this.getAttribute('data-href'), lang);
            return;
        }
        applyLang(lang);
    }

    function init() {
        var btns = document.querySelectorAll('.lang-switch-btn');
        for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', onClick);
        applyLang(getLang());
    }

    window.__applyLang = applyLang;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
