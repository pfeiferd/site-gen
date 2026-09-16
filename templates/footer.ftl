    </main>
</div>

<#if isLecture && !documentOnly>
<div class="slide-nav" aria-label="Folien-Navigation">
    <button type="button" class="slide-nav-btn slide-prev" aria-label="Vorherige Folie"><svg class="slide-nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></button>
    <span class="slide-counter" aria-live="polite"></span>
    <button type="button" class="slide-nav-btn slide-next" aria-label="Nächste Folie"><svg class="slide-nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button>
</div>
</#if>

<#-- Laufender Fuss der Dokument-Druckansicht (nur beim Drucken sichtbar, per CSS
     via position:fixed am unteren Rand jeder Druckseite wiederholt). Inhalt wie
     beim Folien-Fuss: Vorlesung &ndash; Thema links, Copyright rechts. -->
<#if isLecture>
<#-- Copyright ohne Hochschulname: im Dokument-Druck fehlt sonst der Platz und die
     Zeile bricht um. Der Folien-Fuss (page.ftl) enthaelt den Namen weiterhin. -->
<footer class="doc-print-footer" aria-hidden="true">
    <span class="slide-footer-title">${curTitle}<#if (content.title)?has_content> &ndash; ${content.title}</#if></span>
    <span class="slide-footer-credit">&copy; ${(content.copyrightYear)!"2026"} &middot; ${lecturerName}</span>
</footer>
</#if>

<#-- Das Aenderungsdatum wird sprachabhaengig ausgegeben: numerisch tagzuerst
     (dd.MM.yyyy) fuer DE, monatzuerst (MM/dd/yyyy) fuer EN. Die EN-Variante
     haengt als data-i18n-en am Datum und wird von i18n.js eingesetzt. -->
<footer class="site-footer">
    <div class="footer-inner">
        <#-- footerOrg (aus content/meta.properties) ersetzt die Kette
             "Dozent – Fakultaet, Hochschule" durch einen einzigen Traeger -
             fuer Sites, die keine Hochschulstruktur haben. -->
        <#-- footerOrg wird genau so ausgegeben, wie es in meta.properties steht:
             die Zeichensetzung am Ende ("... e.V.") gehoert in den Wert, nicht
             ins Template. -->
        <#assign fOrg = (content.footerOrg!"") />
        &copy; ${(content.copyrightYear)!"2026"}. <#if fOrg?has_content><@linked url=lecturerUrl urlEn=lecturerUrlEn>${fOrg}</@linked><#else><@linked url=lecturerUrl urlEn=lecturerUrlEn>${lecturerName}</@linked> – <@linked url=facultyUrl urlEn=facultyUrlEn><span data-i18n-de="${facultyNameFlat?html}" data-i18n-en="${facultyNameEnFlat?html}">${facultyNameFlat}</span></@linked>, <@linked url=universityUrl urlEn=universityUrlEn><span data-i18n-de="${universityName?html}" data-i18n-en="${universityNameEn?html}">${universityName}</span></@linked>.</#if> <span data-i18n="footer.modified">Zuletzt geändert am</span> <span data-i18n-de="${.now?string("dd.MM.yyyy")}" data-i18n-en="${.now?string("MM/dd/yyyy")}">${.now?string("dd.MM.yyyy")}</span>.
    </div>
</footer>

<#-- Bild-Lightbox: Klick auf ein Inhaltsbild oeffnet die Vollansicht ueber der
     ganzen Seite; Klick auf den Hintergrund, das Schliessen-Kreuz oder Esc
     schliesst sie wieder. Icons (Vorlesungskacheln) sind ausgenommen. -->
<script>
(function () {
    var imgs = [].slice.call(document.querySelectorAll('.page-article-body img'))
        .filter(function (img) { return !img.classList.contains('lecture-card-icon'); });
    if (!imgs.length) return;

    var overlay = document.createElement('div');
    overlay.className = 'img-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var big = document.createElement('img');
    big.alt = '';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'img-lightbox-close';
    close.setAttribute('aria-label', 'Schließen');
    close.innerHTML = '&times;';

    overlay.appendChild(big);
    overlay.appendChild(close);
    document.body.appendChild(overlay);

    function open(img) {
        big.src = img.currentSrc || img.src;
        big.alt = img.alt || '';
        overlay.classList.add('open');
        document.documentElement.style.overflow = 'hidden';
    }
    function hide() {
        overlay.classList.remove('open');
        document.documentElement.style.overflow = '';
        big.removeAttribute('src');
    }

    imgs.forEach(function (img) {
        img.addEventListener('click', function () { open(img); });
    });
    /* Klick auf den Hintergrund oder das Kreuz schliesst; Klick auf das Bild
       selbst laesst die Ansicht offen. */
    overlay.addEventListener('click', function (e) {
        if (e.target !== big) hide();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) hide();
    });
}());
</script>
<script>window.I18N={"de":{<#if (content.i18nDe)??><#list content.i18nDe?keys as k>"${k?js_string}":"${(content.i18nDe[k])?js_string}"<#sep>,</#sep></#list></#if>},"en":{<#if (content.i18nEn)??><#list content.i18nEn?keys as k>"${k?js_string}":"${(content.i18nEn[k])?js_string}"<#sep>,</#sep></#list></#if>}};</script>
<script src="${content.rootpath}js/i18n.js?v=${.now?long?c}"></script>
<script src="${content.rootpath}js/search.js?v=${.now?long?c}"></script>
<script>
(function () {
    var header  = document.querySelector('.site-header');
    var wrapper = document.querySelector('.page-wrapper');
    var footer  = document.querySelector('.site-footer');
    if (!header) return;
    function updateStickyTop() {
        var headerH       = header.getBoundingClientRect().height;
        var wrapperMargin = wrapper
            ? parseFloat(getComputedStyle(wrapper).marginTop) : 16;
        document.documentElement.style.setProperty('--sticky-top', (headerH + wrapperMargin) + 'px');
        /* Hoehe des fest fixierten Footers -> Platz darunter (body padding-bottom). */
        if (footer) document.documentElement.style.setProperty('--footer-height', footer.getBoundingClientRect().height + 'px');
    }
    updateStickyTop();
    window.addEventListener('resize', updateStickyTop);

    var navHeader = document.querySelector('.nav-header');
    var toggle    = document.querySelector('.nav-toggle');
    function syncAria() {
        var collapsed = document.documentElement.classList.contains('nav-collapsed');
        if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    var expandTimer;
    function toggleNav() {
        var html = document.documentElement;
        var willCollapse = !html.classList.contains('nav-collapsed');
        clearTimeout(expandTimer);
        if (willCollapse) {
            html.classList.remove('nav-expanding');
            html.classList.add('nav-collapsed');
        } else {
            html.classList.add('nav-expanding');
            html.classList.remove('nav-collapsed');
            expandTimer = setTimeout(function () {
                html.classList.remove('nav-expanding');
            }, 200);
        }
        try { localStorage.setItem('navCollapsed', willCollapse ? '1' : '0'); } catch (e) {}
        syncAria();
        /* Sidebar-Zustand hat sich geaendert -> Links neu dekorieren + eigene URL syncen. */
        if (window.__propagateState) window.__propagateState();
        if (window.__syncUrl) window.__syncUrl();
    }

    syncAria();
    if (window.__propagateState) window.__propagateState();
    if (navHeader) navHeader.addEventListener('click', toggleNav);

    /* Kopfbereich ein-/ausklappen - analog zur Seitenleiste. Weil sich dabei die
       Hoehe der Kopfzeile aendert, muss --sticky-top neu berechnet werden, sonst
       klebt die Seitenleiste in der falschen Hoehe. */
    var headerBar    = document.querySelector('.header-toggle-bar');
    var headerToggle = document.querySelector('.header-toggle');
    function syncHeaderAria() {
        var collapsed = document.documentElement.classList.contains('header-collapsed');
        if (headerToggle) headerToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
    var headerExpandTimer;
    function toggleHeader() {
        var html = document.documentElement;
        var willCollapse = !html.classList.contains('header-collapsed');
        clearTimeout(headerExpandTimer);
        if (willCollapse) {
            html.classList.remove('header-expanding');
            html.classList.add('header-collapsed');
        } else {
            /* Inhalt bleibt waehrend des Aufklappens ausgeblendet (wie bei der
               Seitenleiste), damit er nicht bei halber Hoehe aufblitzt. */
            html.classList.add('header-expanding');
            html.classList.remove('header-collapsed');
            headerExpandTimer = setTimeout(function () {
                html.classList.remove('header-expanding');
                updateStickyTop();
            }, 200);
        }
        try { localStorage.setItem('headerCollapsed', willCollapse ? '1' : '0'); } catch (e) {}
        syncHeaderAria();
        updateStickyTop();
        /* Nach dem Uebergang steht die endgueltige Kopfhoehe fest. */
        setTimeout(updateStickyTop, 220);
        if (window.__propagateState) window.__propagateState();
        if (window.__syncUrl) window.__syncUrl();
    }

    syncHeaderAria();
    if (headerBar) headerBar.addEventListener('click', toggleHeader);

    /* Nachtmodus: data-theme am <html> umschalten und die Wahl merken. Den
       Anfangswert setzt bereits das Kopf-Skript, hier wird nur getauscht. */
    var themeBtn = document.querySelector('.theme-toggle');
    function syncThemeAria() {
        var dark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (themeBtn) themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
    function toggleTheme() {
        var html = document.documentElement;
        var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        /* Ab jetzt ist die Anzeige ausdruecklich gewaehlt -> sie wandert als
           Parameter 'theme' mit, wie Sprache, Seitenleiste und Ansicht. */
        html.setAttribute('data-theme-chosen', '1');
        try { localStorage.setItem('theme', next); } catch (e) {}
        syncThemeAria();
        if (window.__propagateState) window.__propagateState();
        if (window.__syncUrl) window.__syncUrl();
    }
    syncThemeAria();
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    /* Vollbild ueber die Fullscreen-API: blendet die Browser-Oberflaeche aus.
       Der Zustand wird NICHT gemerkt - Vollbild laesst sich ohne Nutzergeste
       ohnehin nicht wiederherstellen. */
    var fsBtn = document.querySelector('.fullscreen-toggle');
    function fsElement() {
        return document.fullscreenElement || document.webkitFullscreenElement || null;
    }
    /* Vollbild blendet nur die Browser-Oberflaeche aus. Kopfzeile und
       Seitenleiste behalten bewusst ihren Zustand - sie werden ueber ihre
       eigenen Umschalter gesteuert. */
    function syncFullscreen() {
        var on = !!fsElement();
        document.documentElement.classList[on ? 'add' : 'remove']('is-fullscreen');
        if (fsBtn) fsBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function toggleFullscreen() {
        var el = document.documentElement;
        if (!fsElement()) {
            var req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req) { try { var r = req.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) {} }
        } else {
            var exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) { try { var x = exit.call(document); if (x && x.catch) x.catch(function () {}); } catch (e) {} }
        }
    }
    /* Auch Esc / F11 aendern den Zustand -> am Ereignis nachfuehren, nicht am Klick. */
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
        document.documentElement.classList.add('no-fullscreen');
    }
    syncFullscreen();
    if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);
}());
</script>
<script>
/* Ansicht-Umschalter (Dokument / Slides) + Folien-Navigation */
(function () {
    var html    = document.documentElement;
    var slides  = [].slice.call(document.querySelectorAll('.page-article-body > .slide'));
    var btns    = [].slice.call(document.querySelectorAll('.view-switch-btn'));
    var nav     = document.querySelector('.slide-nav');
    var prevBtn = nav ? nav.querySelector('.slide-prev') : null;
    var nextBtn = nav ? nav.querySelector('.slide-next') : null;
    var counter = nav ? nav.querySelector('.slide-counter') : null;
    if (!btns.length && !slides.length) return;

    /* Querformat beim Drucken nur im Slide-Modus (per @page kann keine Klasse
       selektiert werden -> Style-Element dynamisch setzen). */
    var printStyle = document.createElement('style');
    document.head.appendChild(printStyle);
    function updatePrintStyle() {
        printStyle.textContent = html.classList.contains('mode-slides')
            ? '@media print{@page{size:A4 landscape;margin:1cm 1.4cm}}'
            : '';
    }

    var current = 0;
    function multi() { return slides.length > 1; }

    function showSlide(i) {
        if (!slides.length) return;
        current = Math.max(0, Math.min(i, slides.length - 1));
        slides.forEach(function (s, k) { s.classList.toggle('active', k === current); });
        if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
        if (prevBtn) prevBtn.disabled = current === 0;
        if (nextBtn) nextBtn.disabled = current === slides.length - 1;
        if (html.classList.contains('mode-slides')) { try { window.scrollTo(0, 0); } catch (e) {} }
    }

    function setMode(slidesOn) {
        html.classList.toggle('mode-slides', slidesOn);
        html.classList.toggle('has-multi', slidesOn && multi());
        btns.forEach(function (b) {
            b.setAttribute('aria-pressed',
                (b.getAttribute('data-view') === 'slides') === slidesOn ? 'true' : 'false');
        });
        try { localStorage.setItem('viewMode', slidesOn ? 'slides' : 'doc'); } catch (e) {}
        updatePrintStyle();
        if (slidesOn) showSlide(current);
        /* Ansicht hat sich geaendert -> alle Links neu dekorieren (view mitfuehren)
           und die eigene URL synchron halten, damit die Ansicht global erhalten bleibt. */
        if (window.__propagateState) window.__propagateState();
        if (window.__syncUrl) window.__syncUrl();
    }

    btns.forEach(function (b) {
        b.addEventListener('click', function () {
            setMode(b.getAttribute('data-view') === 'slides');
        });
    });
    if (prevBtn) prevBtn.addEventListener('click', function () { showSlide(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { showSlide(current + 1); });

    document.addEventListener('keydown', function (e) {
        if (!html.classList.contains('mode-slides')) return;
        if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown')      { e.preventDefault(); showSlide(current + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp')    { e.preventDefault(); showSlide(current - 1); }
    });

    /* Sprung-Links (TOC/Anker): die Folie mit dem Ziel aktivieren. */
    function slideOf(el) {
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains('slide')) return el;
            el = el.parentNode;
        }
        return null;
    }
    function goToHash() {
        if (!html.classList.contains('mode-slides')) return;
        var id = decodeURIComponent((location.hash || '').slice(1));
        if (!id) return;
        var el = document.getElementById(id);
        var sl = el && slideOf(el);
        if (sl) {
            var idx = slides.indexOf(sl);
            if (idx >= 0) { showSlide(idx); if (el.scrollIntoView) el.scrollIntoView(); }
        }
    }
    window.addEventListener('hashchange', goToHash);

    /* Initialzustand (mode-slides evtl. schon durch das Kopf-Skript gesetzt). */
    setMode(html.classList.contains('mode-slides'));
    goToHash();
}());
</script>
<#if (content.math!"false") == "true">
<#-- LaTeX/Mathe: nur auf Seiten mit math=true. MathJax ist lokal gebuendelt
     (assets/js/tex-svg.js, SVG-Ausgabe -> keine externen Fonts, kein CDN).
     Delimiter: $...$ (inline) und $$...$$ (abgesetzt) — bewusst gewaehlt, weil sie
     den Markdown-Parser (Flexmark) unbeschadet ueberstehen; \(...\)/\[...\] wuerden
     durch das Backslash-Escaping zerstoert. Zusaetzlich werden ```math-Codebloecke
     (verbatim, damit markdown-sicher) in abgesetzte Formeln umgewandelt. -->
<script>
(function () {
    document.querySelectorAll('pre > code.language-math').forEach(function (code) {
        var div = document.createElement('div');
        div.className = 'math-block';
        div.textContent = '$$' + code.textContent.replace(/\n+$/, '') + '$$';
        code.parentNode.replaceWith(div);
    });
    window.MathJax = {
        tex: { inlineMath: [['$', '$']], displayMath: [['$$', '$$']], processEscapes: true },
        options: { skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'] },
        svg: { fontCache: 'global' }
    };
}());
</script>
<script src="${content.rootpath}js/tex-svg.js" id="MathJax-script" async></script>
</#if>
<#-- Karten (Leaflet, lokal gebuendelt) nur auf Seiten laden, die eine haben.
     page.ftl setzt hasMap, wenn es einen ```map-Block umgewandelt hat. -->
<#if (hasMap!false)>
<script src="${content.rootpath}js/leaflet.js"></script>
<script src="${content.rootpath}js/map.js?v=${.now?long?c}"></script>
</#if>
<#-- Syntax-Highlighting (highlight.js, lokal gebuendelt). Nur Codebloecke mit
     Sprachangabe (```java, ```sql, ```python …) werden eingefaerbt; schlichte
     Beispielbloecke ohne Sprache bleiben unberuehrt. Laeuft nach der Mathe-
     Umwandlung, sodass ```math-Bloecke bereits entfernt sind. -->
<script src="${content.rootpath}js/highlight.min.js"></script>
<script>
(function () {
    if (!window.hljs) return;
    document.querySelectorAll('pre code[class*="language-"]').forEach(function (el) {
        if (el.classList.contains('language-math')) return;
        try { hljs.highlightElement(el); } catch (e) {}
    });
}());
</script>
</body>
</html>
