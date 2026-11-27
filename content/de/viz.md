title=Algorithmen-Animationen
navorder=12
~~~~~~

# Algorithmen-Animationen

[TOC]

_Sortieren, Suchen und Wegfinden als Animation Schritt für Schritt: Die Lesenden klicken sich durch (oder lassen abspielen), was der Algorithmus tut – welche Elemente verglichen, getauscht oder besucht werden._

Ein `algo-viz`-Block enthält nur die **Eingabe**. Der Algorithmus selbst ist eingebaut (`js/algoviz-algos.js`) und läuft im Browser der Lesenden: Beim Bauen ist nichts zu rechnen, und Seiten ohne so einen Block laden nichts davon. Unter dem Bild stehen die Knöpfe **Zurück / Weiter / Abspielen** und ein Tempo-Regler; im Folienmodus schalten die **Pfeiltasten** zuerst die Animation weiter und wechseln erst danach zur nächsten Folie. Von allein läuft nichts los.

## Sortieren

````
```algo-viz
title: Bubblesort
algo: bubble-sort
data: 5, 2, 9, 1, 7, 3
```
````

```algo-viz
title: Bubblesort
algo: bubble-sort
data: 5, 2, 9, 1, 7, 3
```

- `algo:` ist `bubble-sort`, `selection-sort`, `insertion-sort`, `merge-sort` oder `quick-sort`.
- `data:` nimmt bis zu 30 ganze Zahlen von 0 bis 999 (durch Komma oder Leerzeichen getrennt). `random: 8` liefert stattdessen 8 Werte – immer dieselben, die Folie ändert sich also nie.
- Orange Säulen werden gerade getauscht, blaue verglichen, grüne stehen an ihrem endgültigen Platz. Der Satz unter dem Bild sagt immer in Worten, was passiert; die Zähler zeigen Vergleiche und Tausche.

<div class="nextpage"></div>

## Quicksort und Mergesort

```algo-viz
title: Quicksort (die umrandete Säule ist das Pivot)
algo: quick-sort
data: 5, 2, 9, 1, 7, 3, 8, 4
```

```algo-viz
title: Mergesort (die Zeile darunter zeigt den Zwischenspeicher)
algo: merge-sort
data: 6, 3, 8, 1, 9, 2, 7, 4
```

<div class="nextpage"></div>

## Suchen

```algo-viz
title: Binärsuche nach 23
algo: binary-search
data: 2, 5, 8, 12, 16, 23, 31, 40
target: 23
```

`linear-search` und `binary-search` brauchen `target:`. Die Zeiger `lo`, `mid` und `hi` stehen unter den Säulen, Säulen außerhalb des Suchbereichs verblassen. Die Binärsuche braucht sortierte Daten – unsortierte Eingaben werden zuerst sortiert, und die Seite weist darauf hin.

<div class="nextpage"></div>

## Wegsuche im Raster

````
```algo-viz
title: A* auf einer Karte
algo: astar
grid:
S..#....
.#.#.##.
.#...#G.
...###..
```
````

```algo-viz
title: Breitensuche
algo: bfs
grid:
S..#....
.#.#.##.
.#...#G.
...###..
```

```algo-viz
title: A* mit Geländekosten (die Ziffern sind die Kosten, das Feld zu betreten)
algo: astar
grid:
S...#...
.##.#.#.
.#2.2.#G
.#2###..
...3....
```

- `algo:` ist `bfs`, `dfs`, `dijkstra` oder `astar`.
- Unter `grid:` ist jedes Zeichen ein Feld: `S` Start, `G` Ziel, `#` Mauer, `.` frei, und eine Ziffer von `2` bis `9` sind die Kosten, das Feld zu betreten (für `dijkstra` und `astar`; `bfs` und `dfs` zählen jeden Schritt als 1). Ein Raster darf bis zu 40 × 25 Felder haben.
- Hellblau mit Rahmen: entdeckt, aber noch nicht besucht. Mittelblau: besucht. Orange: das Feld, das gerade besucht wird. Grün: der fertige Weg. Die Zahlen auf besuchten Feldern sind die Kosten des bisher besten Wegs dorthin.

<div class="nextpage"></div>

## Graphen mit Gewichten

````
```algo-viz
title: Dijkstra von A nach D
algo: dijkstra
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```
````

```algo-viz
title: Dijkstra von A nach D
algo: dijkstra
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```

- Unter `graph:` definiert `A 0,0` einen Knoten (Name und Lage im Bild) und `A-B 4` eine ungerichtete Kante mit ihrem Gewicht (ohne Angabe 1). Bis zu 26 Knoten.
- `start:` ist Pflicht; ohne `goal:` läuft die Suche, bis alle erreichbaren Knoten besucht sind.
- Auf Graphen gibt es `bfs`, `dfs` und `dijkstra` (`astar` braucht ein Raster). `bfs` und `dfs` ignorieren die Gewichte.
- Fehler in der Eingabe (unbekannter Algorithmus, ein Raster ohne `S` oder `G`, …) lassen den Build nicht scheitern: Der Block zeigt dann eine Meldung statt des Bildes.

<div class="nextpage"></div>

## Weitere Algorithmen

Die übrigen Algorithmen funktionieren genauso wie die oben gezeigten.

```algo-viz
title: Selection Sort (der Zeiger `min` zeigt auf das bisher kleinste Element)
algo: selection-sort
data: 5, 2, 9, 1, 7, 3
```

```algo-viz
title: Insertion Sort (jedes neue Element wandert nach links, bis es passt)
algo: insertion-sort
data: 5, 2, 9, 1, 7, 3
```

<div class="nextpage"></div>

```algo-viz
title: Lineare Suche nach 15
algo: linear-search
data: 4, 8, 15, 16, 23
target: 15
```

```algo-viz
title: Tiefensuche – findet einen Weg, aber nicht unbedingt den kürzesten
algo: dfs
grid:
S..#....
.#.#.##.
.#...#G.
...###..
```

<div class="nextpage"></div>

```algo-viz
title: Breitensuche auf einem Graphen (die Gewichte werden ignoriert, jede Kante zählt 1)
algo: bfs
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```

```algo-viz
title: Tiefensuche auf einem Graphen
algo: dfs
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```

<div class="nextpage"></div>

## Bild und Code zusammen

Die Animation zeigt eine eingebaute *Referenzimplementierung*, nicht den Java-Code auf deiner Folie. Das ist Absicht: Du tippst nur die Eingabe, und du kannst die Animation **vor** dem Code zeigen (was soll passieren?) und den Code danach (wie funktioniert es?).

Wenn Bild und hervorgehobene Codezeile **immer zusammenpassen** sollen, ergänze `viz:` in einem `java-steps`-Block (siehe [Java Schritt für Schritt](java.md)): Er zeichnet eine Array-Variable als Säulen und Indexvariablen als Zeiger, aus den Variablenwerten des jeweiligen Schritts.

````
```java-steps
title: Binärsuche
viz: a (lo, hi, mid)
java:
...
step: - | 4 | Das mittlere Element betrachten. | a=[2, 5, 8, 12, 16, 23]; lo=0; hi=5
```
````

`viz: a (lo, hi, mid)` heißt: Zeichne das Array `a` und markiere die Positionen, die `lo`, `hi` und `mid` enthalten. Zellen, deren Wert sich gegenüber dem Vorschritt geändert hat, sind orange. Die Werte stammen aus den `step:`-Zeilen; bei von Hand geschriebenen Schritten ist das Bild also genau so richtig wie die Zahlen, die du tippst.

```java-steps
title: Binärsuche nach 16
viz: a (lo, hi, mid)
java:
int binarySearch(int[] a, int ziel) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == ziel) return mid;
        if (a[mid] < ziel) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
step: - | 2 | Der Suchbereich ist das ganze Array. | a=[2, 5, 8, 12, 16, 23]; ziel=16
step: - | 3 | `lo <= hi`: Gibt es noch etwas zu durchsuchen? | a=[2, 5, 8, 12, 16, 23]; ziel=16; lo=0; hi=5
step: - | 4 | Das mittlere Element betrachten. | a=[2, 5, 8, 12, 16, 23]; ziel=16; lo=0; hi=5
step: - | 5 | `a[2] = 8` ist nicht 16. | a=[2, 5, 8, 12, 16, 23]; ziel=16; lo=0; hi=5; mid=2
step: - | 6 | `8 < 16`: Die untere Grenze rückt nach. | a=[2, 5, 8, 12, 16, 23]; ziel=16; lo=0; hi=5; mid=2
step: - | 3 | Es gibt noch etwas zu durchsuchen. | a=[2, 5, 8, 12, 16, 23]; ziel=16; lo=3; hi=5
step: - | 4 | Neue Mitte: `(3 + 5) / 2 = 4`. | a=[2, 5, 8, 12, 16, 23]; ziel=16; lo=3; hi=5
step: - | 5 | `a[4] = 16`: gefunden, Rückgabe `4`. | a=[2, 5, 8, 12, 16, 23]; ziel=16; lo=3; hi=5; mid=4
```
