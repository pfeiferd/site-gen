<#include "header.ftl">

        <article class="page-article">
            <div class="page-article-body">
                <h1 id="search-heading">Suche</h1>

                <form class="search-form-main" id="search-form" action="search.html" method="get">
                    <div class="search-input-row">
                        <input type="text"
                               id="search-input"
                               name="q"
                               placeholder="${ui('search.input', 'Suchbegriff eingeben...')}"
                               data-i18n-placeholder="search.input"
                               autocomplete="off"
                               autofocus>
                        <button type="submit" aria-label="${ui('search.submit', 'Suchen')}" data-i18n-aria="search.submit">
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
        <#-- Die Treffer werden direkt ausgegeben statt erst in einer Sequenz gesammelt:
             "docs = docs + [...]" kopiert bzw. verkettet die Sequenz bei jedem Abschnitt
             und macht die Suchseite bei vielen Folien quadratisch langsam. -->
        <#assign first = true>
        <#macro doc id page section body lecture lang>
            <#if !first>,</#if><#assign first = false>{"id":"${id?js_string}","page":"${page?js_string}","section":"${section?js_string}","body":"${body?js_string}","lecture":"${lecture?js_string}","lang":"${lang?js_string}"}
        </#macro>
        var SEARCH_DOCS=[
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
            <#assign heads = body?matches(HEAD_RE)>
            <#if (heads?size == 0)>
                <@doc id=pg.uri page=pg.title section="" body=pg.title + " " + clean(body) lecture=lecture lang=lng/>
            <#else>
                <#assign segs = body?replace(HEAD_RE, SENT, "r")?split(SENT)>
                <#list heads as m>
                    <#assign segtxt = clean((segs[m?index + 1])!"")>
                    <#if m?index == 0>
                        <@doc id=pg.uri page=pg.title section="" body=pg.title + " " + segtxt lecture=lecture lang=lng/>
                    <#else>
                        <#assign htitle = clean(m?groups[3])>
                        <@doc id=pg.uri + "#" + m?groups[2] page=pg.title section=htitle body=htitle + " " + segtxt lecture=lecture lang=lng/>
                    </#if>
                </#list>
            </#if>
        </#list>
        ];
        var SEARCH_LECTURE_TITLES={<#list lectures as lec>"${lec.slug?js_string}":"${lec.title?js_string}"<#sep>,</#sep></#list>};
        var SEARCH_LECTURE_TITLES_EN={<#list lectures as lec>"${lec.slug?js_string}":"${lec.titleEn?js_string}"<#sep>,</#sep></#list>};
        </script>

<#include "footer.ftl">
