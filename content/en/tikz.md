title=TikZ and pgfplots
navorder=06
~~~~~~

# Figures with TikZ and pgfplots

[TOC]

_You describe drawings and function plots in LaTeX (TikZ, pgfplots). When the website is built they are typeset into vector graphics – which requires a LaTeX installation on the build machine._


<div class="nextpage"></div>

## How it works

Put the TikZ source into a code block with the language tag `tikz`. When the website is built, `latex` compiles the block, `dvisvgm` turns it into an SVG, and the page shows the image in its place. Text is converted to paths – the browser needs no LaTeX fonts.

Unlike PlantUML and formulas this does **not** run in Java or in the browser: the machine that builds the site needs `latex` and `dvisvgm` (TeX Live with `tikz`, `pgfplots` and `preview`). If they are missing, a placeholder appears instead of the figure and the build prints a warning – everything else is generated as usual.

Unchanged figures are skipped on a rebuild.


<div class="nextpage"></div>

## Example: a drawing

You write only the **contents** of the `tikzpicture` environment; the build adds the rest. Source:

````
```tikz
\draw[->] (0,0) -- (4,0) node[right] {$x$};
\draw[->] (0,0) -- (0,2.5) node[above] {$y$};
\draw[blue, thick, domain=0:4, smooth] plot (\x, {2*exp(-\x/2)});
\node[blue] at (2.5,1.4) {$y = 2e^{-x/2}$};
```
````

Result:

```tikz
\draw[->] (0,0) -- (4,0) node[right] {$x$};
\draw[->] (0,0) -- (0,2.5) node[above] {$y$};
\draw[blue, thick, domain=0:4, smooth] plot (\x, {2*exp(-\x/2)});
\node[blue] at (2.5,1.4) {$y = 2e^{-x/2}$};
```


<div class="nextpage"></div>

## Example: a function plot with pgfplots

`pgfplots` is already loaded; an `axis` environment can sit directly in the block:

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

Result:

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

## Width and alternative text

The figure appears at its natural size, at most as wide as the text column. Two comment lines **at the start** of the block adjust it – for LaTeX they are ordinary comments:

````
```tikz
% width=55%
% alt=A small neural network with one hidden layer
\foreach \i in {1,2,3} \node[circle,draw,fill=blue!15] (i\i) at (0,-\i) {};
\foreach \j in {1,...,4} \node[circle,draw,fill=green!15] (h\j) at (2.5,-\j+0.5) {};
\node[circle,draw,fill=red!15] (o) at (5,-2) {};
\foreach \i in {1,2,3} \foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (i\i) -- (h\j);
\foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (h\j) -- (o);
\node[above=2mm of i1] {Input};
\node[above=2mm of h1] {Hidden};
\node[above=2mm of o, yshift=12mm] {Output};
```
````

Result:

```tikz
% width=55%
% alt=A small neural network with one hidden layer
\foreach \i in {1,2,3} \node[circle,draw,fill=blue!15] (i\i) at (0,-\i) {};
\foreach \j in {1,...,4} \node[circle,draw,fill=green!15] (h\j) at (2.5,-\j+0.5) {};
\node[circle,draw,fill=red!15] (o) at (5,-2) {};
\foreach \i in {1,2,3} \foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (i\i) -- (h\j);
\foreach \j in {1,...,4} \draw[-{Stealth[length=4pt]}, gray] (h\j) -- (o);
\node[above=2mm of i1] {Input};
\node[above=2mm of h1] {Hidden};
\node[above=2mm of o, yshift=12mm] {Output};
```

`width` takes any CSS width (`55%`, `320px`, `12em`), `alt` the alternative text for screen readers.


<div class="nextpage"></div>

## Packages, libraries, your own macros

The build prefixes every block with a small preamble: `tikz`, `pgfplots` (`compat=newest`), `amsmath`, `amssymb`. Anything beyond that goes into a file `tikz-preamble.tex`:

- `content/tikz-preamble.tex` applies to the whole site,
- `content/<lecture>/tikz-preamble.tex` additionally to one lecture,
- `content/<lecture>/<language>/tikz-preamble.tex` to one language.

All files along that path are appended in this order. The arrow tips (`Stealth`) and the `above=2mm of …` in the example above come from this site's preamble:

```
\usetikzlibrary{arrows.meta,positioning,calc}
\pgfplotsset{every axis/.append style={font=\small}}
```

A preamble that itself starts with `\documentclass` replaces the built-in head entirely. The same holds for a single block that starts with `\documentclass`: it is compiled unchanged – handy for `standalone` documents you already have.


<div class="nextpage"></div>

## Figures as files of their own

Longer drawings can live in a file with the extension `.tikz` next to the Markdown page, e.g. `content/<lecture>/en/net.tikz`. It is compiled the same way and ends up under `images/tikz/<lecture>/en/net.svg` – from there you embed it like any image:

```
![A network](../../images/tikz/<lecture>/en/net.svg)
```

A file under `content/common/` is available to all languages of a lecture.


<div class="nextpage"></div>

## When something goes wrong

A block that LaTeX cannot compile aborts the build. The message names the page, the number of the block (`<page>-<n>.svg`) and the error lines from the LaTeX log; the complete run is kept under `target/tikz-work/<page>-<n>/figure.log`.
