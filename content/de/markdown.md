title=Markdown
navorder=02
~~~~~~

# Markdown: Text und Struktur

[TOC]

_Der Fließtext einer Folie wird in Markdown geschrieben. Diese Seite zeigt die wichtigsten Bausteine – jeweils Quelltext und Ergebnis._


<div class="nextpage"></div>

## Absätze und Betonung

Ein leerer Zeilenumbruch trennt Absätze. **Wichtig:** In diesem System wird jeder einfache Zeilenumbruch als Zeilenumbruch dargestellt (Option „harte Umbrüche"). Schreibe einen Absatz also am besten in eine durchgehende Zeile und trenne Absätze durch eine Leerzeile.

```
Das ist **fett**, das ist _kursiv_, das ist `Code` und das ist ~~durchgestrichen~~.
```

Ergebnis: Das ist **fett**, das ist _kursiv_, das ist `Code` und das ist ~~durchgestrichen~~.


<div class="nextpage"></div>

## Listen

```
- Erster Punkt
- Zweiter Punkt
    - Unterpunkt
1. Nummeriert
2. Und weiter
```

Ergebnis:

- Erster Punkt
- Zweiter Punkt
    - Unterpunkt
1. Nummeriert
2. Und weiter


<div class="nextpage"></div>

## Links

Ein Link entsteht aus Text in eckigen und Ziel in runden Klammern:

```
Mehr auf der [Hochschule Heilbronn](https://www.hs-heilbronn.de).
```

Ergebnis: Mehr auf der [Hochschule Heilbronn](https://www.hs-heilbronn.de).

Soll ein externer Link in einem neuen Tab öffnen, schreibe ihn als reines HTML: `<a href="https://www.hs-heilbronn.de" target="_blank">…</a>`.


<div class="nextpage"></div>

## Zitate und Trennlinien

```
> Ein Zitat wird mit einem vorangestellten Größer-Zeichen ausgezeichnet.

---
```

Ergebnis:

> Ein Zitat wird mit einem vorangestellten Größer-Zeichen ausgezeichnet.

---


<div class="nextpage"></div>

## Tabellen

Spalten werden durch senkrechte Striche getrennt, die zweite Zeile legt die Ausrichtung fest:

```
| Begriff   | Bedeutung                       |
|-----------|---------------------------------|
| Schema    | Struktur der Daten              |
| Tupel     | eine Zeile einer Relation       |
```

Ergebnis:

| Begriff   | Bedeutung                       |
|-----------|---------------------------------|
| Schema    | Struktur der Daten              |
| Tupel     | eine Zeile einer Relation       |


<div class="nextpage"></div>

## Code

Kurzer Code steht zwischen `` `Backticks` ``. Längere Blöcke stehen zwischen drei Backticks; das Sprachkürzel direkt hinter den öffnenden Backticks (z. B. `java`, `sql`, `python`) schaltet die farbige Syntaxhervorhebung ein:

````
```java
public record Punkt(int x, int y) {}
```
````

Ergebnis – Java:

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

Ohne Sprachkürzel bleibt ein Block schlicht – ideal, um Beispiele wörtlich zu zeigen.
