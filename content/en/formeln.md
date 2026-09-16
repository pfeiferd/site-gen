title=Formulas
navorder=05
math=true
~~~~~~

# Mathematical formulas (LaTeX)

[TOC]

_Formulas are written in LaTeX syntax. They are typeset locally – without any external service._


<div class="nextpage"></div>

## Turning formulas on

Formulas are only typeset on pages that explicitly ask for it. To do so, add the line `math=true` to the file's header:

    title=Formulas
    navorder=05
    math=true
    ~~~~~~

Only then is the (locally bundled) formula engine loaded – pages without formulas stay lean.


<div class="nextpage"></div>

## Formulas within the text

You wrap an in-line formula in single dollar signs. `$a^2 + b^2 = c^2$` becomes, within the text: $a^2 + b^2 = c^2$. And `$e^{i\pi} + 1 = 0$` yields $e^{i\pi} + 1 = 0$.

Dollar signs are used as delimiters on purpose (rather than `\( … \)`): only that way does the formula survive the Markdown processing unharmed.


<div class="nextpage"></div>

## Displayed formulas

For a standalone, centred formula you use double dollar signs:

```
$$ \sum_{i=1}^{n} i = \frac{n\,(n+1)}{2} $$
```

Result:

$$ \sum_{i=1}^{n} i = \frac{n\,(n+1)}{2} $$

Another example, `$$ \int_0^1 x^2 \, dx = \frac{1}{3} $$`, yields:

$$ \int_0^1 x^2 \, dx = \frac{1}{3} $$


<div class="nextpage"></div>

## Formulas as a code block

If a displayed formula contains many special characters (underscores, say), a code block of the "language" `math` keeps you on the safe side – its content stays untouched, guaranteed:

````
```math
f(x) = a_0 + \sum_{k=1}^{\infty} \left( a_k \cos kx + b_k \sin kx \right)
```
````

Result:

```math
f(x) = a_0 + \sum_{k=1}^{\infty} \left( a_k \cos kx + b_k \sin kx \right)
```


<div class="nextpage"></div>

## Matrices and more

The full LaTeX mathematics mode is available – matrices, brackets and alignment, for instance:

```math
A = \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}, \qquad \det A = -2
```
