<#include "header.ftl">

        <article class="page-article">
            <div class="page-article-body">
                <h1 id="search-heading">Suche</h1>

                <form class="search-form-main" id="search-form" action="search.html" method="get">
                    <div class="search-input-row">
                        <input type="text"
                               id="search-input"
                               name="q"
                               placeholder="Suchbegriff eingeben..."
                               data-i18n-placeholder="search.input"
                               autocomplete="off"
                               autofocus>
                        <button type="submit" aria-label="Suchen" data-i18n-aria="search.submit">
                            <img src="${content.rootpath}images/search.svg" alt="Suchen" class="search-icon">
                        </button>
                    </div>
                </form>

                <div id="search-results"></div>
            </div>
        </article>

        <script src="${content.rootpath}js/lunr.min.js"></script>
        <script src="${content.rootpath}js/lunr.stemmer.support.js"></script>
        <script src="${content.rootpath}js/lunr.de.js"></script>
        <script>
        <#-- Suchindex auf Abschnitts-Ebene: jeder Abschnitt (Ueberschrift) wird ein Treffer
             mit Anker, Seitentitel und Abschnittstitel. -->
        <#assign SENT = "~§SEC§~">
        <#assign HEAD_RE = "<h([1-3])><a href=\"#[^\"]*\" id=\"([^\"]+)\"></a>(.*?)</h[1-3]>">
        <#-- HTML-Tags entfernen, HTML-Entities zu Klartext dekodieren, Whitespace normalisieren.
             (&amp; zuletzt, damit z.B. &amp;quot; korrekt bleibt.) -->
        <#function clean s>
            <#return s?replace("<[^>]+>", "", "r")
                      ?replace("&nbsp;", " ")
                      ?replace("&quot;", '"')
                      ?replace("&#39;", "'")
                      ?replace("&apos;", "'")
                      ?replace("&lt;", "<")
                      ?replace("&gt;", ">")
                      ?replace("&amp;", "&")
                      ?replace("\\s+", " ", "r")?trim />
        </#function>
        <#assign docs = []>
        <#list published_pages as pg>
            <#-- Die Suchseite selbst nicht indizieren. -->
            <#if (pg.type!"") == "search"><#continue></#if>
            <#assign lecture = pg.lecture!"">
            <#assign lng = pg.lang!"de">
            <#-- Nur Vorlesungsseiten sind einer Vorlesung zugeordnet und werden gefiltert. -->
            <#if !lecture?has_content><#continue></#if>
            <#-- PlantUML-Codebloecke und den [TOC]-Marker aus dem Index heraushalten. -->
            <#assign body = (pg.body!"")
                     ?replace("<pre><code class=\"language-plantuml\">.*?</code></pre>", "", "rs")
                     ?replace("<p>[TOC]</p>", "")>
            <#assign heads = []>
            <#list body?matches(HEAD_RE) as m>
                <#assign heads = heads + [{"id": m?groups[2], "title": clean(m?groups[3])}]>
            </#list>
            <#if (heads?size == 0)>
                <#assign txt = clean(body)>
                <#assign docs = docs + [{"id": pg.uri, "page": pg.title, "section": "", "body": pg.title + " " + txt, "lecture": lecture, "lang": lng}]>
            <#else>
                <#assign segs = body?replace(HEAD_RE, SENT, "r")?split(SENT)>
                <#list heads as h>
                    <#assign segtxt = clean((segs[h?index + 1])!"")>
                    <#if h?index == 0>
                        <#assign docs = docs + [{"id": pg.uri, "page": pg.title, "section": "", "body": pg.title + " " + segtxt, "lecture": lecture, "lang": lng}]>
                    <#else>
                        <#assign docs = docs + [{"id": pg.uri + "#" + h.id, "page": pg.title, "section": h.title, "body": h.title + " " + segtxt, "lecture": lecture, "lang": lng}]>
                    </#if>
                </#list>
            </#if>
        </#list>
        var SEARCH_DOCS=[<#list docs as d>{"id":"${d.id?js_string}","page":"${d.page?js_string}","section":"${d.section?js_string}","body":"${d.body?js_string}","lecture":"${d.lecture?js_string}","lang":"${d.lang?js_string}"}<#sep>,</#sep></#list>];
        var SEARCH_LECTURE_TITLES={<#list lectures as lec>"${lec.slug?js_string}":"${lec.title?js_string}"<#sep>,</#sep></#list>};
        var SEARCH_LECTURE_TITLES_EN={<#list lectures as lec>"${lec.slug?js_string}":"${lec.titleEn?js_string}"<#sep>,</#sep></#list>};
        </script>

<#include "footer.ftl">
