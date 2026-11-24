title=Java Schritt für Schritt
navorder=11
~~~~~~

# Java Schritt für Schritt

[TOC]

_Einen Algorithmus Zeile für Zeile durchgehen: Java und Pseudocode nebeneinander, die aktuellen Zeilen hervorgehoben, dazu Erklärung und Variablenwerte zu jedem Schritt._

Der `java-steps`-Block braucht keine zusätzliche Bibliothek: Den Code färbt das mitgelieferte highlight.js ein, und ein kleines Skript (`js/javasteps.js`, nur auf Seiten mit so einem Block geladen) hebt die Zeilen des aktuellen Schritts hervor. Im Folienmodus steuern die **Pfeiltasten** zuerst die Schritte des Codes auf der aktuellen Folie und wechseln erst danach zur nächsten Folie.

## Einen Block schreiben

````
```java-steps
title: Lineare Suche
pseudo:
LinearSearch(A, ziel)
  for i = 0 to length(A) - 1
    if A[i] = ziel
      return i
  return -1
java:
int linearSearch(int[] a, int ziel) {
    for (int i = 0; i < a.length; i++) {
        …
step: 1 | 1 | Der Aufruf beginnt. | a=[4, 8, 15, 16]; ziel=15
step: 2 | 2 | Die Schleife startet mit `i = 0`. | i=0
```
````

- `title:` ist optional und steht ganz oben.
- `pseudo:` (optional) und `java:` leiten die beiden Code-Abschnitte ein. Der Code wird so angezeigt, wie er dasteht (samt Einrückung), bis zum nächsten Abschnitt oder zum ersten `step:`. Ohne `pseudo:` erscheint nur der Java-Code.
- `step: P | J | Erklärung | Variablen` ist ein Schritt. `P` und `J` sind die hervorzuhebenden Zeilen im Pseudocode und im Java-Code (ab 1 gezählt): `2`, `2,3` oder `2-4`; leer heißt keine. In der Erklärung funktionieren `**fett**` und `` `code` ``.
- `Variablen` ist optional: `name=wert`-Paare, durch `;` getrennt. Werte, die sich gegenüber dem Vorschritt geändert haben, werden markiert.

<div class="nextpage"></div>

## Beispiel: Lineare Suche

```java-steps
title: Lineare Suche nach 15 in [4, 8, 15, 16]
pseudo:
LinearSearch(A, ziel)
  for i = 0 to length(A) - 1
    if A[i] = ziel
      return i
  return -1
java:
int linearSearch(int[] a, int ziel) {
    for (int i = 0; i < a.length; i++) {
        if (a[i] == ziel) {
            return i;
        }
    }
    return -1;
}
step: 1 | 1 | Die Methode wird mit dem Array `a` und dem gesuchten Wert aufgerufen. | a=[4, 8, 15, 16]; ziel=15
step: 2 | 2 | Die Schleife beginnt beim ersten Index, `i = 0`. | i=0
step: 3 | 3 | Vergleiche `a[0] = 4` mit `ziel = 15`: nicht gleich, die Schleife läuft weiter. | i=0; a[i]=4
step: 2 | 2 | Nächster Index: `i = 1`. | i=1
step: 3 | 3 | Auch `a[1] = 8` ist nicht 15. | i=1; a[i]=8
step: 2 | 2 | Nächster Index: `i = 2`. | i=2
step: 3 | 3 | `a[2] = 15` ist gleich `ziel`: die Bedingung ist wahr. | i=2; a[i]=15
step: 4 | 4 | **Gefunden:** Die Methode gibt den Index `2` zurück. | i=2; ergebnis=2
```

<div class="nextpage"></div>

## Beispiel: Binäre Suche

```java-steps
title: Binäre Suche nach 16 im sortierten Array [2, 5, 8, 12, 16, 23]
pseudo:
BinarySearch(A, ziel)
  lo = 0; hi = length(A) - 1
  while lo <= hi
    mid = floor((lo + hi) / 2)
    if A[mid] = ziel: return mid
    if A[mid] < ziel: lo = mid + 1
    else: hi = mid - 1
  return -1
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
step: 2 | 2 | Der Suchbereich ist das ganze Array. | lo=0; hi=5
step: 3 | 3 | `lo <= hi`: Es gibt noch etwas zu durchsuchen. | lo=0; hi=5
step: 4 | 4 | Das mittlere Element betrachten. | lo=0; hi=5; mid=2
step: 5 | 5 | `a[2] = 8` ist nicht 16. | lo=0; hi=5; mid=2
step: 6 | 6 | `8 < 16`: Der gesuchte Wert liegt rechts, also rückt die untere Grenze nach. | lo=3; hi=5; mid=2
step: 3 | 3 | `3 <= 5`: Der Bereich ist nicht leer. | lo=3; hi=5; mid=2
step: 4 | 4 | Neue Mitte: `(3 + 5) / 2 = 4`. | lo=3; hi=5; mid=4
step: 5 | 5 | `a[4] = 16` ist der gesuchte Wert: **gefunden**, Rückgabe `4`. | lo=3; hi=5; mid=4; ergebnis=4
```
