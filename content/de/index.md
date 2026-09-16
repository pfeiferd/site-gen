title=Einführung
navorder=01
~~~~~~

# Tutorial: Eine Vorlesung erstellen

[TOC]

_So verfasst man mit diesem System eine Vorlesung – Schritt für Schritt._


<div class="nextpage"></div>

## Worum es geht

Dieses Tutorial ist selbst eine Vorlesung. Es zeigt an lebenden Beispielen, wie man Inhalte schreibt: Text und Struktur, Bilder, PlantUML-Diagramme und mathematische Formeln in LaTeX. Alle rein technischen und konfigurativen Aspekte – Projektaufbau, Build, Konfigurationsdateien – sind bewusst ausgelagert und in der `README.md` des Projekts beschrieben.

Eine Vorlesung besteht aus mehreren **Themen**, den Einträgen in der Seitenleiste links. Jedes Thema ist eine einzelne Markdown-Datei. Die Seite, die Du gerade liest, ist die Datei `content/de/index.md`.


<div class="nextpage"></div>

## Zwei Ansichten: Dokument und Foliensatz

Oben rechts lässt sich zwischen **Dokument** und **Slides** umschalten:

- **Dokument:** Alle Folien fließen nahtlos untereinander – ideal zum Lesen und Nachschlagen.
- **Slides:** Eine Folie pro Bildschirmseite, mit den Pfeiltasten oder den Schaltflächen unten navigierbar – ideal für die Präsentation.

Denselben Inhalt schreibst Du nur **einmal**; beide Ansichten entstehen automatisch daraus. Probiere es gleich auf dieser Seite aus.

Manchmal soll ein Absatz aber gezielt nur in einer der beiden Ansichten erscheinen – etwa eine ausführlichere Erklärung nur im Dokument oder ein knapper Stichpunkt nur auf der Folie. Dafür markierst Du den umschließenden Block mit der Klasse `doc-only` bzw. `slides-only`:

```
<div class="doc-only">Dieser Text erscheint nur in der Dokumentansicht.</div>
<div class="slides-only">Dieser Text erscheint nur in der Folienansicht.</div>
```

<div class="doc-only">Dieser Absatz ist mit <code>doc-only</code> markiert – Du siehst ihn also nur, wenn oben rechts <strong>Dokument</strong> gewählt ist.</div>
<div class="slides-only">Dieser Absatz ist mit <code>slides-only</code> markiert – Du siehst ihn also nur, wenn oben rechts <strong>Slides</strong> gewählt ist.</div>


<div class="nextpage"></div>

## Eine neue Folie beginnen

Folien trennst Du mit einem einzigen Marker auf einer eigenen Zeile:

```
<div class="nextpage"></div>
```

Alles vor dem ersten Marker bildet die erste Folie, jeder weitere Marker beginnt die nächste. Genau dieser Marker sorgt dafür, dass die vorliegende Seite in einzelne Folien zerfällt.


<div class="nextpage"></div>

## Titel, Überschriften und Nummerierung

Jede Datei beginnt mit einem kleinen Kopf und dem Trenner `~~~~~~`, danach folgt der eigentliche Inhalt:

    title=Einführung
    navorder=01
    ~~~~~~

`title` ist der angezeigte Seitentitel, `navorder` bestimmt die Reihenfolge in der Seitenleiste. Die erste Überschrift (`#`) ist die Hauptüberschrift der Seite und bleibt ohne Nummer; alle weiteren Überschriften (`##`, `###`) werden auf Vorlesungsseiten **automatisch nummeriert** – sichtbar an den Nummern vor diesen Abschnitten.


<div class="nextpage"></div>

## Seiten aus- und einblenden

Manchmal soll ein Thema noch nicht sichtbar sein – etwa weil es gerade entsteht. Dafür gibt es das Attribut `publish`. Trägst Du im Kopf einer Datei

    publish=false

ein, so erscheint die Seite weder im fertigen Ergebnis noch in der Seitenleiste. Der Standard ist `true`; lässt Du das Attribut also weg, ist die Seite sichtbar.

Dasselbe Attribut funktioniert auch in einer `meta.properties` und wirkt dann auf die gesamte Ebene: `publish=false` in der `meta.properties` einer Vorlesung blendet die **komplette** Vorlesung aus. Ein `false` weiter oben übersteuert dabei ein `true` weiter unten – so kannst Du eine ganze Vorlesung mit einer einzigen Zeile verbergen.


<div class="nextpage"></div>

## Ein Inhaltsverzeichnis

Schreibst Du den Marker

```
[TOC]
```

auf eine eigene Zeile, so entsteht daraus automatisch ein Inhaltsverzeichnis aus allen nachfolgenden Überschriften – genau wie oben auf dieser Seite.


<div class="nextpage"></div>

## Wie es weitergeht

Die weiteren Themen dieser Vorlesung behandeln der Reihe nach:

- **Markdown** – Text, Listen, Tabellen, Links und Code.
- **Bilder** – Bilder einbinden und sprachabhängig verwalten.
- **Diagramme** – Diagramme mit PlantUML direkt aus dem Text erzeugen.
- **Formeln** – mathematische Formeln in LaTeX setzen.

Wechsle über die Seitenleiste links zum nächsten Thema.
