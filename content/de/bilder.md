title=Bilder
navorder=03
~~~~~~

# Bilder einbinden

[TOC]

_Bilder werden schlicht über ihren Namen referenziert – wo die Datei tatsächlich liegt, entscheidet eine Kaskade._


<div class="nextpage"></div>

## Ein Bild einfügen

Ein Bild bindest Du mit der Markdown-Schreibweise „Ausrufezeichen, Alternativtext in eckigen, Dateiname in runden Klammern" ein. Es genügt der bloße Dateiname:

```
![Ein Beispielbild](beispiel.svg)
```

Ergebnis:

![Ein Beispielbild](beispiel.svg)


<div class="nextpage"></div>

## Größe und Ausrichtung

Für etwas mehr Kontrolle – etwa eine feste Breite – kannst Du auch reines HTML mit der Klasse `content-img` verwenden:

```
<img class="content-img" src="beispiel.svg" alt="Ein Beispielbild" style="max-width:320px">
```

Ergebnis:

<img class="content-img" src="beispiel.svg" alt="Ein Beispielbild" style="max-width:320px">


<div class="nextpage"></div>

## Wo die Bilddateien liegen

Du referenzierst ein Bild immer nur über seinen Dateinamen. Wo es wirklich gespeichert ist, ergibt sich aus einer Kaskade (von allgemein zu speziell). Später Genanntes gewinnt bei gleichem Dateinamen:

| Ablageort                             | gilt für                                  |
|---------------------------------------|-------------------------------------------|
| `content/images/`                     | die gesamte Website                       |
| `content/<vorlesung>/common/images/`  | alle Sprachen dieser Vorlesung            |
| `content/<vorlesung>/de/images/`      | nur die deutsche Fassung                  |
| `content/<vorlesung>/en/images/`      | nur die englische Fassung                 |

Das Beispielbild oben liegt unter `content/common/images/beispiel.svg` und ist damit in beiden Sprachen verfügbar.


<div class="nextpage"></div>

## Sprachabhängige Bilder

Der Trick der Kaskade: Ein sprachspezifisches Bild überschreibt das gemeinsame, **ohne dass sich die Referenz im Text ändert**. Enthält ein Diagramm zum Beispiel deutsche Beschriftungen, legst Du

- die deutsche Fassung unter `de/images/schema.svg` und
- die englische unter `en/images/schema.svg`

ab – beide unter demselben Namen `schema.svg`. Im Text schreibst Du überall nur `schema.svg`, und je nach Sprache erscheint automatisch die passende Datei.

## Bildergalerie

Mehrere Bilder lassen sich als **Galerie** zeigen: ein Raster aus Miniaturen mit
Bildunterschrift. Ein Klick auf eine Miniatur öffnet sie in der Vollansicht.

```gallery
beispiel.svg  | Ein Beispielbild
feather.svg   | Das Icon dieser Vorlesung
hhn-logo.png  | Logo der Hochschule
favicon.png   | Favicon der Seite
```

Geschrieben wird das als Codeblock mit der Sprache `gallery` – je Zeile ein Bild,
dahinter nach einem `|` die Bildunterschrift (die auch weggelassen werden kann).
Die Bildnamen folgen derselben Regel wie sonst auch, ein `images/`-Präfix ist
nicht nötig.

Die Größe der Kacheln stellst Du mit zwei optionalen Zeilen im Block ein:
`width: 220` setzt die Breite in Pixeln (Vorgabe 150), `ratio: 16/9` das
Seitenverhältnis (Vorgabe 4/3). Das Bild wird in die Kachel **eingepasst**, nie
angeschnitten – so stehen auch Hoch- und Querformate nebeneinander gleich hoch.
