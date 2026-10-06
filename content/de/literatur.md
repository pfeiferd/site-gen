title=Literatur
navorder=07
bibliography=literatur.bib
~~~~~~

# Literaturangaben aus BibTeX

[TOC]

_Literatur pflegst Du wie in LaTeX in einer `.bib`-Datei. Im Text zitierst Du per Schlüssel – Nummern, Formatierung und Literaturverzeichnis entstehen beim Erstellen der Website automatisch._


<div class="nextpage"></div>

## Literatur einschalten

Eine Seite nennt ihre BibTeX-Datei im Kopf mit `bibliography=`:

    title=Literatur
    navorder=07
    bibliography=literatur.bib
    ~~~~~~

Die Datei wird zuerst neben der Seite gesucht, danach in den übergeordneten Ordnern bis hinauf zu `content/`. So kann eine ganze Vorlesung eine gemeinsame Datei nutzen – etwa unter `content/<vorlesung>/literatur.bib` – und `bibliography=` einmal in ihrer `meta.properties` setzen. Mehrere Dateien trennst Du mit Kommas.


<div class="nextpage"></div>

## Zitieren

Ein Zitat ist der Schlüssel des Eintrags mit vorangestelltem `@` in eckigen Klammern. Aus `[@knuth1984]` wird im Text: [@knuth1984]. Mehrere Quellen trennst Du mit Semikolon – `[@lamport1994; @bishop2006]` ergibt [@lamport1994; @bishop2006].

Jedes Zitat ist ein Link auf seinen Eintrag im Literaturverzeichnis. Die Nummern vergibt der Build in der Reihenfolge, in der die Quellen auf der Seite zum ersten Mal zitiert werden. Akzente in LaTeX-Schreibweise wie `S{\'e}rgio` werden dabei umgewandelt [@moro2014], Links und DOIs werden anklickbar [@csl].

Ein unbekannter Schlüssel wie `[@gibtesnicht]` bricht den Build nicht ab: Er bleibt farbig markiert stehen ([@gibtesnicht]), und die Konsole meldet eine Warnung.


<div class="nextpage"></div>

## Literaturverzeichnis

Eine Zeile, die nur `[BIB]` enthält, wird zum Literaturverzeichnis. Es listet genau die Quellen, die auf der Seite zitiert werden – nicht die ganze `.bib`-Datei. Die Überschrift davor schreibst Du selbst, so erscheint sie auch im Inhaltsverzeichnis:

    ## Literatur

    [BIB]

Das Verzeichnis dieser Seite steht ganz unten.

In Codeblöcken und in `Code` im Fließtext bleiben `[@schlüssel]` und `[BIB]` unverändert – so wie in den Beispielen auf dieser Seite.


<div class="nextpage"></div>

## Zitierstil

Vorgabe ist der numerische Stil **IEEE**. Mit `citationStyle=` wählst Du einen anderen – wie `bibliography=` im Kopf einer Seite oder in einer `meta.properties`:

| Wert | Stil |
|------|------|
| `ieee` | IEEE, numerisch: [1] (Vorgabe) |
| `springer-vancouver-brackets` | Springer Vancouver, numerisch: [1] |
| `din-1505-2-numeric` | DIN 1505-2, numerisch: [1] |
| `din-1505-2` | DIN 1505-2, Autor-Jahr: (Knuth, 1984) |
| `apa` | APA, Autor-Jahr: (Knuth, 1984) |

Alternativ gibst Du eine eigene Stildatei an, etwa `citationStyle=mein-stil.csl`. Sie wird wie die `.bib`-Datei gesucht. Tausende fertige Stile gibt es im [CSL-Stilverzeichnis](https://www.zotero.org/styles). Die Sprache (Deutsch oder Englisch) – etwa „Verfügbar unter“ oder „und“ – richtet sich automatisch nach der Seite.


<div class="nextpage"></div>

## Literatur

[BIB]
