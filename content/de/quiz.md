title=Quiz
navorder=09
math=true
~~~~~~

# Quiz zur Selbstkontrolle

[TOC]

_Kurze Fragen mit Auswahlantworten, die die Lesenden direkt im Browser prüfen können – etwa am Ende eines Kapitels._

## Ein Quiz einfügen

Ein Quiz schreibst Du als Codeblock mit der Sprache `quiz`:

````
```quiz
title: Kurzer Test
? Welche Cluster-Distanz neigt zu langen „Ketten“?
- [ ] Complete Linkage
- [x] Single Linkage
- [ ] Group Average
> Bei Single Linkage zählt nur die kleinste Punktdistanz zweier Cluster.

? Welche Aussagen über $k$-Means stimmen?
- [x] Das Ergebnis hängt von der Initialisierung ab.
- [x] Die Clusterzahl $k$ muss vorgegeben werden.
- [ ] Es findet beliebig geformte Cluster.
> $k$-Means bevorzugt kugelförmige Cluster ähnlicher Größe.
```
````

Ergebnis:

```quiz
title: Kurzer Test
? Welche Cluster-Distanz neigt zu langen „Ketten“?
- [ ] Complete Linkage
- [x] Single Linkage
- [ ] Group Average
> Bei Single Linkage zählt nur die kleinste Punktdistanz zweier Cluster.

? Welche Aussagen über $k$-Means stimmen?
- [x] Das Ergebnis hängt von der Initialisierung ab.
- [x] Die Clusterzahl $k$ muss vorgegeben werden.
- [ ] Es findet beliebig geformte Cluster.
> $k$-Means bevorzugt kugelförmige Cluster ähnlicher Größe.
```

## Aufbau

| Zeile | Bedeutung |
|-------|-----------|
| `title: …` | Überschrift des Quiz (freiwillig, vor der ersten Frage) |
| `? …` | beginnt eine neue Frage; Folgezeilen ohne Präfix verlängern den Fragetext |
| `- [x] …` | richtige Antwortoption |
| `- [ ] …` | falsche Antwortoption |
| `> …` | Erklärung, die nach dem Prüfen erscheint |
| `= …` | akzeptierte Antwort einer Eingabefrage (statt Optionen; siehe unten) |

- Ist **eine** Option richtig, wählt man per Radiobutton genau eine Antwort; sind **mehrere** richtig, gibt es Checkboxen und den Hinweis „mehrere Antworten möglich“.
- Nach „Prüfen“ sind richtige Optionen grün, falsch gewählte rot und übersehene richtige grün gestrichelt umrandet. „Nochmal“ setzt die Frage zurück.
- `**fett**` und `` `code` `` werden ausgewertet, Formeln in `$…$` setzt MathJax (dafür `math=true` im Frontmatter der Seite).
- Die Beschriftungen folgen der eingestellten Sprache (Deutsch/Englisch). Eine Site kann sie über ihre UI-Strings `quiz.check`, `quiz.retry`, `quiz.correct`, `quiz.wrong`, `quiz.partial`, `quiz.none` und `quiz.multi` ändern.

## Eingabefragen: Zahlen, Brüche, kurze Texte

Statt Optionen kann eine Frage auch eine **Eingabe** verlangen. Dann nennen `=`-Zeilen die akzeptierten Antworten:

````
```quiz
title: Rechnen mit Wahrscheinlichkeiten
? Ein fairer Würfel wird einmal geworfen. Wie groß ist $p(X \leq 3)$?
= 1/2
> Drei von sechs gleich wahrscheinlichen Augenzahlen: $3/6 = 1/2$.

? Berechnen Sie $H(2,3) = -\tfrac{2}{5}\log_2\tfrac{2}{5} - \tfrac{3}{5}\log_2\tfrac{3}{5}$ auf drei Nachkommastellen.
= 0,971 ± 0,001
> $H(2,3) \approx 0{,}971$ – vgl. das Wetterbeispiel bei den Entscheidungsbäumen.

? Wie heißt die Cluster-Distanz, bei der die beiden **nächstgelegenen** Punkte zweier Cluster zählen?
= Single Linkage | Single-Linkage
> Bei Complete Linkage zählen dagegen die am weitesten entfernten Punkte.
```
````

Ergebnis:

```quiz
title: Rechnen mit Wahrscheinlichkeiten
? Ein fairer Würfel wird einmal geworfen. Wie groß ist $p(X \leq 3)$?
= 1/2
> Drei von sechs gleich wahrscheinlichen Augenzahlen: $3/6 = 1/2$.

? Berechnen Sie $H(2,3) = -\tfrac{2}{5}\log_2\tfrac{2}{5} - \tfrac{3}{5}\log_2\tfrac{3}{5}$ auf drei Nachkommastellen.
= 0,971 ± 0,001
> $H(2,3) \approx 0{,}971$ – vgl. das Wetterbeispiel bei den Entscheidungsbäumen.

? Wie heißt die Cluster-Distanz, bei der die beiden **nächstgelegenen** Punkte zweier Cluster zählen?
= Single Linkage | Single-Linkage
> Bei Complete Linkage zählen dagegen die am weitesten entfernten Punkte.
```

So wird verglichen:

- **Zahlen und Brüche** werden numerisch verglichen: Auf `= 1/2` passen `1/2`, `2/4`, `0,5`, `0.5` und `.5`. Erlaubt sind ganze Zahlen, Dezimalzahlen mit Komma oder Punkt und Brüche `a/b`, jeweils auch negativ.
- **Toleranz:** `= 0,971 ± 0,001` (oder `+-`) akzeptiert alles zwischen 0,970 und 0,972. Ohne Toleranz muss der Wert exakt stimmen.
- **Text** wird ohne Rücksicht auf Groß-/Kleinschreibung und mehrfache Leerzeichen verglichen.
- **Mehrere richtige Antworten:** mehrere `=`-Zeilen oder `a | b` in einer Zeile.
- Nach einer falschen Eingabe nennt die Rückmeldung die (erste) richtige Antwort; „Prüfen“ geht auch mit der Eingabetaste.

### Text-Eingaben

Auch kurze Wörter oder Begriffe lassen sich abfragen. Weil der Vergleich wörtlich ist (nur Groß-/Kleinschreibung und Leerzeichen spielen keine Rolle), nennst Du am besten alle üblichen Schreibweisen – mit `|` in einer Zeile oder in mehreren `=`-Zeilen:

````
```quiz
title: Kurze Text-Antworten
? Wie heißt die Landeshauptstadt von Baden-Württemberg?
= Stuttgart

? Welches Zeichen leitet in Markdown eine Überschrift ein?
= #
> Je mehr `#`, desto tiefer die Ebene: `##` ist eine Zwischenüberschrift.

? In welcher Stadt steht das Heidelberger Schloss?
= Heidelberg

? Wie heißt das Ensemble-Verfahren, das Modelle auf Bootstrap-Stichproben trainiert und deren Vorhersagen kombiniert?
= Bagging | Bootstrap Aggregating
= Bootstrap-Aggregating | Bootstrap Aggregation
> „Bagging“ ist die Kurzform von **B**ootstrap **Agg**regat**ing**.
```
````

Ergebnis:

```quiz
title: Kurze Text-Antworten
? Wie heißt die Landeshauptstadt von Baden-Württemberg?
= Stuttgart

? Welches Zeichen leitet in Markdown eine Überschrift ein?
= #
> Je mehr `#`, desto tiefer die Ebene: `##` ist eine Zwischenüberschrift.

? In welcher Stadt steht das Heidelberger Schloss?
= Heidelberg

? Wie heißt das Ensemble-Verfahren, das Modelle auf Bootstrap-Stichproben trainiert und deren Vorhersagen kombiniert?
= Bagging | Bootstrap Aggregating
= Bootstrap-Aggregating | Bootstrap Aggregation
> „Bagging“ ist die Kurzform von **B**ootstrap **Agg**regat**ing**.
```

Tipps für Text-Antworten:

- `stuttgart`, `STUTTGART` und ` Stuttgart ` gelten alle als richtig; Tippfehler oder Umschreibungen dagegen nicht. Frage deshalb möglichst nach **einem eindeutigen Begriff**.
- Varianten mit und ohne Bindestrich oder Umlaut (`Ü`/`Ue`) musst Du einzeln aufführen.
- Die Rückmeldung nach einer falschen Eingabe nennt die **erste** Schreibweise – schreibe die gebräuchlichste also nach vorn.

Das Quiz dient der **Selbstkontrolle**: Die richtigen Antworten stehen im Seitenquelltext. Für bewertete Tests ist eine Lernplattform wie ILIAS der richtige Ort.
