title=Introduction
navorder=01
~~~~~~

# Tutorial: Authoring a Lecture

[TOC]

_How to write a lecture with this system – step by step._


<div class="nextpage"></div>

## What this is

This tutorial is itself a lecture. It shows, by live example, how to write content: text and structure, images, PlantUML diagrams and mathematical formulas in LaTeX. All purely technical and configurational aspects – project layout, build, configuration files – are deliberately kept in the project's `README.md`.

A lecture consists of several **topics**, the entries in the sidebar on the left. Each topic is a single Markdown file. The page you are reading is the file `content/en/index.md`.


<div class="nextpage"></div>

## Two views: document and slides

Use the switch at the top right to toggle between **Document** and **Slides**:

- **Document:** all slides flow one below another – ideal for reading and reference.
- **Slides:** one slide per screen, navigable with the arrow keys or the buttons below – ideal for presenting.

You write the content only **once**; both views are produced from it automatically. Try it right here on this page.

Sometimes, though, a paragraph should appear in only one of the two views – for instance a more detailed explanation only in the document, or a terse bullet point only on the slide. To do this, mark the enclosing block with the class `doc-only` or `slides-only`:

```
<div class="doc-only">This text only appears in the document view.</div>
<div class="slides-only">This text only appears in the slides view.</div>
```

<div class="doc-only">This paragraph is marked with <code>doc-only</code> – so you only see it when <strong>Document</strong> is selected at the top right.</div>
<div class="slides-only">This paragraph is marked with <code>slides-only</code> – so you only see it when <strong>Slides</strong> is selected at the top right.</div>


<div class="nextpage"></div>

## Starting a new slide

You separate slides with a single marker on its own line:

```
<div class="nextpage"></div>
```

Everything before the first marker forms the first slide, and each further marker begins the next one. It is exactly this marker that splits the present page into individual slides.


<div class="nextpage"></div>

## Title, headings and numbering

Every file starts with a small header and the separator `~~~~~~`, after which the actual content follows:

    title=Introduction
    navorder=01
    ~~~~~~

`title` is the displayed page title, `navorder` determines the order in the sidebar. The first heading (`#`) is the page's main heading and stays unnumbered; all further headings (`##`, `###`) are **numbered automatically** on lecture pages – you can see it from the numbers in front of these sections.


<div class="nextpage"></div>

## Showing and hiding pages

Sometimes a topic should not be visible yet – for instance because it is still being written. That is what the `publish` attribute is for. If you add

    publish=false

to a file's header, the page appears neither in the finished result nor in the sidebar. The default is `true`, so omitting the attribute means the page is visible.

The same attribute also works in a `meta.properties` and then applies to the whole level: `publish=false` in a lecture's `meta.properties` hides the **entire** lecture. A `false` higher up overrides a `true` further down – so you can hide a whole lecture with a single line.


<div class="nextpage"></div>

## A table of contents

If you write the marker

```
[TOC]
```

on its own line, a table of contents is generated automatically from all following headings – just like at the top of this page.


<div class="nextpage"></div>

## Where to go next

The remaining topics of this lecture cover, in order:

- **Markdown** – text, lists, tables, links and code.
- **Images** – embedding images and managing them per language.
- **Diagrams** – creating diagrams with PlantUML straight from the text.
- **Formulas** – typesetting mathematical formulas in LaTeX.

Use the sidebar on the left to move on to the next topic.
