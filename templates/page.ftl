<#include "header.ftl">
<#-- Text fuer eine JSON-Zeichenkette absichern. Der Inhalt kommt aus einem
     Codeblock, ist also bereits HTML-escaped; hier fehlen nur die Zeichen, die
     JSON selbst verbieten. -->
<#function jsonText s>
    <#return s?replace("\\", "\\\\")?replace('"', '\\"')>
</#function>

        <article class="page-article">
            <#assign body = content.body>
            <#-- Karte: ein ```map-Block wird zu einem Kartenfeld (Leaflet).
                 Kopfzeilen im Block stellen die Karte ein (height, center, zoom,
                 data, tiles, attribution), jede weitere Zeile ist ein Punkt:
                   lat, lon | Titel | Zeile; Zeile; ...  [| https://link]
                 "data: name" holt zusaetzlich die Eintraege aus
                 content/data/<name>.json, die der Build als data/<name>.js
                 bereitstellt - im Dokument, damit es auch per file:// laeuft. -->
            <#assign hasMap = false />
            <#list body?matches('<pre><code class="language-map">(.*?)</code></pre>', "s") as mm>
                <#assign hasMap = true />
                <#assign mHeight = "380"><#assign mCenter = ""><#assign mZoom = "">
                <#-- Kachelserver: Vorgabe der Site (mapTiles/mapAttribution in
                     meta.properties), im Block mit "tiles:"/"attribution:"
                     ueberschreibbar. Ohne beides nimmt map.js OpenStreetMap. -->
                <#assign mSet = "">
                <#assign mTiles = (content.mapTiles)!"">
                <#assign mAttr = (content.mapAttribution)!"">
                <#assign mFilter = ""><#assign mSearch = ""><#assign mList = "">
                <#assign points = []>
                <#list mm?groups[1]?split("\n") as rawLine>
                    <#assign line = rawLine?trim>
                    <#if line?has_content>
                        <#assign low = line?lower_case>
                        <#if low?starts_with("height:")><#assign mHeight = line?substring(7)?trim>
                        <#elseif low?starts_with("center:")><#assign mCenter = line?substring(7)?trim>
                        <#elseif low?starts_with("zoom:")><#assign mZoom = line?substring(5)?trim>
                        <#elseif low?starts_with("data:")><#assign mSet = line?substring(5)?trim>
                        <#elseif low?starts_with("tiles:")><#assign mTiles = line?substring(6)?trim>
                        <#elseif low?starts_with("attribution:")><#assign mAttr = line?substring(12)?trim>
                        <#elseif low?starts_with("filter:")><#assign mFilter = line?substring(7)?trim>
                        <#elseif low?starts_with("search:")><#assign mSearch = line?substring(7)?trim>
                        <#elseif low?starts_with("list:")><#assign mList = line?substring(5)?trim?lower_case>
                        <#else>
                            <#assign cols = line?split("|")>
                            <#assign coord = cols[0]?split(",")>
                            <#if (coord?size >= 2) && coord[0]?trim?matches("-?[0-9.]+")>
                                <#assign fields = ['"lat": ' + coord[0]?trim + ', "lon": ' + coord[1]?trim] />
                                <#if (cols?size > 1) && cols[1]?trim?has_content>
                                    <#assign fields = fields + ['"title": "' + jsonText(cols[1]?trim) + '"'] />
                                </#if>
                                <#if (cols?size > 2) && cols[2]?trim?has_content>
                                    <#assign parts = [] />
                                    <#list cols[2]?split(";") as t>
                                        <#if t?trim?has_content><#assign parts = parts + ['"' + jsonText(t?trim) + '"'] /></#if>
                                    </#list>
                                    <#assign fields = fields + ['"lines": [' + parts?join(", ") + ']'] />
                                </#if>
                                <#if (cols?size > 3) && cols[3]?trim?has_content>
                                    <#assign fields = fields + ['"href": "' + jsonText(cols[3]?trim) + '"'] />
                                </#if>
                                <#assign points = points + ["{" + fields?join(", ") + "}"] />
                            </#if>
                        </#if>
                    </#if>
                </#list>
                <#assign attrs = ' data-icons="' + content.rootpath + 'css/images/"'
                    + (mCenter?has_content)?then(' data-center="' + mCenter + '"', "")
                    + (mZoom?has_content)?then(' data-zoom="' + mZoom + '"', "")
                    + (mSet?has_content)?then(' data-set="' + mSet + '"', "")
                    + (mTiles?has_content)?then(' data-tiles="' + mTiles?html + '"', "")
                    + (mAttr?has_content)?then(' data-attribution="' + mAttr?html + '"', "") />
                <#-- Filterleiste: "filter: feld | Beschriftung" baut eine Auswahlliste
                     ueber ein Feld der Eintraege (die Werte holt map.js aus den
                     Daten), "search: Platzhalter" ein Textfeld ueber den ganzen
                     Eintragstext, "list: true" eine Trefferliste unter der Karte. -->
                <#-- "filter: feld | Beschriftung | English label" und
                     "search: Platzhalter | English placeholder": der zweite
                     Strich traegt die englische Fassung. Fehlt sie, gilt die
                     deutsche in beiden Sprachen. -->
                <#assign fParts = mFilter?split("|") />
                <#assign mFilterField = mFilter?has_content?then(fParts[0]?trim, "") />
                <#assign mFilterLabel = (fParts?size > 1)?then(fParts[1]?trim, mFilterField) />
                <#assign mFilterLabelEn = (fParts?size > 2)?then(fParts[2]?trim, mFilterLabel) />
                <#assign sParts = mSearch?split("|") />
                <#assign mSearchPh = mSearch?has_content?then(sParts[0]?trim, "") />
                <#assign mSearchPhEn = (sParts?size > 1)?then(sParts[1]?trim, mSearchPh) />
                <#assign bar = "" />
                <#if mFilterField?has_content || mSearch?has_content>
                    <#assign bar = '<div class="map-filter">'
                        + mFilterField?has_content?then(
                            '<label class="map-filter-field"><span data-i18n-en="' + mFilterLabelEn?html + '">'
                          + mFilterLabel?html + '</span>'
                          + '<select class="map-filter-select" data-field="' + mFilterField?html + '"></select></label>', "")
                        + mSearchPh?has_content?then(
                            '<label class="map-filter-field"><input type="search" class="map-filter-text"'
                          + ' placeholder="' + mSearchPh?html + '" aria-label="' + mSearchPh?html + '"'
                          + ' data-i18n-en-placeholder="' + mSearchPhEn?html + '"'
                          + ' data-i18n-en-aria="' + mSearchPhEn?html + '"></label>', "")
                        + '<button type="button" class="map-filter-reset" data-i18n="map.reset">Zurücksetzen</button>'
                        + '<span class="map-filter-count" aria-live="polite"></span>'
                        + '</div>' />
                </#if>
                <#assign markup = '<div class="map-wrap">' + bar
                    + '<div class="map"' + attrs + ' style="height:' + mHeight + 'px">'
                    + (points?size > 0)?then('<script type="application/json" class="map-data">[' + points?join(",") + ']</script>', "")
                    + '</div>'
                    + (mList == "true")?then(
                        '<p class="map-list-title"><strong data-i18n="map.results">Ergebnisse:</strong></p>'
                      + '<ul class="map-list"></ul>', "")
                    + '</div>'
                    + (mSet?has_content)?then('<script src="' + content.rootpath + 'data/' + mSet + '.js"></script>', "") />
                <#assign body = body?replace(mm?groups[0], markup)>
            </#list>
            <#-- Bildergalerie: ein ```gallery-Block wird zu einem Raster aus
                 Miniaturen mit Bildunterschrift. Je Zeile ein Bild, dahinter
                 optional "| Beschriftung". Eine Zeile "width: <Zahl>" setzt die
                 Breite der Miniaturen, "ratio: <b/h>" ihr Seitenverhaeltnis
                 (Vorgaben: --gallery-width/--gallery-ratio in style.css).
                 Ein Klick auf eine Miniatur oeffnet wie bei jedem Inhaltsbild die
                 Lightbox - eine gesonderte Datei fuer die Grossansicht braucht es
                 also nicht. Laeuft VOR der Pfad-Ergaenzung unten, damit die
                 Bildnamen dieselbe images/-Regel durchlaufen wie alle anderen. -->
            <#list body?matches('<pre><code class="language-gallery">(.*?)</code></pre>', "s") as gm>
                <#assign galWidth = "">
                <#assign galRatio = "">
                <#assign figures = "">
                <#list gm?groups[1]?split("\n") as rawLine>
                    <#assign line = rawLine?trim>
                    <#if line?has_content>
                        <#if line?lower_case?starts_with("width:")>
                            <#assign galWidth = line?substring(6)?trim>
                        <#elseif line?lower_case?starts_with("ratio:")>
                            <#-- "16:9" und "16/9" sind beide erlaubt; CSS kennt nur "/". -->
                            <#assign galRatio = line?substring(6)?trim?replace(":", "/")>
                        <#else>
                            <#assign gSrc = line?contains("|")?then(line?keep_before("|")?trim, line)>
                            <#assign gCap = line?contains("|")?then(line?keep_after("|")?trim, "")>
                            <#-- Mehrzeilige Bildunterschrift: ";" trennt die Zeilen - dieselbe
                                 Schreibweise wie im ```map-Block. Gedacht fuer Kacheln, die
                                 mehrere Angaben tragen (Name, Funktion, Ort ...). Der
                                 Alternativtext bleibt einzeilig, dort trennt ein Komma. -->
                            <#assign gCapHtml = gCap?replace("\\s*;\\s*", "<br>", "r")>
                            <#assign gCapAlt = gCap?replace("\\s*;\\s*", ", ", "r")>
                            <#-- "**...**" in der Unterschrift wird fett - etwa um in einer
                                 Kachel mit mehreren Angaben den Namen hervorzuheben. Der Block
                                 ist ein Codeblock, Markdown formatiert darin nicht; deshalb
                                 wertet das Template die Auszeichnung hier selbst aus. Aus dem
                                 Alternativtext fallen die Sternchen ersatzlos weg. -->
                            <#list gCap?matches("\\*\\*(.+?)\\*\\*") as bm>
                                <#assign gCapHtml = gCapHtml?replace(bm?groups[0],
                                        "<strong>" + bm?groups[1] + "</strong>")>
                                <#assign gCapAlt = gCapAlt?replace(bm?groups[0], bm?groups[1])>
                            </#list>
                            <#if gSrc?has_content>
                                <#assign figures = figures
                                    + '<figure><img class="gallery-img" loading="lazy" src="' + gSrc
                                    + '" alt="' + gCapAlt?replace('"', '&quot;') + '">'
                                    + gCap?has_content?then("<figcaption>" + gCapHtml + "</figcaption>", "")
                                    + '</figure>'>
                            <#elseif gCap?has_content>
                                <#-- Textkachel: die Zeile beginnt mit "|", nennt also kein
                                     Bild. Fuer Eintraege, zu denen (noch) kein Foto vorliegt -
                                     ein unbesetzter Posten, ein Preistraeger ohne Aufnahme.
                                     Statt des Bildes steht eine leere Flaeche im Format der
                                     uebrigen Kacheln, damit das Raster und die Unterschriften
                                     auf einer Linie bleiben. -->
                                <#assign figures = figures
                                    + '<figure class="gallery-text">'
                                    + '<div class="gallery-noimg" aria-hidden="true"></div>'
                                    + '<figcaption>' + gCapHtml + '</figcaption></figure>'>
                            </#if>
                        </#if>
                    </#if>
                </#list>
                <#-- Nur wohlgeformte Angaben durchlassen; alles andere wird still
                     ignoriert, damit ein Tippfehler kein kaputtes CSS erzeugt. -->
                <#assign galVars = "">
                <#if galWidth?matches("[0-9]+")>
                    <#assign galVars = galVars + "--gallery-width:" + galWidth + "px;">
                </#if>
                <#if galRatio?matches("[0-9]+(\\.[0-9]+)?(/[0-9]+(\\.[0-9]+)?)?")>
                    <#assign galVars = galVars + "--gallery-ratio:" + galRatio + ";">
                </#if>
                <#assign galStyle = galVars?has_content?then(' style="' + galVars + '"', "")>
                <#assign body = body?replace(gm?groups[0],
                    '<div class="gallery"' + galStyle + '>' + figures + '</div>')>
            </#list>
            <#-- Bildpfade vereinfachen: im .md genuegt der blosse Dateiname (ggf. mit
                 Unterordner). Fehlt der Praefix "images/", wird er ergaenzt – dorthin
                 materialisiert ImageCascade die Bilder relativ zur Seite. Vollstaendige
                 Pfade, URLs, absolute und data:-URIs bleiben unveraendert. -->
            <#list body?matches('<img[^>]*\\ssrc="([^"]*)"[^>]*>') as im>
                <#assign isrc = im?groups[1]>
                <#if isrc?has_content && !isrc?starts_with("images/") && !isrc?starts_with("http")
                     && !isrc?starts_with("/") && !isrc?starts_with("../") && !isrc?starts_with("data:")>
                    <#assign body = body?replace(im?groups[0], im?groups[0]?replace('src="' + isrc + '"', 'src="images/' + isrc + '"')) />
                </#if>
            </#list>
            <#-- Ausrichtung je Bild: der Bildtitel darf mit "|left", "|center" oder
                 "|right" enden - ![Alt](bild.png "Titel|left"). Markdown kennt keine
                 Attribute, der Titel ist die einzige Stelle, an der ohne rohes HTML
                 etwas mitgegeben werden kann. Die Angabe wird hier aus dem Titel
                 entfernt (sonst stuende sie im Tooltip) und als Klasse ans Bild
                 geschrieben; bleibt vom Titel nichts uebrig ("|left" allein), faellt
                 das title-Attribut ganz weg. Ausgewertet wird die Klasse im naechsten
                 Schritt - sie wirkt also nur bei einem allein stehenden Bild. -->
            <#list body?matches('<img[^>]*\\stitle="([^"]*)\\|(left|center|right)"[^>]*>') as am>
                <#assign aText = am?groups[1]>
                <#assign aPos = am?groups[2]>
                <#assign aTag = am?groups[0]?replace(
                        ' title="' + aText + '|' + aPos + '"',
                        aText?has_content?then(' title="' + aText + '"', ''))>
                <#assign aTag = aTag?contains(' class="')
                        ?then(aTag?replace(' class="', ' class="img-align-' + aPos + ' '),
                              aTag?replace('<img', '<img class="img-align-' + aPos + '"'))>
                <#assign body = body?replace(am?groups[0], aTag)>
            </#list>
            <#-- Bilder, die allein in einem Absatz stehen, sind Inhaltsbilder und
                 gehoeren mittig - Markdown kennt dafuer keine Schreibweise, also
                 entscheidet der Aufbau: ein Absatz, dessen einziger Inhalt ein Bild
                 ist (ggf. in Link/Fett/Kursiv gehuellt), bekommt die Klasse
                 "img-only", die das Stylesheet zentriert.
                 Traegt das Bild eine Ausrichtung aus dem Titel (siehe oben), kommt
                 sie als "align-..." dazu und schlaegt die Zentrierung.
                 Ausgerichtet wird immer der ABSATZ, nicht das Bild: so wirkt es auch
                 auf ein verlinktes Bild (<a><img></a>).
                 NICHT betroffen sind Bilder MIT Text im selben Absatz oder in einer
                 Listenzeile (z. B. Flaggen-Icons vor einem Link) - die bleiben im
                 Textfluss, wo Zentrieren das Layout zerreissen wuerde. -->
            <#list body?matches('<p>\\s*((?:<a\\b[^>]*>|<strong>|<em>)*)\\s*(<img\\b[^>]*>)\\s*((?:</a>|</strong>|</em>)*)\\s*</p>', "s") as sp>
                <#assign pCls = "img-only">
                <#list ["left", "center", "right"] as pos>
                    <#if sp?groups[2]?contains('img-align-' + pos)>
                        <#assign pCls = pCls + " align-" + pos>
                    </#if>
                </#list>
                <#assign body = body?replace(sp?groups[0], '<p class="' + pCls + '">' + sp?groups[0]?substring(3))>
            </#list>
            <#-- Downloads: "[Flyer](files/flyer.pdf)" meint content/files/flyer.pdf.
                 Der Ordner liegt in der Site-Wurzel, die Seite aber in <lang>/ -
                 deshalb den Weg zurueck zur Wurzel voranstellen. -->
            <#if content.rootpath?has_content>
                <#assign body = body?replace(' href="files/', ' href="' + content.rootpath + 'files/')>
            </#if>
            <#-- Querverweise auf andere Seiten duerfen im Markdown auf die QUELLE
                 zeigen: "[Spenden](spenden.md)" statt "spenden.html". Das ist im
                 Editor und in jeder Markdown-Vorschau ein funktionierender Link,
                 gebaut wird daraus die erzeugte Seite. Ein Anker dahinter bleibt
                 erhalten ("seite.md#abschnitt").
                 Unangetastet bleibt alles, was keine Seite dieser Site ist: absolute
                 URLs und mailto: (erkennbar am Doppelpunkt), reine Anker und die
                 Dateien unter files/ (.pdf & Co. heissen ohnehin nicht .md). -->
            <#list body?matches(' href="([^":#]*)\\.md(#[^"]*)?"') as lm>
                <#-- Der Anker ist optional; ohne ihn liefert ?groups nichts (nicht "").
                     Der Standardwert steht bewusst in einer eigenen Zuweisung: in einer
                     Verkettung zieht "!" alles Folgende in den Standardwert hinein. -->
                <#assign lFrag = (lm?groups[2])!"">
                <#assign body = body?replace(lm?groups[0],
                        ' href="' + lm?groups[1] + '.html' + lFrag + '"')>
            </#list>
            <#-- [LECTURES]-Marker durch die automatisch erzeugte Vorlesungsliste ersetzen. -->
            <#if body?contains("<p>[LECTURES]</p>")>
                <#assign cards = "<div class=\"lecture-cards\">">
                <#list lectures as lec>
                    <#assign icon = lec.icon?has_content?then("<img class=\"lecture-card-icon\" src=\"" + content.rootpath + lec.entry?keep_before_last("/") + "/images/" + lec.icon + "\" alt=\"\">", "")>
                    <#assign cards = cards + "<a class=\"lecture-card\" href=\"" + content.rootpath + lec.entry + "\" data-href-en=\"" + content.rootpath + lec.entryEn + "\">" + icon + "<span class=\"lecture-card-title\" data-i18n-de=\"" + lec.title?html + "\" data-i18n-en=\"" + lec.titleEn?html + "\">" + lec.title + "</span></a>">
                </#list>
                <#assign cards = cards + "</div>">
                <#assign body = body?replace("<p>[LECTURES]</p>", cards)>
            </#if>
            <#if body?contains("<p>[TOC]</p>")>
                <#-- Inhaltsverzeichnis automatisch aus den Ueberschriften nach dem Marker bauen. -->
                <#assign afterMarker = body?split("<p>[TOC]</p>")[1]>
                <#assign hs = []>
                <#list afterMarker?matches("<h([123])><a href=\"#[^\"]*\" id=\"([^\"]+)\"></a>(.*?)</h\\1>") as m>
                    <#assign hs = hs + [{"level": m?groups[1]?number, "id": m?groups[2], "text": m?groups[3]?replace("<[^>]+>", "", "r")}]>
                </#list>
                <#if (hs?size > 0)>
                    <#assign relMin = 99>
                    <#list hs as h><#if (h.level < relMin)><#assign relMin = h.level></#if></#list>
                    <#assign toc = "<nav class=\"page-toc\" aria-label=\"Inhaltsverzeichnis\"><p class=\"page-toc-title\">Inhalt</p>">
                    <#assign prev = 0>
                    <#list hs as h>
                        <#assign lvl = h.level - relMin + 1>
                        <#if (lvl > prev)>
                            <#list (prev + 1)..lvl as i><#assign toc = toc + "<ul>"></#list>
                        <#elseif (lvl < prev)>
                            <#assign toc = toc + "</li>">
                            <#list (lvl + 1)..prev as i><#assign toc = toc + "</ul></li>"></#list>
                        <#else>
                            <#assign toc = toc + "</li>">
                        </#if>
                        <#assign toc = toc + "<li><a href=\"#" + h.id + "\">" + h.text + "</a>">
                        <#assign prev = lvl>
                    </#list>
                    <#assign toc = toc + "</li>">
                    <#if (prev > 1)><#list 2..prev as i><#assign toc = toc + "</ul></li>"></#list></#if>
                    <#assign toc = toc + "</ul></nav>">
                    <#assign body = body?replace("<p>[TOC]</p>", toc)>
                <#else>
                    <#assign body = body?replace("<p>[TOC]</p>", "")>
                </#if>
            </#if>
            <#-- Abschnittsueberschriften automatisch durchnummerieren (nur Vorlesungsseiten).
                 Mit "headingNumbers=false" laesst sich die Gliederung abschalten - im
                 Frontmatter einer einzelnen Seite oder, fuer einen ganzen Ordner bzw.
                 die ganze Site, in der zugehoerigen meta.properties. Gedacht fuer
                 Seiten, die keine Gliederung SIND, sondern eine Liste - etwa eine
                 Nachrichtenseite, deren Abschnitte Meldungen sind. -->
            <#if (content.navgroup!"") == "docs" && (content.headingNumbers!"true") != "false">
                <#assign allH = []>
                <#list body?matches("<h([123])><a href=\"#[^\"]*\" id=\"([^\"]+)\"></a>(.*?)</h\\1>") as m>
                    <#assign allH = allH + [{"full": m?groups[0], "level": m?groups[1]?number, "id": m?groups[2], "text": m?groups[3]}]>
                </#list>
                <#if (allH?size > 1)>
                    <#assign toNum = allH[1..(allH?size - 1)]>
                    <#assign relMin = 99>
                    <#list toNum as h><#if (h.level < relMin)><#assign relMin = h.level></#if></#list>
                    <#assign c1 = 0><#assign c2 = 0><#assign c3 = 0>
                    <#list toNum as h>
                        <#assign lvl = h.level - relMin + 1>
                        <#if (lvl <= 1)>
                            <#assign c1 = c1 + 1><#assign c2 = 0><#assign c3 = 0>
                            <#assign num = c1?c>
                        <#elseif (lvl == 2)>
                            <#assign c2 = c2 + 1><#assign c3 = 0>
                            <#assign num = c1?c + "." + c2?c>
                        <#else>
                            <#assign c3 = c3 + 1>
                            <#assign num = c1?c + "." + c2?c + "." + c3?c>
                        </#if>
                        <#assign numbered = "<h" + h.level?c + "><a href=\"#" + h.id + "\" id=\"" + h.id + "\"></a><span class=\"heading-num\">" + num + "</span> " + h.text + "</h" + h.level?c + ">">
                        <#assign body = body?replace(h.full, numbered)>
                    </#list>
                </#if>
            </#if>
            <#-- PlantUML-Codebloecke durch die vorab erzeugten SVG-Diagramme ersetzen. -->
            <#-- Die Bilder werden zur Bauzeit von tools/PlantumlPreprocessor.java erzeugt -->
            <#-- und heissen <seite>-<n>.svg (n = 1-basierter Index des Blocks auf der Seite). -->
            <#assign pumlSlug = content.uri?keep_before_last(".")>
            <#assign pumlIdx = 0>
            <#list body?matches("<pre><code class=\"language-plantuml\">(.*?)</code></pre>", "s") as pm>
                <#assign pumlIdx = pumlIdx + 1>
                <#-- Cache-Buster wie bei CSS/JS (?v=Bauzeit): ohne ihn behaelt das SVG bei
                     jedem Bau denselben Dateinamen, sodass Browser ein zwischenzeitlich
                     geaendertes Diagramm weiter aus dem Cache zeigen koennten. -->
                <#assign pumlImg = "<img class=\"content-img plantuml-diagram\" src=\"" + content.rootpath + "images/plantuml/" + pumlSlug + "-" + pumlIdx?c + ".svg?v=" + .now?long?c + "\" alt=\"PlantUML-Diagramm\">">
                <#assign body = body?replace(pm?groups[0], pumlImg)>
            </#list>
            <#-- In Folien aufteilen: der Rohtext wird an den <div class="nextpage"></div>-
                 Markern getrennt und jede Folie in eine <section class="slide"> verpackt.
                 In der Dokumentansicht fliessen die Folien nahtlos untereinander,
                 im Slide-Modus wird pro Folie eine Seite dargestellt. -->
            <#assign allSlides = body?split('<div class="nextpage"></div>')>
            <#assign slides = []>
            <#list allSlides as s><#if s?trim?length gt 0><#assign slides = slides + [s]></#if></#list>
            <div class="page-article-body">
                <#list slides as s>
                <section class="slide">
                    <div class="slide-inner">${s}</div>
                    <footer class="slide-print-footer">
                        <span class="slide-footer-title"><#if isLecture>${curTitle}<#if (content.title)?has_content> &ndash; ${content.title}</#if></#if></span>
                        <span class="slide-footer-num">${s?index + 1}&thinsp;/&thinsp;${slides?size}</span>
                        <span class="slide-footer-credit">&copy; ${(content.copyrightYear)!"2026"} &middot; ${lecturerName} &middot; ${universityName}</span>
                    </footer>
                </section>
                </#list>
            </div>
        </article>

<#include "footer.ftl">
