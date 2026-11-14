title=SQL
navorder=10
~~~~~~

# SQL im Browser

[TOC]

_Interaktive SQL-Übungen: Die Lesenden schreiben Anfragen gegen eine Beispieldatenbank und sehen das Ergebnis sofort – ohne Server und ohne Installation._

Dahinter steckt [PGlite](https://pglite.dev), ein vollständiges PostgreSQL als WebAssembly, das im Browser der Lesenden läuft. Geladen wird es nur, wo es gebraucht wird: Seiten ohne SQL-Block laden gar nichts davon. Seiten mit SQL-Block laden zunächst nur ein kleines Steuerskript; die Datenbank selbst (gut 4 MB) folgt erst, wenn jemand in einen SQL-Editor klickt.

## Eine Datenbank anlegen

Ein Codeblock mit der Sprache `sql-db` enthält das Skript, das die Datenbank aufbaut – also `CREATE TABLE` und `INSERT`:

````
```sql-db
CREATE TABLE studierende (
  matrnr  INTEGER PRIMARY KEY,
  name    VARCHAR(40) NOT NULL,
  ort     VARCHAR(40)
);
INSERT INTO studierende VALUES
  (1001, 'Anna',  'Stuttgart'),
  (1002, 'Ben',   'Heidelberg'),
  …
```
````

Auf der Seite erscheint das Skript als aufklappbares Listing, damit die Lesenden Tabellen und Daten nachschlagen können:

```sql-db
CREATE TABLE studierende (
  matrnr  INTEGER PRIMARY KEY,
  name    VARCHAR(40) NOT NULL,
  ort     VARCHAR(40)
);
CREATE TABLE kurse (
  kursnr  INTEGER PRIMARY KEY,
  titel   VARCHAR(60) NOT NULL,
  ects    INTEGER NOT NULL
);
CREATE TABLE belegungen (
  matrnr  INTEGER REFERENCES studierende,
  kursnr  INTEGER REFERENCES kurse,
  note    NUMERIC(2,1),
  PRIMARY KEY (matrnr, kursnr)
);
INSERT INTO studierende VALUES
  (1001, 'Anna',  'Stuttgart'),
  (1002, 'Ben',   'Heidelberg'),
  (1003, 'Clara', 'Stuttgart'),
  (1004, 'David', 'Ulm'),
  (1005, 'Emil',  NULL);
INSERT INTO kurse VALUES
  (1, 'Datenbanken', 5),
  (2, 'Programmieren', 8),
  (3, 'Statistik', 5);
INSERT INTO belegungen VALUES
  (1001, 1, 1.3), (1001, 2, 2.0), (1002, 1, 2.7),
  (1003, 1, 1.0), (1003, 3, 1.7), (1004, 2, NULL);
```

## Anfragen ausprobieren

Ein Block mit der Sprache `sql-query` wird zum Editor. Sein Inhalt ist die Startanfrage:

````
```sql-query
SELECT * FROM studierende;
```
````

Ergebnis – einfach auf „Ausführen“ klicken oder im Editor <kbd>Strg</kbd>+<kbd>Enter</kbd> drücken:

```sql-query
SELECT * FROM studierende;
```

Fehler meldet PostgreSQL im Klartext, etwa bei einem Tippfehler im Tabellennamen. Nach 200 Zeilen wird die Ausgabe gekürzt.

## Aufgaben mit Musterlösung

Nach einer Zeile `solution:` folgt eine Musterlösung. Dann vergleicht der Block jedes Ergebnis mit dem der Lösung und bietet „Lösung zeigen“ an. Mit `title:` bekommt der Block eine Überschrift:

````
```sql-query
title: Aufgabe 1 – Alle Studierenden aus Stuttgart, alphabetisch
SELECT name FROM studierende;
solution:
SELECT name FROM studierende WHERE ort = 'Stuttgart' ORDER BY name;
```
````

Ergebnis:

```sql-query
title: Aufgabe 1 – Alle Studierenden aus Stuttgart, alphabetisch
SELECT name FROM studierende;
solution:
SELECT name FROM studierende WHERE ort = 'Stuttgart' ORDER BY name;
```

Die Startanfrage darf auch leer sein:

```sql-query
title: Aufgabe 2 – Durchschnittsnote je Kurstitel (nur Kurse mit Noten)
solution:
SELECT k.titel, AVG(b.note)
FROM kurse k JOIN belegungen b ON b.kursnr = k.kursnr
WHERE b.note IS NOT NULL
GROUP BY k.titel;
```

So wird verglichen:

- Verglichen wird jeweils die **letzte Ergebnistabelle** der Anfrage mit der der Musterlösung.
- Die **Spaltenzahl** und die **Zeilen** müssen übereinstimmen, die Spaltennamen nicht – `AVG(note) AS schnitt` ist also ebenso richtig.
- Die **Reihenfolge** zählt nur, wenn die Musterlösung mit `ORDER BY` endet. Stimmen die Zeilen, aber nicht ihre Reihenfolge, sagt die Rückmeldung das dazu.
- Zahlen werden numerisch verglichen: `2`, `2.0` und `2.0000` sind gleich.

## Daten ändern

Auch `INSERT`, `UPDATE`, `DELETE` und sogar `CREATE TABLE` sind erlaubt. Jede Ausführung läuft in einer eigenen Transaktion, die danach zurückgerollt wird. Die Änderung wirkt also innerhalb derselben Ausführung, danach ist die Datenbank wieder im Ausgangszustand – für diesen und alle anderen Blöcke der Seite:

```sql-query
UPDATE belegungen SET note = 1.0 WHERE matrnr = 1002;
SELECT s.name, b.kursnr, b.note
FROM studierende s JOIN belegungen b ON b.matrnr = s.matrnr
WHERE s.matrnr = 1002;
```

## Mehrere Datenbanken

Mit `name:` in der ersten Zeile bekommt eine Datenbank einen Namen, `db:` wählt sie in einem Editor aus. Ohne Angabe gilt die unbenannte Standard-Datenbank. Mehrere `sql-db`-Blöcke mit gleichem Namen werden in ihrer Reihenfolge aneinandergehängt – so lässt sich ein Schema Schritt für Schritt erklären.

````
```sql-db
name: lager
show: none
CREATE TABLE artikel (nr INTEGER, bestand INTEGER);
INSERT INTO artikel VALUES (1, 12), (2, 0), (3, 5);
```

```sql-query
db: lager
SELECT * FROM artikel WHERE bestand = 0;
```
````

`show: none` versteckt das Skript ganz, `show: open` zeigt es aufgeklappt. Ergebnis (das Skript bleibt hier unsichtbar):

```sql-db
name: lager
show: none
CREATE TABLE artikel (nr INTEGER, bestand INTEGER);
INSERT INTO artikel VALUES (1, 12), (2, 0), (3, 5);
```

```sql-query
db: lager
SELECT * FROM artikel WHERE bestand = 0;
```

## Aufbau

| Block / Kopfzeile | Bedeutung |
|-------------------|-----------|
| ` ```sql-db ` | Skript, das eine Datenbank aufbaut; erscheint als aufklappbares Listing |
| `name: …` | Name der Datenbank (freiwillig, vor dem Skript) |
| `show: open` / `show: none` | Listing aufgeklappt zeigen bzw. ganz verstecken |
| ` ```sql-query ` | Editor; der Inhalt ist die Startanfrage |
| `db: …` | zu verwendende Datenbank (freiwillig, vor der Anfrage) |
| `title: …` | Überschrift des Editors (freiwillig, vor der Anfrage) |
| `solution:` | eigene Zeile; danach folgt die Musterlösung |

## Hinweise

- Es läuft **PostgreSQL**. Standard-SQL funktioniert wie erwartet; Fehlermeldungen kommen im Original von PostgreSQL, also auf Englisch.
- SQL-Blöcke brauchen einen **Webserver**; über `file://` laden Browser keine WebAssembly-Module. Lokal genügt `python3 -m http.server` im Ordner `target/website`. Wer die Seite trotzdem als Datei öffnet, bekommt im Block einen entsprechenden Hinweis.
- Der erste Start braucht je nach Verbindung einige Sekunden. Danach liegt PGlite im Browser-Cache. Der Webserver sollte `.wasm`- und `.data`-Dateien komprimiert ausliefern (bei Apache etwa per `mod_deflate`); dann sind es gut 4 statt 16 MB.
- Eine Anfrage, die nie endet (etwa ein riesiges Kreuzprodukt), blockiert den Browser-Tab der Lesenden, bis sie ihn neu laden. Andere Lesende betrifft das nicht.
- Wie beim Quiz steht die Musterlösung im Seitenquelltext – die Blöcke dienen der **Selbstkontrolle**.
- Die Beschriftungen folgen der Sprache der Seite. Eine Site kann sie über UI-Strings mit dem Präfix `sql.` ändern, etwa `sql.run` oder `sql.ok`.
