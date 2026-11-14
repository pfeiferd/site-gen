title=Karten
navorder=07
~~~~~~

# Karten

[TOC]

## Eine Karte einfügen

Eine Karte schreibst Du als Codeblock mit der Sprache `map`. Die Zeilen mit
Doppelpunkt stellen die Karte ein, jede weitere Zeile ist ein Punkt:

```map
height: 340
48.7840, 9.1817 | Stuttgart Hauptbahnhof | Arnulf-Klett-Platz 2; 70173 Stuttgart
49.4106, 8.7153 | Heidelberger Schloss | Schlosshof 1; 69117 Heidelberg
```

Eine Punktzeile hat den Aufbau

```
Breite, Länge | Titel | Zeile; Zeile; … | Link
```

Titel, Zeilen und Link sind freiwillig – nötig sind nur die beiden Koordinaten.
Ohne `center` und `zoom` wählt die Karte den Ausschnitt selbst so, dass alle
Punkte zu sehen sind.

## Einstellungen

| Zeile | Bedeutung |
|-------|-----------|
| `height: 340` | Höhe der Karte in Pixeln (Vorgabe 380) |
| `center: 49.1, 9.2` | fester Mittelpunkt statt automatischem Ausschnitt |
| `zoom: 12` | Zoomstufe (0 = Welt, 19 = Hausnummer) |
| `data: name` | Punkte aus `content/data/name.json` |
| `filter: feld \| Beschriftung` | Auswahlliste über ein Feld der Einträge |
| `search: Platzhalter` | Textfeld, das über den ganzen Eintragstext sucht |
| `list: true` | Trefferliste unter der Karte |
| `tiles: …` | eigener Kartenserver statt OpenStreetMap |
| `attribution: …` | Quellenangabe zum Kartenmaterial |

## Viele Punkte: eine Datendatei

Punkte, die nicht in den Text gehören – eine Adressliste etwa – stehen besser in
`content/data/<name>.json`. Die Karte holt sie mit `data: <name>`:

```map
height: 360
data: orte
filter: ort | Standort | Location
search: Name oder Ort | Name or town
list: true
```

Die drei zusätzlichen Zeilen bauen eine **Filterleiste** über die Karte:

| Zeile | Wirkung |
|-------|---------|
| `filter: ort \| Standort \| Location` | Auswahlliste über das Feld `ort` der Einträge. Die Werte holt die Karte aus den Daten – sie müssen nicht zusätzlich im Markdown stehen. Nach dem zweiten Strich steht die englische Beschriftung. |
| `search: Name oder Ort \| Name or town` | Textfeld; gesucht wird in Titel, Untertitel und allen Zeilen eines Eintrags (also auch in PLZ und Ort) |
| `list: true` | Trefferliste unter der Karte, überschrieben mit „Ergebnisse:"; ein Klick auf einen Namen springt zum Punkt |

**Zweisprachig:** die englischen Beschriftungen stehen jeweils nach dem zweiten
Strich; fehlen sie, gilt die deutsche Fassung in beiden Sprachen. Auch die
**Werte** der Auswahlliste lassen sich übersetzen – dazu bekommt ein Eintrag
neben `ort` zusätzlich `ort_en`. Gefiltert wird immer über das Grundfeld, die
Auswahl bleibt beim Sprachwechsel also erhalten; nur die Beschriftung wechselt.
„Alle", „Zurücksetzen" und „Ergebnisse:" kommen aus den Sprachdateien der Site
(`map.all`, `map.reset`, `map.results`).

Rechts in der Leiste steht, wie viele Einträge gerade sichtbar sind, daneben ein
Knopf zum Zurücksetzen. Gefiltert wird im Browser – die Karte passt ihren
Ausschnitt jedes Mal an die verbleibenden Punkte an.

Die Datei ist eine Liste von Objekten. Pflicht sind `lat` und `lon`, alles
andere ist freiwillig:

```json
[
  {
    "lat": 49.1427, "lon": 9.2190,
    "title": "Rathaus Heilbronn",
    "subtitle": "Sehenswürdigkeit",
    "lines": ["Marktplatz 7", "74072 Heilbronn"],
    "href": "https://de.wikipedia.org/wiki/Rathaus_Heilbronn", "hrefText": "Wikipedia"
  }
]
```

Die Datei wird beim Bauen zu `data/<name>.js` und im Dokument eingebunden – sie
wird also **nicht** nachgeladen. Dadurch funktioniert die Karte auch, wenn Du
die Seite direkt aus dem Dateisystem öffnest. Beides lässt sich mischen: Punkte
im Block **und** `data:` ergeben zusammen eine Karte.

## Was Du wissen solltest

- Das **Kartenmaterial** kommt beim Betrachten von einem Kachelserver im Netz.
  Welcher das ist, steht als `mapTiles`/`mapAttribution` in
  `content/meta.properties` und gilt dann für alle Karten der Site – diese hier
  nutzt den Server des deutschen OSM-Vereins. Ohne Angabe wäre es
  `tile.openstreetmap.org`, und `tiles:` im Block sticht beides. Anders als Formeln und Diagramme ist die Karte damit
  nicht vollständig im Projekt enthalten: ohne Netz bleibt sie leer, und der
  Server erfährt die IP-Adresse der Betrachter. Für eine Seite mit
  Datenschutzerklärung ist das erwähnenswert.
- Die **Bibliothek** (Leaflet) liegt wie MathJax und highlight.js lokal im
  Projekt und wird nur auf Seiten geladen, die eine Karte enthalten.
- Das **Mausrad** zoomt erst mit gedrückter Strg- bzw. Cmd-Taste – sonst bliebe
  man beim Scrollen durch die Seite in der Karte hängen.
- Koordinaten sind Dezimalgrad (`49.1469, 9.2166`), nicht Grad/Minuten.
