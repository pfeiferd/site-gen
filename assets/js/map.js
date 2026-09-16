'use strict';

/*
 * Karten (```map im Markdown, Aufbau siehe page.ftl).
 *
 * Jede Karte ist ein <div class="map"> mit den Einstellungen in data-Attributen.
 * Die Eintraege kommen entweder
 *   - aus einem <script type="application/json"> im Container selbst
 *     (im Markdown notierte Punkte) oder
 *   - aus window.MAPDATA["<name>"], das der Build aus content/data/<name>.json
 *     erzeugt (siehe DataBundle). Beides steht IM Dokument - damit funktionieren
 *     Karten auch beim Oeffnen per file://, wo ein fetch() blockiert waere.
 *
 * Erwartetes Format eines Eintrags (alle Felder ausser lat/lon/title optional):
 *   { "lat": 49.14, "lon": 9.21, "title": "…", "subtitle": "…",
 *     "lines": ["Strasse", "PLZ Ort"], "href": "https://…", "hrefText": "…" }
 */
(function () {
    var containers = [].slice.call(document.querySelectorAll('.map'));
    if (!containers.length || typeof L === 'undefined') return;

    /* Die Standard-Markierung von Leaflet laedt ihre Bilder relativ zum
       Stylesheet; der Pfad steht am Container, weil nur das Template weiss,
       wie tief die Seite liegt. */
    var iconPath = containers[0].getAttribute('data-icons');
    if (iconPath) L.Icon.Default.imagePath = iconPath;

    function num(value, fallback) {
        var n = parseFloat(value);
        return isNaN(n) ? fallback : n;
    }

    function entriesOf(el) {
        var inline = el.querySelector('script.map-data');
        var list = [];
        if (inline) {
            try { list = JSON.parse(inline.textContent) || []; } catch (e) { list = []; }
        }
        var name = el.getAttribute('data-set');
        if (name && window.MAPDATA && window.MAPDATA[name]) {
            list = list.concat(window.MAPDATA[name]);
        }
        return list.filter(function (e) {
            return e && isFinite(e.lat) && isFinite(e.lon);
        });
    }

    /* Popup-Inhalt aus den Feldern eines Eintrags. Texte werden als Text
       eingesetzt (nicht als HTML), damit Inhalte aus einer Datendatei keine
       Markup-Ueberraschungen ins Dokument tragen. */
    function popup(entry) {
        var box = document.createElement('div');
        box.className = 'map-popup';
        function line(text, cls) {
            if (!text) return;
            var p = document.createElement(cls === 'map-popup-title' ? 'strong' : 'span');
            p.className = cls;
            p.textContent = text;
            box.appendChild(p);
            box.appendChild(document.createElement('br'));
        }
        line(entry.title, 'map-popup-title');
        line(entry.subtitle, 'map-popup-subtitle');
        (entry.lines || []).forEach(function (t) { line(t, 'map-popup-line'); });
        if (entry.href) {
            var a = document.createElement('a');
            a.href = entry.href;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = entry.hrefText || entry.href.replace(/^https?:\/\//, '');
            box.appendChild(a);
        }
        return box;
    }

    /* Text eines Eintrags fuer die Suche: Titel, Untertitel und alle Zeilen. */
    function haystack(entry) {
        return [entry.title, entry.subtitle].concat(entry.lines || [])
            .filter(Boolean).join(' ').toLowerCase();
    }

    /* Beschriftungen der Filterleiste: deutsch steht im Template, englisch in
       den Sprachdateien der Site (site_en.properties). */
    function label(key, fallback) {
        var table = (document.documentElement.getAttribute('data-lang') === 'en'
            && window.I18N && window.I18N.en) || {};
        return table[key] || fallback;
    }

    containers.forEach(function (el) {
        var entries = entriesOf(el);
        var tiles = el.getAttribute('data-tiles')
            || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        var attribution = el.getAttribute('data-attribution')
            || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

        var map = L.map(el, {
            /* Beim Scrollen durch die Seite soll das Rad die SEITE bewegen und
               nicht versehentlich in die Karte zoomen; mit Strg/Cmd geht es. */
            scrollWheelZoom: false,
            attributionControl: true
        });
        L.tileLayer(tiles, { attribution: attribution, maxZoom: 19 }).addTo(map);

        var markers = entries.map(function (entry) {
            return L.marker([entry.lat, entry.lon]).bindPopup(popup(entry));
        });
        var gruppe = L.featureGroup(markers);
        if (markers.length) gruppe.addTo(map);

        var centerAttr = (el.getAttribute('data-center') || '').split(',');
        var zoom = num(el.getAttribute('data-zoom'), null);
        var fest = centerAttr.length === 2;

        /* Ausschnitt an die gerade sichtbaren Punkte anpassen. Mit fest
           vorgegebenem Mittelpunkt bleibt der Ausschnitt, wie er ist. */
        function zeige(sichtbar) {
            if (fest) {
                map.setView([num(centerAttr[0], 51), num(centerAttr[1], 10)], zoom === null ? 6 : zoom);
                return;
            }
            if (!sichtbar.length) {
                map.setView([51, 10], zoom === null ? 5 : zoom);
                return;
            }
            map.fitBounds(L.featureGroup(sichtbar).getBounds().pad(0.15));
            if (sichtbar.length === 1) map.setZoom(zoom === null ? 13 : zoom);
        }
        zeige(markers);

        /* ---- Filterleiste (optional) ------------------------------------ */
        var wrap = el.closest ? el.closest('.map-wrap') : null;
        var leiste = wrap && wrap.querySelector('.map-filter');
        if (leiste) {
            var auswahl = leiste.querySelector('.map-filter-select');
            var suche   = leiste.querySelector('.map-filter-text');
            var reset   = leiste.querySelector('.map-filter-reset');
            var zaehler = leiste.querySelector('.map-filter-count');
            var liste   = wrap.querySelector('.map-list');
            var feld    = auswahl && auswahl.getAttribute('data-field');

            /* Die Auswahlliste fuellt sich aus den Daten - so muss dieselbe
               Aufzaehlung nicht zusaetzlich im Markdown stehen. Gefiltert wird
               immer ueber das angegebene Feld; angezeigt wird im englischen
               Modus "<feld>_en", falls die Daten es mitbringen. Weil der WERT
               einer Option das Feld selbst bleibt, uebersteht die Auswahl einen
               Sprachwechsel unveraendert - nur die Beschriftung wird neu
               geschrieben. */
            function anzeigeVon(entry) {
                var en = document.documentElement.getAttribute('data-lang') === 'en';
                return (en && feld && entry[feld + '_en']) || entry[feld];
            }

            var werte = [];      // [{ basis: "Deutschland", anzeige: "Germany" }]
            if (auswahl && feld) {
                entries.forEach(function (e) {
                    var v = e[feld];
                    if (!v) return;
                    for (var i = 0; i < werte.length; i++) if (werte[i].basis === v) return;
                    werte.push({ basis: v, anzeige: anzeigeVon(e) });
                });
                werte.sort(function (a, b) { return a.basis.localeCompare(b.basis); });
                auswahl.appendChild(new Option(label('map.all', 'Alle'), ''));
                werte.forEach(function (w) { auswahl.appendChild(new Option(w.anzeige, w.basis)); });
            }

            /* Beschriftungen nachziehen, wenn die Oberflaechensprache wechselt
               (i18n.js meldet das). Auswahl und Filter bleiben, wie sie sind. */
            document.addEventListener('lang-change', function () {
                if (!auswahl || !feld) return;
                auswahl.options[0].text = label('map.all', 'Alle');
                werte.forEach(function (w, i) {
                    var treffer = null;
                    entries.forEach(function (e) { if (!treffer && e[feld] === w.basis) treffer = e; });
                    if (treffer) auswahl.options[i + 1].text = anzeigeVon(treffer);
                });
            });

            function passt(entry) {
                if (auswahl && feld && auswahl.value && entry[feld] !== auswahl.value) return false;
                var q = suche ? suche.value.trim().toLowerCase() : '';
                return !q || haystack(entry).indexOf(q) !== -1;
            }

            function anwenden() {
                var sichtbar = [];
                entries.forEach(function (entry, i) {
                    if (passt(entry)) { gruppe.addLayer(markers[i]); sichtbar.push(markers[i]); }
                    else gruppe.removeLayer(markers[i]);
                });
                if (zaehler) zaehler.textContent = sichtbar.length + ' / ' + entries.length;
                if (liste) {
                    liste.innerHTML = '';
                    entries.forEach(function (entry, i) {
                        if (!passt(entry)) return;
                        var li = document.createElement('li');
                        var a = document.createElement('a');
                        a.href = '#';
                        a.textContent = entry.title || (entry.lat + ', ' + entry.lon);
                        a.addEventListener('click', function (ev) {
                            ev.preventDefault();
                            map.setView([entry.lat, entry.lon], 14);
                            markers[i].openPopup();
                        });
                        li.appendChild(a);
                        var rest = (entry.lines || [])[1] || entry.subtitle;
                        if (rest) {
                            var span = document.createElement('span');
                            span.textContent = ' – ' + rest;
                            li.appendChild(span);
                        }
                        liste.appendChild(li);
                    });
                }
                zeige(sichtbar);
            }

            if (auswahl) auswahl.addEventListener('change', anwenden);
            if (suche) suche.addEventListener('input', anwenden);
            if (reset) reset.addEventListener('click', function () {
                if (auswahl) auswahl.value = '';
                if (suche) suche.value = '';
                anwenden();
            });
            anwenden();
        }

        /* Rad-Zoom nur mit gedrueckter Strg-/Cmd-Taste. */
        el.addEventListener('wheel', function (ev) {
            if (ev.ctrlKey || ev.metaKey) {
                map.scrollWheelZoom.enable();
                setTimeout(function () { map.scrollWheelZoom.disable(); }, 500);
            }
        }, { passive: true });

        /* Die Karte kann in einer erst spaeter sichtbaren Folie stecken oder in
           einer Seitenleiste, die sich oeffnet - dann stimmt die Groesse nicht. */
        window.addEventListener('resize', function () { map.invalidateSize(); });
        setTimeout(function () { map.invalidateSize(); }, 200);
    });
}());
