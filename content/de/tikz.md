title=TikZ und pgfplots
navorder=06
~~~~~~

# Grafiken mit TikZ und pgfplots

[TOC]

_Zeichnungen und Funktionsplots beschreibst Du in LaTeX (TikZ, pgfplots). Beim Erstellen der Website werden sie zu Vektorgrafiken gesetzt – auf dem Bauknoten muss dafür ein LaTeX installiert sein._


<div class="nextpage"></div>

## So funktioniert es

Setze den TikZ-Quelltext in einen Codeblock mit dem Sprachkürzel `tikz`. Beim Erstellen der Website kompiliert `latex` den Block, `dvisvgm` macht daraus ein SVG, und die Seite zeigt an seiner Stelle das Bild. Schrift wird in Pfade umgewandelt – der Browser braucht keine LaTeX-Schriften.

Anders als bei PlantUML und Formeln läuft das **nicht** in Java oder im Browser: Auf dem Rechner, der die Site baut, müssen `latex` und `dvisvgm` installiert sein (TeX Live mit `tikz`, `pgfplots` und `preview`). Fehlen sie, erscheint an Stelle der Grafik ein Platzhalter und der Bau meldet eine Warnung – alles andere entsteht wie gewohnt.

Unveränderte Grafiken werden bei erneutem Bauen übersprungen.


<div class="nextpage"></div>

## Beispiel: eine Zeichnung

Du schreibst nur den **Inhalt** der `tikzpicture`-Umgebung; das Drumherum ergänzt der Bau. Quelltext:

````
```tikz
\draw[->] (0,0) -- (4,0) node[right] {$x$};
\draw[->] (0,0) -- (0,2.5) node[above] {$y$};
\draw[blue, thick, domain=0:4, smooth] plot (\x, {2*exp(-\x/2)});
\node[blue] at (2.5,1.4) {$y = 2e^{-x/2}$};
```
````

Ergebnis:

```tikz
\draw[->] (0,0) -- (4,0) node[right] {$x$};
\draw[->] (0,0) -- (0,2.5) node[above] {$y$};
\draw[blue, thick, domain=0:4, smooth] plot (\x, {2*exp(-\x/2)});
\node[blue] at (2.5,1.4) {$y = 2e^{-x/2}$};
```


<div class="nextpage"></div>

## Beispiel: ein Funktionsplot mit pgfplots

`pgfplots` ist bereits geladen; eine `axis`-Umgebung kann direkt im Block stehen:

````
```tikz
\begin{axis}[xlabel=$x$, ylabel=$f(x)$, width=10cm, height=6.5cm,
             grid=major, legend pos=north west]
  \addplot[blue, thick, domain=-4:4, samples=100] {1/(1+exp(-x))};
  \addlegendentry{Sigmoid}
  \addplot[red, thick, domain=-4:4, samples=100] {tanh(x)};
  \addlegendentry{tanh}
  \addplot[green!60!black, thick, domain=-4:4, samples=100] {max(0,x)};
  \addlegendentry{ReLU}
\end{axis}
```
````

Ergebnis:

```tikz
\begin{axis}[xlabel=$x$, ylabel=$f(x)$, width=10cm, height=6.5cm,
             grid=major, legend pos=north west]
  \addplot[blue, thick, domain=-4:4, samples=100] {1/(1+exp(-x))};
  \addlegendentry{Sigmoid}
  \addplot[red, thick, domain=-4:4, samples=100] {tanh(x)};
  \addlegendentry{tanh}
  \addplot[green!60!black, thick, domain=-4:4, samples=100] {max(0,x)};
  \addlegendentry{ReLU}
\end{axis}
```


<div class="nextpage"></div>

## Breite und Alternativtext

Die Grafik erscheint in ihrer natürlichen Größe, höchstens so breit wie die Textspalte. Zwei Kommentarzeilen **am Anfang** des Blocks stellen sie ein – für LaTeX sind es gewöhnliche Kommentare:

````
```tikz
% width=55%
% alt=Ein kleines neuronales Netz mit einer verborgenen Schicht
\foreach \i in {1,2,3} \node[circle,draw,fill=blue!15] (i\i) at (0,-\i) {};
\foreach \j in {1,...,4} \node[circle,draw,fill=green!15] (h\j) at (2.5,-\j+0.5) {};
\node[circle,draw,fill=red!15] (o) at (5,-2) {};
\foreach \i in {1,2,3} \foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (i\i) -- (h\j);
\foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (h\j) -- (o);
\node[above=2mm of i1] {Eingabe};
\node[above=2mm of h1] {Verborgen};
\node[above=2mm of o, yshift=12mm] {Ausgabe};
```
````

Ergebnis:

```tikz
% width=55%
% alt=Ein kleines neuronales Netz mit einer verborgenen Schicht
\foreach \i in {1,2,3} \node[circle,draw,fill=blue!15] (i\i) at (0,-\i) {};
\foreach \j in {1,...,4} \node[circle,draw,fill=green!15] (h\j) at (2.5,-\j+0.5) {};
\node[circle,draw,fill=red!15] (o) at (5,-2) {};
\foreach \i in {1,2,3} \foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (i\i) -- (h\j);
\foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (h\j) -- (o);
\node[above=2mm of i1] {Eingabe};
\node[above=2mm of h1] {Verborgen};
\node[above=2mm of o, yshift=12mm] {Ausgabe};
```

`width` nimmt jede CSS-Breite (`55%`, `320px`, `12em`), `alt` den Alternativtext für Screenreader.


<div class="nextpage"></div>

## Pakete, Bibliotheken, eigene Makros

Der Bau stellt jedem Block eine kleine Präambel voran: `tikz`, `pgfplots` (`compat=newest`), `amsmath`, `amssymb`. Was darüber hinaus nötig ist, kommt in eine Datei `tikz-preamble.tex`:

- `content/tikz-preamble.tex` gilt für die ganze Site,
- `content/<vorlesung>/tikz-preamble.tex` zusätzlich für eine Vorlesung,
- `content/<vorlesung>/<sprache>/tikz-preamble.tex` für eine Sprache.

Alle auf dem Weg liegenden Dateien werden in dieser Reihenfolge angehängt. Die Pfeilspitzen (`Stealth`) und das `above=2mm of …` im Beispiel oben kommen aus der Präambel dieser Site:

```
\usetikzlibrary{arrows.meta,positioning,calc}
\pgfplotsset{every axis/.append style={font=\small}}
```

Beginnt eine Präambel selbst mit `\documentclass`, ersetzt sie den eingebauten Kopf ganz. Dasselbe gilt für einen einzelnen Block, der mit `\documentclass` anfängt: Er wird unverändert kompiliert – nützlich für `standalone`-Dokumente, die Du schon hast.


<div class="nextpage"></div>

## Grafiken als eigene Datei

Längere Zeichnungen kannst Du in eine Datei mit der Endung `.tikz` neben die Markdown-Seite legen, etwa `content/<vorlesung>/de/netz.tikz`. Sie wird genauso kompiliert und landet unter `images/tikz/<vorlesung>/de/netz.svg` – von dort bindest Du sie wie jedes Bild ein:

```
![Ein Netz](../../images/tikz/<vorlesung>/de/netz.svg)
```

Eine Datei unter `content/common/` steht allen Sprachen einer Vorlesung zur Verfügung.


<div class="nextpage"></div>

## Wenn etwas schiefgeht

Ein Block, den LaTeX nicht übersetzen kann, bricht den Bau ab. Die Meldung nennt die Seite, die Nummer des Blocks (`<seite>-<n>.svg`) und die Fehlerzeilen aus dem LaTeX-Protokoll; der vollständige Lauf liegt unter `target/tikz-work/<seite>-<n>/figure.log`.
