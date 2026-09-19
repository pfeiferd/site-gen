<#assign isLecture = (content.navgroup)?? && content.navgroup == "docs" />
<#-- documentOnly (aus <lecture>/meta.properties): keine Slides-Ansicht anbieten;
     Anzeige und Druck erfolgen ausschliesslich in der Dokumentansicht. -->
<#assign documentOnly = isLecture && (content.documentOnly!"false") == "true" />
<#-- Abschaltbare Bedienelemente (aus meta.properties, site-weit oder je Vorlesung).
     Alle drei sind standardmaessig eingeschaltet; erst "false" blendet aus:
       showViewSwitch    - Umschalter Dokument/Slides (rechts oben)
       showFullscreen    - Vollbildknopf (rechts oben)
       showHeaderToggle  - Pfeil zum Ein-/Ausklappen der Kopfzeile -->
<#assign showViewSwitch   = (content.showViewSwitch!"true") != "false" />
<#assign showFullscreen   = (content.showFullscreen!"true") != "false" />
<#assign showHeaderToggle = (content.showHeaderToggle!"true") != "false" />
<#assign curLecture = content.lecture!"" />
<#assign curLang = content.lang!"de" />
<#assign uiLangs = ["de", "en"] />

<#-- Site-weite Metadaten (aus content/meta.properties, von MetaMerge in jede Seite gemerged). -->
<#assign lecturerName    = (content.lecturerName)!"" />
<#assign lecturerUrl     = (content.lecturerUrl)!"" />
<#assign lecturerUrlEn   = (content.lecturerUrlEn)!lecturerUrl />
<#assign universityName  = (content.universityName)!"" />
<#assign universityNameEn= (content.universityNameEn)!universityName />
<#assign universityUrl   = (content.universityUrl)!"" />
<#assign universityUrlEn = (content.universityUrlEn)!universityUrl />
<#assign universityLogo  = (content.universityLogo)!"hhn-logo.png" />
<#assign universityLogoEn= (content.universityLogoEn)!universityLogo />
<#assign facultyName     = (content.facultyName)!"" />
<#assign facultyNameEn   = (content.facultyNameEn)!facultyName />
<#assign facultyUrl      = (content.facultyUrl)!"" />
<#assign facultyUrlEn    = (content.facultyUrlEn)!facultyUrl />
<#-- "|" im Namen markiert die Umbruchstelle im Logo: -> <br>; sonst Leerzeichen. -->
<#assign facultyNameFlat   = facultyName?replace("|", " ") />
<#assign facultyNameEnFlat = facultyNameEn?replace("|", " ") />
<#assign facultyLogoDe     = facultyName?replace("|", "<br>") />
<#assign facultyLogoEn     = facultyNameEn?replace("|", "<br>") />

<#-- Rendert den Inhalt als Link, wenn eine URL gesetzt ist; sonst als reinen Text
     (bzw. als <span> mit Klasse). Mit urlEn wird ein sprachabhaengiges Ziel gesetzt
     (data-href-en, das i18n.js beim Sprachwechsel aktiviert). -->
<#macro linked url class="" urlEn=""><#if url?has_content><a<#if class?has_content> class="${class}"</#if> href="${url}"<#if urlEn?has_content && urlEn != url> data-href-en="${urlEn}"</#if> target="_blank" rel="noopener"><#nested></a><#else><#if class?has_content><span class="${class}"><#nested></span><#else><#nested></#if></#if></#macro>

<#-- Anzeigetitel aus dem Slug ableiten ("maschinelles-lernen" -> "Maschinelles Lernen"),
     sofern keine explizite lectureTitle-Angabe vorliegt. -->
<#function slugToTitle slug>
    <#assign t = "">
    <#list slug?split("-") as p><#assign t = t + p?cap_first><#if !p?is_last><#assign t = t + " "></#if></#list>
    <#return t>
</#function>

<#-- Welche Sprachen (de/en) gibt es fuer eine Vorlesung? -->
<#function lectureLangs slug>
    <#assign ls = [] />
    <#list published_pages as pg>
        <#if (pg.navgroup!"") == "docs" && (pg.lecture!"") == slug && !ls?seq_contains(pg.lang!"de")>
            <#assign ls = ls + [pg.lang!"de"] />
        </#if>
    </#list>
    <#return ls>
</#function>

<#-- Einstiegsseite (kleinste navorder) einer Vorlesung in einer Sprache; "" falls keine. -->
<#function lectureEntry slug lang>
    <#assign best = "" />
    <#assign bestOrder = 9999 />
    <#list published_pages as pg>
        <#if (pg.navgroup!"") == "docs" && (pg.lecture!"") == slug && (pg.lang!"de") == lang>
            <#assign ord = (pg.navorder!"99")?number />
            <#if best == "" || ord < bestOrder>
                <#assign best = pg.uri />
                <#assign bestOrder = ord />
            </#if>
        </#if>
    </#list>
    <#return best>
</#function>

<#-- Ziel des Sprachumschalters: gespiegelte Seite in <lang>, sonst Einstieg dieser
     Sprache, sonst die aktuelle Seite (Fallback = vorhandener Ordner). -->
<#function langTarget lang>
    <#if lang == curLang || !(content.uri??)><#return content.uri!"" /></#if>
    <#-- Den Sprachordner im Pfad austauschen. Er steht entweder in der Mitte
         ("<lecture>/de/seite.html") oder - wenn die Vorlesung direkt unter
         content/ liegt - ganz am Anfang ("de/seite.html"). -->
    <#assign uri = content.uri />
    <#if uri?starts_with(curLang + "/")>
        <#assign mirror = lang + uri?substring(curLang?length) />
    <#else>
        <#assign mirror = uri?replace("/" + curLang + "/", "/" + lang + "/") />
    </#if>
    <#-- Nur eine echte Spiegelseite zaehlt: greift keine der Ersetzungen, ist
         mirror die Seite selbst - die waere kein Sprachwechsel. -->
    <#if mirror != uri>
        <#list published_pages as pg>
            <#if pg.uri == mirror><#return mirror /></#if>
        </#list>
    </#if>
    <#assign e = lectureEntry(curLecture, lang) />
    <#return e?has_content?then(e, content.uri!"") />
</#function>

<#-- lectureTitle einer Vorlesung in einer Sprache (kommt aus <lang>/meta.properties).
     Leerstring, falls es die Vorlesung in dieser Sprache nicht gibt. -->
<#function lectureTitleFor slug lang>
    <#list published_pages as pg>
        <#if (pg.navgroup!"") == "docs" && (pg.lecture!"") == slug && (pg.lang!"de") == lang && (pg.lectureTitle!"")?has_content>
            <#return pg.lectureTitle />
        </#if>
    </#list>
    <#return "" />
</#function>

<#-- Vorlesungen ermitteln; der Titel je Sprache stammt aus den Sprachordnern. -->
<#assign lectures = [] />
<#assign seenSlugs = [] />
<#list ["de", "any"] as pass>
<#list published_pages?sort_by("navorder") as pg>
    <#if (pg.navgroup!"") == "docs" && (pg.lecture!"")?has_content && !seenSlugs?seq_contains(pg.lecture)
         && (pass == "any" || (pg.lang!"de") == "de")>
        <#assign seenSlugs = seenSlugs + [pg.lecture] />
        <#assign deT = lectureTitleFor(pg.lecture, "de") />
        <#assign enT = lectureTitleFor(pg.lecture, "en") />
        <#assign deEntry = lectureEntry(pg.lecture, "de") />
        <#assign enEntry = lectureEntry(pg.lecture, "en") />
        <#assign entryDe = deEntry?has_content?then(deEntry, enEntry?has_content?then(enEntry, pg.uri)) />
        <#assign entryEn = enEntry?has_content?then(enEntry, entryDe) />
        <#assign lectures = lectures + [{
            "slug":    pg.lecture,
            "title":   deT?has_content?then(deT, enT?has_content?then(enT, slugToTitle(pg.lecture))),
            "titleEn": enT?has_content?then(enT, deT?has_content?then(deT, slugToTitle(pg.lecture))),
            "icon":    pg.lectureIcon!"",
            "entry":   entryDe,
            "entryEn": entryEn
        }] />
    </#if>
</#list>
</#list>
<#assign lectures = lectures?sort_by("title") />

<#-- Titel der aktuellen Vorlesung in beiden Sprachen (fuer die Umschaltung). -->
<#assign curTitle = slugToTitle(curLecture) />
<#assign curTitleEn = curTitle />
<#list lectures as lec><#if lec.slug == curLecture>
    <#assign curTitle = lec.title />
    <#assign curTitleEn = lec.titleEn />
</#if></#list>
<#assign curIcon  = content.lectureIcon!"" />

<#-- Themen der aktuellen Vorlesung (nur in der aktuellen Sprache) fuer die Seitenleiste. -->
<#macro lectureNav>
    <#assign navPages = [] />
    <#list published_pages as pg>
        <#if (pg.navgroup!"") == "docs" && (pg.lecture!"") == curLecture && (pg.lang!"de") == curLang>
            <#assign navPages = navPages + [pg] />
        </#if>
    </#list>
    <#list navPages?sort_by("navorder") as pg>
        <li>
            <a href="${content.rootpath}${pg.uri}"
               <#if content.uri == pg.uri>class="active"</#if>>${pg.navlabel!pg.title}</a>
        </li>
    </#list>
</#macro>
<!DOCTYPE html>
<html lang="${curLang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Vorlesungsunterlagen – Hochschule Heilbronn, Fakultät Informatik">
    <#-- Titel der Registerkarte: "<Seite> – <Vorlesung> · <Site>".
         <Site> kommt aus siteTitle (content/meta.properties); ohne Angabe steht
         dort der Name des Traegers. Traegt die Site denselben Namen wie die
         Vorlesung - typisch, wenn eine Site AUS einer Vorlesung besteht -,
         entfaellt der Vorlesungsteil, sonst stuende er doppelt da. -->
    <#assign siteTitle = (content.siteTitle)!universityName />
    <#assign titleTail = [] />
    <#if isLecture && curTitle?has_content && !siteTitle?starts_with(curTitle)>
        <#assign titleTail = titleTail + [curTitle] />
    </#if>
    <#if siteTitle?has_content><#assign titleTail = titleTail + [siteTitle] /></#if>
    <title><#if (content.title)??>${content.title}<#if (titleTail?size > 0)> – </#if></#if>${titleTail?join(" · ")}</title>
    <link rel="icon" type="image/x-icon" href="${content.rootpath}images/favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="${content.rootpath}images/favicon.png">
    <#-- Rubik wird LOKAL ausgeliefert (assets/fonts, Regeln in css/fonts.css).
         Ein <link> auf fonts.googleapis.com wuerde bei jedem Seitenaufruf die
         IP-Adresse der Besucher an Google uebertragen - in Deutschland ein
         bekanntes Abmahnrisiko. So kommt die Site ohne Drittanbieter aus. -->
    <link rel="stylesheet" href="${content.rootpath}css/fonts.css?v=${.now?long?c}">
    <link rel="stylesheet" href="${content.rootpath}css/highlight.css?v=${.now?long?c}">
    <link rel="stylesheet" href="${content.rootpath}css/leaflet.css?v=${.now?long?c}">
    <link rel="stylesheet" href="${content.rootpath}css/style.css?v=${.now?long?c}">
    <#-- Stilschicht der einzelnen Site (content/style.css). Steht bewusst als
         letztes, damit sie das Basis-Stylesheet ueberschreiben kann. -->
    <link rel="stylesheet" href="${content.rootpath}css/site.css?v=${.now?long?c}">
    <script>
    /* Zustand VOR dem Rendern setzen (kein Umschalt-Flackern). Regel fuer alle
       Zustaende gleich: URL-Parameter schlaegt gespeicherte Wahl schlaegt Vorgabe.
       Speicher- und URL-Zugriffe sind EINZELN abgesichert - faellt der Speicher
       aus (privates Fenster, blockierte Site-Daten, file://), darf das nicht den
       Rest des Skripts mitreissen; sonst kippt die Seite z. B. trotz ?theme=dark
       zurueck auf hell. */
    (function(){var d=document.documentElement;
    function P(n){try{return new URLSearchParams(location.search).get(n);}catch(e){return null;}}
    function S(k){try{return localStorage.getItem(k);}catch(e){return null;}}
    function W(k,v){try{localStorage.setItem(k,v);}catch(e){}}

    // Seitenleiste ein-/ausgeklappt: 'sb' (c/e) > gespeicherter Zustand.
    var sb=P('sb');
    if(sb!=='c'&&sb!=='e')sb=(S('navCollapsed')==='1')?'c':'e';
    if(sb==='c')d.classList.add('nav-collapsed');
<#if showHeaderToggle>
    // Kopfbereich ein-/ausgeklappt: 'hd' (c/e) > gespeicherter Zustand.
    // Ohne Umschalter (showHeaderToggle=false) entfaellt das: die Kopfzeile bleibt
    // immer ausgeklappt, sonst waere sie nicht mehr aufzuklappen.
    var hd=P('hd');
    if(hd!=='c'&&hd!=='e')hd=(S('headerCollapsed')==='1')?'c':'e';
    if(hd==='c')d.classList.add('header-collapsed');
</#if>
    // Nachtmodus: 'theme' > gespeicherte Wahl > Systemeinstellung. Die
    // Systemeinstellung wird NICHT gespeichert, damit sie weiter wirkt, solange
    // nicht ausdruecklich umgeschaltet wurde. data-theme-chosen merkt sich, ob
    // die Anzeige ausdruecklich gewaehlt wurde - nur dann wandert 'theme' als
    // Parameter an die Links weiter (siehe i18n.js).
    var tq=P('theme'),T=null,chosen=false;
    if(tq==='dark'||tq==='light'){T=tq;chosen=true;W('theme',T);}
    else{T=S('theme');
      if(T==='dark'||T==='light')chosen=true;
      else{var mq=false;try{mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}catch(e){}
        T=mq?'dark':'light';}}
    d.setAttribute('data-theme',T);
    if(chosen)d.setAttribute('data-theme-chosen','1');

    var isLecture=<#if isLecture>true<#else>false</#if>;
    var documentOnly=<#if documentOnly>true<#else>false</#if>;
    // Ansicht (Dokument/Slides): 'view' > gespeicherte Wahl.
    // documentOnly-Vorlesungen kennen keinen Slide-Modus -> immer Dokumentansicht.
    if(isLecture && !documentOnly){
      // Merker fuer i18n.js: diese Seite kennt beide Ansichten und fuehrt den
      // Parameter 'view' mit - auch dann, wenn der Umschalter ausgeblendet ist.
      d.classList.add('has-views');
      var vq=P('view');
      if(vq==='slides'||vq==='doc')W('viewMode',vq);
      if(vq==='slides'||(vq!=='doc'&&S('viewMode')==='slides'))d.classList.add('mode-slides');
    }
    var curLecture='${curLecture?js_string}';
    if(isLecture && curLecture)W('currentLecture',curLecture);

    // Oberflaechensprache: 'lang' > gespeicherte Wahl > Inhaltssprache der Seite.
    // Setzt data-lang (aktiver Button rein per CSS) und haelt die Wahl fest.
    var lp=P('lang');
    var L=(lp==='de'||lp==='en')?lp:(S('lang')||d.getAttribute('lang')||'de');
    d.setAttribute('data-lang',L);d.setAttribute('lang',L);W('lang',L);
    })();
    </script>
</head>
<body>

<header class="site-header<#if isLecture> with-sidebar</#if>">
    <div class="header-inner">
        <#-- Kopfbereich ein-/ausklappen - Gegenstueck zum Seitenleisten-Umschalter.
             Steht links neben dem Logo und bleibt als einziges Element der
             Kopfzeile stehen, wenn diese eingeklappt ist.
             Per showHeaderToggle=false abschaltbar. -->
        <#if showHeaderToggle>
        <div class="header-toggle-bar" title="Kopfbereich ein- oder ausklappen" data-i18n-title="header.toggle">
            <button type="button" class="header-toggle" aria-label="Kopfbereich ein- oder ausklappen" aria-expanded="true" data-i18n-aria="header.toggle">
                <span class="header-toggle-arrow" aria-hidden="true"><svg class="header-toggle-icon header-toggle-collapse" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg><svg class="header-toggle-icon header-toggle-expand" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg></span>
            </button>
        </div>
        </#if>
        <div class="logo">
            <@linked url=universityUrl urlEn=universityUrlEn class="logo-link"><img class="logo-img" src="${content.rootpath}images/${universityLogo}" alt="${universityName?html}"<#if universityLogoEn != universityLogo> data-src-en="${content.rootpath}images/${universityLogoEn}"</#if>></@linked>
            <@linked url=facultyUrl urlEn=facultyUrlEn class="logo-sub"><span data-i18n-en-html="${facultyLogoEn}">${facultyLogoDe}</span></@linked>
        </div>
        <nav class="main-nav" aria-label="Hauptnavigation">
            <ul>
                <li>
                    <a href="${content.rootpath}index.html"
                       <#if (content.uri!"") == "index.html">class="active"</#if>><img class="main-nav-icon" src="${content.rootpath}images/aperture.svg" alt=""><span data-i18n="nav.start">Start</span></a>
                </li>
            </ul>
        </nav>
        <div class="print-search-group">
            <form class="header-search" id="header-search-form" action="${content.rootpath}search.html" method="get">
                <#if isLecture><input type="hidden" name="lecture" value="${curLecture}"></#if>
                <input type="text" id="header-search-input" name="q" placeholder="Suchen..." aria-label="Suche" data-i18n-placeholder="search.ph" data-i18n-aria="search.aria">
                <button type="submit" aria-label="Suchen" data-i18n-aria="search.submit">
                    <img src="${content.rootpath}images/search.svg" alt="Suchen" class="search-icon">
                </button>
            </form>
            <#-- Umschalter Dokument/Slides; per showViewSwitch=false abschaltbar
                 (die Ansicht selbst bleibt dann bei der zuletzt gewaehlten). -->
            <#if isLecture && !documentOnly && showViewSwitch>
            <div class="view-switch" role="group" aria-label="Ansicht umschalten" data-i18n-aria="view.group">
                <button type="button" class="view-switch-btn" data-view="doc" aria-pressed="true" aria-label="Dokumentansicht" title="Dokument" data-i18n-aria="view.doc.aria" data-i18n-title="view.doc.title">
                    <img class="view-switch-icon" src="${content.rootpath}images/book-open.svg" alt=""><span class="view-switch-label">Dokument</span>
                </button>
                <button type="button" class="view-switch-btn" data-view="slides" aria-pressed="false" aria-label="Foliensatz (Slides)" title="Slides" data-i18n-aria="view.slides.aria" data-i18n-title="view.slides.title">
                    <img class="view-switch-icon" src="${content.rootpath}images/square.svg" alt=""><span class="view-switch-label">Slides</span>
                </button>
            </div>
            </#if>
            <#assign curLangsAvail = isLecture?then(lectureLangs(curLecture), []) />
            <div class="lang-switch" role="group" aria-label="Sprache wählen" data-i18n-aria="lang.group">
                <#list uiLangs as lg>
                    <#assign lgTarget = isLecture?then(langTarget(lg), (content.uri)!"") />
                    <#assign lgNav = isLecture && curLangsAvail?seq_contains(lg) && lgTarget != ((content.uri)!"") />
                    <button type="button" class="lang-switch-btn" data-lang="${lg}" data-href="${content.rootpath}${lgTarget}" data-nav="${lgNav?c}">${lg?upper_case}</button>
                </#list>
            </div>
            <a class="nav-print" href="#"
               onclick="window.print(); return false;"
               aria-label="Seite drucken" title="Drucken" data-i18n-aria="print.aria" data-i18n-title="print.title">
                <img src="${content.rootpath}images/printer.svg" alt="" class="nav-icon"><span class="nav-label">Drucken</span>
            </a>
            <#-- Vollbild (Fullscreen-API): blendet die Browser-Oberflaeche aus
                 (Tabs, Adresszeile). Steht links neben dem Nachtmodus, damit
                 dieser ganz rechts bleibt. Per showFullscreen=false abschaltbar. -->
            <#if showFullscreen>
            <button type="button" class="fullscreen-toggle" aria-label="Vollbild umschalten" title="Vollbild" aria-pressed="false" data-i18n-aria="fullscreen.toggle" data-i18n-title="fullscreen.toggle">
                <span class="fullscreen-toggle-icons" aria-hidden="true"><svg class="fullscreen-toggle-icon fullscreen-toggle-enter" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg><svg class="fullscreen-toggle-icon fullscreen-toggle-exit" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg></span>
            </button>
            </#if>
            <#-- Nachtmodus ganz rechts. Mond = "auf dunkel umschalten",
                 Sonne = "zurueck auf hell" (Feather-Icons, wie die uebrigen). -->
            <button type="button" class="theme-toggle" aria-label="Nachtmodus umschalten" title="Nachtmodus" aria-pressed="false" data-i18n-aria="theme.toggle" data-i18n-title="theme.toggle">
                <span class="theme-toggle-icons" aria-hidden="true"><svg class="theme-toggle-icon theme-toggle-moon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><svg class="theme-toggle-icon theme-toggle-sun" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></span>
            </button>
        </div>
    </div>
</header>

<div class="page-wrapper">
    <#if isLecture>
    <div class="sidebar-col">
    <aside class="sidebar-nav" aria-label="Navigation">
        <div class="nav-header" title="Navigation ein- oder ausklappen" data-i18n-title="sidebar.toggle">
            <button type="button" class="nav-toggle" aria-label="Navigation ein- oder ausklappen" aria-expanded="true" data-i18n-aria="sidebar.toggle">
                <span class="nav-toggle-arrow" aria-hidden="true"><svg class="nav-toggle-icon nav-toggle-collapse" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg><svg class="nav-toggle-icon nav-toggle-expand" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg></span>
            </button>
            <div class="product-label">
                <#if curIcon?has_content><img class="product-icon" src="images/${curIcon}" alt=""></#if>
                <span class="product-label-text" data-i18n="sidebar.lecture">Unterlagen</span>
                <span class="product-label-vert" data-i18n="sidebar.lecture">Unterlagen</span>
            </div>
        </div>
        <div class="nav-scroll">
            <nav aria-label="Vorlesungsthemen" data-i18n-aria="sidebar.topics">
                <ul><@lectureNav/></ul>
            </nav>
        </div>
    </aside>
    </div>
    </#if>

    <main class="main-content">
        <div class="print-header">
            <span class="print-logo-text"><#if isLecture>${curTitle} – </#if>Fakultät Informatik, HS Heilbronn</span>
        </div>
