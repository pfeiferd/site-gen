title=References
navorder=07
bibliography=literatur.bib
~~~~~~

# References from BibTeX

[TOC]

_You keep your references in a `.bib` file, just as in LaTeX. In the text you cite by key – numbering, formatting and the reference list are produced automatically when the site is built._


<div class="nextpage"></div>

## Turning references on

A page names its BibTeX file in its header with `bibliography=`:

    title=References
    navorder=07
    bibliography=literatur.bib
    ~~~~~~

The file is looked up next to the page first, then in the parent folders up to `content/`. That way a whole lecture can share one file – for example under `content/<lecture>/literatur.bib` – and set `bibliography=` once in its `meta.properties`. Separate several files with commas.


<div class="nextpage"></div>

## Citing

A citation is the entry's key, preceded by `@`, in square brackets. `[@knuth1984]` turns into: [@knuth1984]. Separate several sources with a semicolon – `[@lamport1994; @bishop2006]` gives [@lamport1994; @bishop2006].

Every citation links to its entry in the reference list. The build numbers the sources in the order in which they are first cited on the page. Accents in LaTeX notation such as `S{\'e}rgio` are converted [@moro2014], links and DOIs become clickable [@csl].

An unknown key such as `[@doesnotexist]` does not break the build: it stays in place, highlighted ([@doesnotexist]), and the console prints a warning.


<div class="nextpage"></div>

## Reference list

A line containing only `[BIB]` becomes the reference list. It lists exactly the sources cited on the page – not the whole `.bib` file. You write the heading above it yourself, so it also shows up in the table of contents:

    ## References

    [BIB]

The list for this page is at the very bottom.

Inside code blocks and inline `code`, `[@key]` and `[BIB]` stay untouched – just like in the examples on this page.


<div class="nextpage"></div>

## Citation style

The default is the numeric **IEEE** style. Choose another one with `citationStyle=` – like `bibliography=`, in a page's header or in a `meta.properties`:

| Value | Style |
|-------|-------|
| `ieee` | IEEE, numeric: [1] (default) |
| `springer-vancouver-brackets` | Springer Vancouver, numeric: [1] |
| `din-1505-2-numeric` | DIN 1505-2, numeric: [1] |
| `din-1505-2` | DIN 1505-2, author-date: (Knuth, 1984) |
| `apa` | APA, author-date: (Knuth, 1984) |

Alternatively, point to a style file of your own, e.g. `citationStyle=my-style.csl`. It is looked up like the `.bib` file. Thousands of ready-made styles are available in the [CSL style repository](https://www.zotero.org/styles). The language (German or English) – e.g. "Available at" or "and" – follows the page automatically.


<div class="nextpage"></div>

## References

[BIB]
