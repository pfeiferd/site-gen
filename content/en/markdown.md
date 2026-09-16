title=Markdown
navorder=02
~~~~~~

# Markdown: text and structure

[TOC]

_The body text of a slide is written in Markdown. This page shows the most important building blocks – source and result side by side._


<div class="nextpage"></div>

## Paragraphs and emphasis

An empty line separates paragraphs. **Important:** in this system every single line break is rendered as a line break (the "hard wraps" option). So write a paragraph as one continuous line and separate paragraphs with a blank line.

```
This is **bold**, this is _italic_, this is `code` and this is ~~struck through~~.
```

Result: This is **bold**, this is _italic_, this is `code` and this is ~~struck through~~.


<div class="nextpage"></div>

## Lists

```
- First item
- Second item
    - Sub-item
1. Numbered
2. And so on
```

Result:

- First item
- Second item
    - Sub-item
1. Numbered
2. And so on


<div class="nextpage"></div>

## Links

A link is made from the text in square brackets and the target in round brackets:

```
More at [Heilbronn University](https://www.hs-heilbronn.de).
```

Result: More at [Heilbronn University](https://www.hs-heilbronn.de).

To open an external link in a new tab, write it as plain HTML: `<a href="https://www.hs-heilbronn.de" target="_blank">…</a>`.


<div class="nextpage"></div>

## Quotes and rules

```
> A quote is marked with a leading greater-than sign.

---
```

Result:

> A quote is marked with a leading greater-than sign.

---


<div class="nextpage"></div>

## Tables

Columns are separated by vertical bars; the second row sets the alignment:

```
| Term    | Meaning                     |
|---------|-----------------------------|
| Schema  | structure of the data       |
| Tuple   | one row of a relation       |
```

Result:

| Term    | Meaning                     |
|---------|-----------------------------|
| Schema  | structure of the data       |
| Tuple   | one row of a relation       |


<div class="nextpage"></div>

## Code

Short code goes between `` `backticks` ``. Longer blocks go between three backticks; the language tag right after the opening backticks (e.g. `java`, `sql`, `python`) turns on coloured syntax highlighting:

````
```java
public record Punkt(int x, int y) {}
```
````

Result – Java:

```java
public record Punkt(int x, int y) {
    double abstand(Punkt p) {
        return Math.hypot(x - p.x(), y - p.y());
    }
}
```

SQL:

```sql
SELECT name, matrikelnr
FROM student
WHERE semester >= 3
ORDER BY name;
```

Python:

```python
def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

Without a language tag a block stays plain – ideal for showing examples verbatim.
