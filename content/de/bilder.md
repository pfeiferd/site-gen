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

## Ausrichtung

Steht ein Bild **allein in einem Absatz**, ist es ein Inhaltsbild und wird
automatisch zentriert – so wie das Beispiel oben. Steht dagegen Text im selben
Absatz oder in derselben Listenzeile (etwa ein Flaggen-Symbol vor einem Link),
bleibt das Bild im Textfluss stehen.

Willst Du ein einzelnes Bild anders ausrichten, hängst Du an seinen **Titel** ein
`|left`, `|center` oder `|right` an:

```
![Ein Beispielbild](beispiel.svg "Ein Beispielbild|left")
```

Ergebnis:

![Ein Beispielbild](beispiel.svg "Ein Beispielbild|left")

Der Titel ist in Markdown die einzige Stelle, an der sich ohne rohes HTML etwas
mitgeben lässt. Die Angabe wird beim Bauen wieder aus dem Titel entfernt, landet
also nicht im Tooltip. Brauchst Du gar keinen Titel, schreibst Du nur den Marker:

```
![Ein Beispielbild](beispiel.svg "|right")
```

Ergebnis:

![Ein Beispielbild](beispiel.svg "|right")

Das funktioniert auch bei einem **verlinkten** Bild:
`[![Alt](beispiel.svg "|right")](datei.pdf)`.

Weil ausgerichtet wird, was allein im Absatz steht, hat der Marker bei einem Bild
*mitten im Text* keine Wirkung – dort wird er nur stillschweigend entfernt.


<div class="nextpage"></div>

## Größe

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

Trägt eine Kachel mehrere Angaben – Name, Funktion, Ort –, trennst Du die Zeilen
der Bildunterschrift mit einem Semikolon (dieselbe Schreibweise wie im
`map`-Block):

```gallery
beispiel.svg | **Ein Beispielbild**; zweite Zeile; dritte Zeile
```

Mit `**...**` ausgezeichneter Text wird dabei fett – praktisch, um in einer Kachel
mit mehreren Angaben den Namen hervorzuheben.

Liegt zu einem Eintrag **kein Bild** vor, lässt Du den Dateinamen weg und beginnst
die Zeile mit `|` – dann entsteht eine Kachel, die nur die Unterschrift trägt:

```gallery
| Noch kein Bild vorhanden; zweite Zeile
```

An der Stelle des Bildes steht eine leere Fläche im selben Format, damit das Raster
nicht verrutscht.

Die Größe der Kacheln stellst Du mit zwei optionalen Zeilen im Block ein:
`width: 220` setzt die Breite in Pixeln (Vorgabe 200), `ratio: 16/9` das
Seitenverhältnis (Vorgabe 4/3). Das Bild wird in die Kachel **eingepasst**, nie
angeschnitten – so stehen auch Hoch- und Querformate nebeneinander gleich hoch.
