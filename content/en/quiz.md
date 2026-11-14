title=Quiz
navorder=09
math=true
~~~~~~

# Self-check quiz

[TOC]

_Short multiple-choice questions that readers can check right in the browser – for example at the end of a chapter._

## Adding a quiz

Write a quiz as a code block with the language `quiz`:

````
```quiz
title: Short test
? Which cluster distance tends to form long "chains"?
- [ ] Complete linkage
- [x] Single linkage
- [ ] Group average
> With single linkage only the smallest point distance between two clusters counts.

? Which statements about $k$-means are true?
- [x] The result depends on the initialization.
- [x] The number of clusters $k$ must be given.
- [ ] It finds clusters of arbitrary shape.
> $k$-means prefers spherical clusters of similar size.
```
````

Result:

```quiz
title: Short test
? Which cluster distance tends to form long "chains"?
- [ ] Complete linkage
- [x] Single linkage
- [ ] Group average
> With single linkage only the smallest point distance between two clusters counts.

? Which statements about $k$-means are true?
- [x] The result depends on the initialization.
- [x] The number of clusters $k$ must be given.
- [ ] It finds clusters of arbitrary shape.
> $k$-means prefers spherical clusters of similar size.
```

## Structure

| Line | Meaning |
|------|---------|
| `title: …` | heading of the quiz (optional, before the first question) |
| `? …` | starts a new question; following lines without prefix extend the question text |
| `- [x] …` | correct option |
| `- [ ] …` | wrong option |
| `> …` | explanation shown after checking |
| `= …` | accepted answer of an input question (instead of options; see below) |

- If **one** option is correct, readers pick exactly one answer (radio buttons); if **several** are correct, there are check boxes and the hint "several answers possible".
- After "Check", correct options turn green, wrongly chosen ones red, and missed correct ones get a dashed green border. "Try again" resets the question.
- `**bold**` and `` `code` `` are rendered, formulas in `$…$` are typeset by MathJax (requires `math=true` in the page's front matter).
- The labels follow the selected language (German/English). A site can change them via its UI strings `quiz.check`, `quiz.retry`, `quiz.correct`, `quiz.wrong`, `quiz.partial`, `quiz.none` and `quiz.multi`.

## Input questions: numbers, fractions, short texts

Instead of options, a question can ask for an **input**. `=` lines then give the accepted answers:

````
```quiz
title: Computing with probabilities
? A fair die is rolled once. What is $p(X \leq 3)$?
= 1/2
> Three out of six equally likely faces: $3/6 = 1/2$.

? Compute $H(2,3) = -\tfrac{2}{5}\log_2\tfrac{2}{5} - \tfrac{3}{5}\log_2\tfrac{3}{5}$ to three decimal places.
= 0.971 ± 0.001
> $H(2,3) \approx 0.971$ – see the weather example for decision trees.

? What is the cluster distance called where the two **closest** points of two clusters count?
= single linkage | single-linkage
> With complete linkage, by contrast, the points furthest apart count.
```
````

Result:

```quiz
title: Computing with probabilities
? A fair die is rolled once. What is $p(X \leq 3)$?
= 1/2
> Three out of six equally likely faces: $3/6 = 1/2$.

? Compute $H(2,3) = -\tfrac{2}{5}\log_2\tfrac{2}{5} - \tfrac{3}{5}\log_2\tfrac{3}{5}$ to three decimal places.
= 0.971 ± 0.001
> $H(2,3) \approx 0.971$ – see the weather example for decision trees.

? What is the cluster distance called where the two **closest** points of two clusters count?
= single linkage | single-linkage
> With complete linkage, by contrast, the points furthest apart count.
```

How answers are compared:

- **Numbers and fractions** are compared numerically: `= 1/2` matches `1/2`, `2/4`, `0.5`, `0,5` and `.5`. Integers, decimals with point or comma and fractions `a/b` are allowed, also negative.
- **Tolerance:** `= 0.971 ± 0.001` (or `+-`) accepts anything between 0.970 and 0.972. Without a tolerance the value must match exactly.
- **Text** is compared ignoring case and repeated spaces.
- **Several correct answers:** several `=` lines or `a | b` in one line.
- After a wrong input the feedback names the (first) correct answer; "Check" also works with the Enter key.

### Text input

Short words or terms can be asked for as well. Since the comparison is literal (only case and spaces are ignored), it is best to list all common spellings – with `|` in one line or in several `=` lines:

````
```quiz
title: Short text answers
? What is the capital of the German state of Baden-Württemberg?
= Stuttgart

? Which character starts a heading in Markdown?
= #
> The more `#`, the deeper the level: `##` is a subheading.

? In which city is Heidelberg Castle?
= Heidelberg

? What is the ensemble method called that trains models on bootstrap samples and combines their predictions?
= bagging | bootstrap aggregating
= bootstrap-aggregating | bootstrap aggregation
> "Bagging" is short for **b**ootstrap **agg**regat**ing**.
```
````

Result:

```quiz
title: Short text answers
? What is the capital of the German state of Baden-Württemberg?
= Stuttgart

? Which character starts a heading in Markdown?
= #
> The more `#`, the deeper the level: `##` is a subheading.

? In which city is Heidelberg Castle?
= Heidelberg

? What is the ensemble method called that trains models on bootstrap samples and combines their predictions?
= bagging | bootstrap aggregating
= bootstrap-aggregating | bootstrap aggregation
> "Bagging" is short for **b**ootstrap **agg**regat**ing**.
```

Tips for text answers:

- `stuttgart`, `STUTTGART` and ` Stuttgart ` all count as correct; typos or paraphrases do not. So preferably ask for **one unambiguous term**.
- Variants with and without hyphen or umlaut (`ü`/`ue`) must be listed individually.
- After a wrong input the feedback names the **first** spelling – so put the most common one first.

The quiz is meant for **self-checking**: the correct answers are in the page source. Graded tests belong on a learning platform such as ILIAS.
