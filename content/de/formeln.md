title=Formeln
navorder=05
math=true
~~~~~~

# Mathematische Formeln (LaTeX)

[TOC]

_Formeln schreibst Du in LaTeX-Syntax. Sie werden lokal gesetzt – ohne externe Dienste._


<div class="nextpage"></div>

## Formeln einschalten

Formeln werden nur auf Seiten gesetzt, die es ausdrücklich anfordern. Ergänze dazu im Kopf der Datei die Zeile `math=true`:

    title=Formeln
    navorder=05
    math=true
    ~~~~~~

Nur dann wird der (lokal gebündelte) Formelsatz geladen – Seiten ohne Formeln bleiben schlank.


<div class="nextpage"></div>

## Formeln im Fließtext

Eine Formel mitten im Satz umschließt Du mit einfachen Dollarzeichen. Aus `$a^2 + b^2 = c^2$` wird im Text: $a^2 + b^2 = c^2$. Und `$e^{i\pi} + 1 = 0$` ergibt $e^{i\pi} + 1 = 0$.

Bewusst werden Dollarzeichen als Trenner verwendet (und nicht `\( … \)`): Nur so übersteht die Formel den Markdown-Umbau unbeschadet.


<div class="nextpage"></div>

## Abgesetzte Formeln

Für eine eigenständige, zentrierte Formel verwendest Du doppelte Dollarzeichen:

```
$$ \sum_{i=1}^{n} i = \frac{n\,(n+1)}{2} $$
```

Ergebnis:

$$ \sum_{i=1}^{n} i = \frac{n\,(n+1)}{2} $$

Ein weiteres Beispiel, `$$ \int_0^1 x^2 \, dx = \frac{1}{3} $$`, ergibt:

$$ \int_0^1 x^2 \, dx = \frac{1}{3} $$


<div class="nextpage"></div>

## Formeln als Codeblock

Enthält eine abgesetzte Formel viele Sonderzeichen (etwa Unterstriche), bist Du mit einem Codeblock der „Sprache" `math` auf der sicheren Seite – sein Inhalt bleibt garantiert unangetastet:

````
```math
f(x) = a_0 + \sum_{k=1}^{\infty} \left( a_k \cos kx + b_k \sin kx \right)
```
````

Ergebnis:

```math
f(x) = a_0 + \sum_{k=1}^{\infty} \left( a_k \cos kx + b_k \sin kx \right)
```


<div class="nextpage"></div>

## Matrizen und mehr

Es steht der volle LaTeX-Mathematiksatz zur Verfügung – etwa Matrizen, Klammern und Ausrichtung:

```math
A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \qquad \det A = -2
```
