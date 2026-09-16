# Lecture Notes – Heilbronn University, Faculty of Computer Science

A static, bilingual (DE/EN) website for lecture notes, generated with
[JBake](https://jbake.org/). Each lecture consists of Markdown files that can be shown
either as a **document** (continuous text) or as a **slide deck**. PlantUML diagrams and
LaTeX formulas are typeset locally – without any external services.

> **Authoring content?** How to *write* a lecture (Markdown, images, diagrams, formulas)
> is demonstrated by the lecture **"Tutorial: Authoring a Lecture"** included in the project,
> using live examples. This README describes the **technical and configurational** aspects
> of the system.

## Table of contents

- [Requirements](#requirements)
- [Building and viewing](#building-and-viewing)
- [A content repository of its own](#a-content-repository-of-its-own)
- [Project layout](#project-layout)
- [The build pipeline](#the-build-pipeline)
- [Configuration](#configuration)
  - [Location of the content folder (`content.dir`)](#location-of-the-content-folder-contentdir)
  - [Site-wide metadata (`content/meta.properties`)](#site-wide-metadata-contentmetaproperties)
  - [Lectures and the meta.properties cascade](#lectures-and-the-metaproperties-cascade)
    - [One lecture without a lecture folder](#one-lecture-without-a-lecture-folder)
  - [Visibility: `publish`](#visibility-publish)
  - [Document-only lectures (`documentOnly`)](#document-only-lectures-documentonly)
  - [Header controls (`showViewSwitch`, `showFullscreen`, `showHeaderToggle`)](#header-controls-showviewswitch-showfullscreen-showheadertoggle)
  - [Internationalization (i18n)](#internationalization-i18n)
  - [Interface state in the URL](#interface-state-in-the-url)
  - [Images](#images)
    - [Image gallery (`gallery` blocks)](#image-gallery-gallery-blocks)
  - [Site-specific styles (`content/style.css`)](#site-specific-styles-contentstylecss)
  - [Automatic values (date, copyright)](#automatic-values-date-copyright)
  - [Enabling LaTeX/formulas (`math`)](#enabling-latexformulas-math)
  - [Maps (`map` blocks)](#maps-map-blocks)
  - [Smooth scrolling](#smooth-scrolling)
  - [Syntax highlighting](#syntax-highlighting)
- [License](#license)

## Requirements

- **JDK 17** or newer
- **Maven 3.8+**

All further dependencies (JBake, PlantUML, MathJax) are provided via Maven or bundled
locally – **no** Graphviz and **no** internet connection are required at runtime.

## Building and viewing

```bash
mvn clean package
```

The result is placed in `target/website/`. To view it, start a local web server
(relative paths do not work over `file://`):

```bash
cd target/website && python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## A content repository of its own

Engine and content can live in separate repositories: this project brings `pom.xml`, `src/`,
`templates/`, `assets/` and `jbake.properties`, the other one only its `content/` folder. Two
ways to build such a repo, and they can be used side by side:

**In CI (GitHub Actions).** Copy `content-repo.github-workflow.yml` from this repository into
the content repo as `.github/workflows/pages.yml` and check the `env:` block – `ENGINE_REPO`
(where this engine lives), `ENGINE_REF` (pin it to a tag for reproducible builds) and
`CONTENT_DIR`. The workflow checks out both repositories, builds with `-Dcontent.dir` pointing
at the content repo and `-Dsite.dir` at a folder of its own, and publishes that as GitHub
Pages. Two things are set once in the content repo: **Settings > Pages > Source: GitHub
Actions**, and – only if this engine repository is private – a token with read access for the
second checkout step.

Note the difference to this project’s own `.github/workflows/pages.yml`: that one builds
**this** repository – engine plus the tutorial – and publishes it as the engine’s demo site.

The two `*.gitlab-ci.yml` files do the same on a GitLab instance and are kept for projects that
still live there.

**Locally.** A small `pom.xml` in the content repo can drive the engine, so that `mvn package`
works there as usual: an `exec` execution runs `mvn -f <engine>/pom.xml package
-Dcontent.dir=<here>/content -Dsite.dir=<here>/target/website`. Keep the engine directory
configurable (`-Dengine.dir=…`) and clear `target/website` before the run, since JBake does
not wipe its output. The site of the *Deutsche Borreliose-Gesellschaft* is built that way.

Whichever route: everything the pages load must be **committed**. Assets added later – a
bundled library, marker images, a `content/data/*.json` – are new files, and `git commit -a`
does not pick those up. They are the usual reason why something works locally and stays empty
on Pages.

## Project layout

```
content/                     source content (Markdown, images, configuration)
  meta.properties            site-wide metadata (lecturer, university, faculty …)
  site_de/en.properties      interface texts (menu, buttons …) per language
  index.md, search.md        landing page (unpublished here, see below) and search
  images/                    site-wide images (logo, favicon …)
  data/                      data sets for the browser (e.g. map pins, *.json)
  common/images/             images shared by all languages of the lecture
  de/  en/                   one folder per language of the lecture
    meta.properties          lectureTitle per language
    index.md                 entry topic (lowest navorder) – serves /de/ and /en/
    *.md                     the further topics (slides)
    images/                  language-specific images (optional)
  <lecture>/                 further lectures keep a folder of their own:
    meta.properties          lecture metadata (icon, slug …)
    common/images/
    de/  en/                 … same structure as above
templates/                   FreeMarker templates (header, page, footer)
assets/                      generic UI files (CSS, JS, UI icons)
  js/tex-svg.js              locally bundled MathJax (formula typesetting)
  js/highlight.min.js        locally bundled highlight.js (syntax highlighting)
  css/highlight.css          colour scheme for syntax highlighting
  js/lunr.min.js             full-text search
  js/leaflet.js, css/leaflet.css   locally bundled Leaflet (maps)
src/main/java/de/hshn/lectures/build/   the build tools (see below)
jbake.properties             JBake configuration
pom.xml                      Maven build
.github/workflows/pages.yml  pipeline of THIS repo (engine + tutorial → GitHub Pages)
content-repo.github-workflow.yml   template for a content repo (copy it there as
                             .github/workflows/pages.yml)
.gitlab-ci.yml, content-repo.gitlab-ci.yml    the same two for a GitLab instance
target/website/              generated website (build output)
```

**Core principle:** `assets/` holds exclusively *generic* building blocks (CSS, JS, UI
icons). Everything **content-related** – texts, translations, images, the university logo
and the favicon – lives under `content/` and is copied into place during the build.

## The build pipeline

The build runs in the Maven `package` phase. First the shade plugin produces an executable
JAR containing the build tools, then the exec plugin runs their entry point, and finally
JBake bakes the website. The tools (package `de.hshn.lectures.build`) run **before** JBake
and partly write directly into `target/website/` – JBake does not wipe its output directory,
so these files survive the bake.

| Tool | Purpose |
|------|---------|
| `PlantumlPreprocessor` | Entry point; renders `` ```plantuml `` blocks and `*.puml` files to SVGs under `target/website/images/plantuml/` using the Graphviz-free **Smetana** layout. Unchanged diagrams are skipped via SHA-256. Then invokes `MetaMerge`, `ImageCascade` and `IndexRedirects`. |
| `MetaMerge` | Merges the `meta.properties` cascade into each `.md`'s front matter and writes the result to `target/staged-content/` (JBake's actual source folder). Evaluates `publish`, fills in a missing `date`, builds the i18n tables. |
| `ImageCascade` | Materializes images according to the cascade (see below) into `target/website/`. |
| `IndexRedirects` | Writes the `index.html` files for folder URLs – `/<lecture>/<lang>/`, `/<lecture>/`, and the site root when no start page is baked – so that they land on the lecture's entry topic instead of a "Not Found". Where one entry point serves several languages, the redirect keeps the reader's chosen language (`meta refresh` to the primary language without JavaScript). Nothing is written where the entry topic is itself called `index.md`: the real page already sits there. |
| `DataBundle` | Publishes `content/data/*.json` as `data/*.js` (`window.MAPDATA`), so that maps and other data-driven pages work without a runtime fetch (and therefore under `file://` too). |
| `TextIO` | UTF-8-tolerant reading (with an ISO-8859-1 fallback), so that accented characters in configuration and content files never break the build. |

## Configuration

### Location of the content folder (`content.dir`)

The location of the source content folder is centrally configurable via a Maven property in
`pom.xml` and is passed as an argument to the build tools:

```xml
<properties>
    <content.dir>${project.basedir}/content</content.dir>
</properties>
```

Override it without editing `pom.xml`:

```bash
mvn clean package -Dcontent.dir=/path/to/my/content
```

A second property decides where the finished site goes:

```bash
mvn clean package -Dcontent.dir=/path/to/my/content -Dsite.dir=/path/to/my/target/website
```

`site.dir` defaults to `target/website` of *this* project. A content project that drives the
engine sets it to a directory of its own – otherwise its site would overwrite the one the
engine builds from its own content. Staging (`target/staged-content`) and the build tools’
scratch files deliberately stay in the engine’s `target/`, because JBake resolves its source
folder relative to the engine project.

The exec plugin passes three paths to the `main` method: the content dir, the Maven build
directory (`${project.build.directory}`, usually `target`) and the site dir.

### Site-wide metadata (`content/meta.properties`)

These values are merged into **every** page and are available in the templates as
`content.<key>`. An empty `*Url` makes the corresponding name or logo render as plain text
without a hyperlink. All values are UTF-8 capable.

| Key | Meaning |
|-----|---------|
| `lecturerName`, `lecturerUrl`, `lecturerUrlEn` | lecturer's name in the footer + (language-dependent) link |
| `universityName`, `universityNameEn` | university name (footer) |
| `universityUrl`, `universityUrlEn` | target of the logo in the top left |
| `universityLogo`, `universityLogoEn` | logo file (in `content/images/`) per language |
| `facultyName`, `facultyNameEn` | faculty name; a `|` marks the line-break point in the logo (→ `<br>`) |
| `facultyUrl`, `facultyUrlEn` | target of the faculty name |
| `footerOrg` | one organisation in the footer instead of the lecturer – faculty, university chain. Printed verbatim, so the closing full stop (“… e.V.”) belongs into the value. |
| `siteTitle` | what closes the browser tab’s title, after page and lecture name (default: `universityName`). A site named like its single lecture drops the duplicate lecture part. |
| `mapTiles`, `mapAttribution` | tile server and credit for all maps of the site (see [Maps](#maps-map-blocks)) |

External links automatically open in a new tab (`target="_blank"`).

### Lectures and the meta.properties cascade

Recurring metadata is not repeated in every `.md` but stored in `meta.properties` files.
During the build, a page's front matter results from the cascade (increasing precedence):

1. `content/meta.properties` (site-wide)
2. `content/<lecture>/meta.properties` (e.g. `navgroup=docs`, `lecture=<slug>`, `lectureIcon=…`)
3. `content/<lecture>/<lang>/meta.properties` (`lectureTitle` per language)
4. the `.md`'s own front matter (wins)

The **language** is derived from the folder name (`de`/`en`) and does not need to be
maintained. A topic page therefore only needs `title` and `navorder` in its front matter.

#### One lecture without a lecture folder

A site that carries a single lecture can drop the `<lecture>` level and put `de/`, `en/` and
`common/` **directly under `content/`** – the demo content in this repository is laid out that
way. The pages are then served from `/de/…` and `/en/…` instead of `/<lecture>/de/…`, and the
middle step of the cascade collapses into the site-wide file:

```
content/
  meta.properties            site-wide metadata + navgroup, lecture, lectureIcon
  common/images/
  de/  en/
    meta.properties          lectureTitle per language
    index.md                 entry topic – serves /de/ and /en/ directly
    *.md                     the further topics
```

Everything else stays as it is – the image cascade, the folder redirects, sidebar, search and
the `[LECTURES]` tiles all work the same. Four things are worth knowing:

- `navgroup`, `lecture` and `lectureIcon` now sit in the **site-wide** `meta.properties`, so they
  reach every page. That is harmless for `index.md` and `search.md` (their own `navgroup` in the
  front matter wins) and for further lectures in their own folder (they override `lecture` and
  `lectureIcon`), but keys meant for one lecture only are better placed in `de/meta.properties`
  and `en/meta.properties` – that is where the demo keeps its `show…` flags. Site-wide they would
  also apply to the search page and to any lecture added later in its own folder.
- **Name the entry topic `index.md`.** Then `/de/` and `/en/` serve that page directly instead of
  a redirect, and the topic keeps its place in the sidebar like any other. Its `navorder` still
  decides the order – the file name does not.
- **The site root.** With a published `content/index.md` the tile page stays the landing page.
  Unpublishing it (`publish=false` in its front matter, as in this repository) makes
  `IndexRedirects` write `/index.html` as a redirect into the lecture instead: a static page with
  `<meta http-equiv="refresh">`, whose script picks `de/` or `en/` by the reader's language. The
  **Start** button in the header then also leads back into the lecture, since it points at `/`.
  Note that the `[LECTURES]` tiles go away with the start page – further lectures are then only
  reachable by search or a direct link.
- Both layouts can be mixed: a lecture at the content root and further ones in their own folders
  next to it.

### Visibility: `publish`

The `publish` attribute (default `true`) controls whether a page is generated. `publish=false`
can appear in a `.md`'s front matter **or** in a `meta.properties` at any level; a `false` at a
higher level overrides the lower ones. An unpublished page appears neither in the output nor in
the menu/sidebar.

```properties
# content/<lecture>/meta.properties – hides the whole lecture
publish=false
```

The start page is subject to the same rule: `publish=false` in `content/index.md` leaves the
site without a baked `index.html`, which is what turns the site root into a redirect into the
lecture – see [One lecture without a lecture folder](#one-lecture-without-a-lecture-folder).
That is how this repository is configured.

### Document-only lectures (`documentOnly`)

Every lecture page can be shown either as a continuous **document** or as a **slide deck**, and a
switch in the header toggles between the two. Setting `documentOnly=true` in a lecture's
`meta.properties` removes that switch: the lecture is then available **only** in the document view –
for both on-screen display and printing (the slide-per-page print layout is never used). The default
is `false`.

```properties
# content/<lecture>/meta.properties – no Slides view, document view only
documentOnly=true
```

### Header controls (`showViewSwitch`, `showFullscreen`, `showHeaderToggle`)

Three controls of the header can be switched off individually. All three default to `true`;
only the literal value `false` hides the control. Like every other metadata key they follow the
cascade: in `content/meta.properties` they apply to the **whole site**, in a lecture's
`content/<lecture>/meta.properties` only to that lecture (and a single `.md`'s front matter can
still override them for one page).

| Key | Hides |
|-----|-------|
| `showViewSwitch` | the Document/Slides switch in the top right |
| `showFullscreen` | the fullscreen button in the top right |
| `showHeaderToggle` | the arrow in the top left that collapses/expands the header |

```properties
# content/meta.properties – site-wide, or in content/<lecture>/meta.properties per lecture
showViewSwitch=false
showFullscreen=false
showHeaderToggle=false
```

Notes:

- `showViewSwitch=false` removes only the **control**; the page keeps whatever view is currently
  stored (or is requested via `?view=doc` / `?view=slides`), and the slide navigation keeps
  working in the slide view. Use [`documentOnly=true`](#document-only-lectures-documentonly) if a
  lecture should really be document-only – that hides the switch **and** pins the document view
  (including for printing).
- `showHeaderToggle=false` also means the header can no longer be collapsed: a stored or
  URL-supplied collapsed state (`?hd=c`) is ignored, so the header cannot get stuck in a state
  with no way back.
- The night-mode button, the language switch, the search field and the sidebar toggle are not
  affected; they stay available.

### Internationalization (i18n)

The interface can be switched independently of the content language (DE/EN, top right).
Translations live as properties files under `content/` (never under `assets/`):

| File | Content |
|------|---------|
| `content/site_de.properties`, `content/site_en.properties` | site-wide interface texts (menu, buttons, footer) |
| `content/<name>_de.properties`, `content/<name>_en.properties` | page-specific texts (e.g. `index_en.properties`) |
| `content/search_de.properties`, `content/search_en.properties` | search texts |

`MetaMerge` bundles these into a `window.I18N = { de: …, en: … }` table; `assets/js/i18n.js`
uses it to swap texts, titles and (language-dependent) links in the browser. If a translation
is missing, the German source value remains – so **switching to EN always works**, even for
lectures without English pages (the content then falls back to the available language).

The **German** table works the same way: a key in `site_de.properties` overrides the wording
built into the templates, so a site can rename interface terms without touching them. A site
about something other than lectures renames the sidebar heading like this:

```properties
# content/site_de.properties        # content/site_en.properties
sidebar.lecture=Menü              # sidebar.lecture=Menu
sidebar.topics=Seitenmenü         # sidebar.topics=Site menu
```

Keys that are not listed keep the template wording, so a partial file is fine.

### Interface state in the URL

Everything the reader switches is kept in the address, not only in the browser’s storage, and
is appended to every internal link (`assets/js/i18n.js`) so that it survives navigation:

| Parameter | Meaning |
|-----------|---------|
| `lang` | interface language, `de` or `en` |
| `sb` | sidebar, `e` (expanded) or `c` (collapsed) |
| `hd` | header, `e` or `c` – only where the header toggle exists |
| `view` | `doc` or `slides` – only on lecture pages that have both |
| `theme` | `light` or `dark` |

The rule is the same for all of them: the **URL parameter wins**, then the stored choice, then
the default. The script in the page head applies them before the first paint, so nothing
flickers, and each storage access is guarded on its own – where site data is blocked (private
window, `file://`) a `?theme=dark` still works instead of the page falling back to light.

`theme` is the one exception to always being appended: it travels only once the reader has
actually chosen an appearance (a click, or `?theme=` in the address). Without that choice the
system setting keeps deciding, and a single internal click does not silently pin it.

### Images

In the text, images are referenced by their file name only (`![alt](example.svg)`); an
`images/` prefix is **not** required – if a directory is missing, `page.ftl` adds `images/`
automatically during the build. `ImageCascade` resolves the actual location via a cascade
(later entries override earlier ones for equal names):

1. `content/images/` – site-wide
2. `content/<lecture>/common/images/` – all languages of the lecture
3. `content/<lecture>/<lang>/images/` – language-specific

For a lecture [without a lecture folder](#one-lecture-without-a-lecture-folder) the same
cascade applies one level up (`content/common/images/`, `content/<lang>/images/`).

In addition, `content/images/` is copied verbatim into the output root
`target/website/images/`. That is where site-wide, institution-specific content such as the
**logo** (`hhn-logo.png`, `hhn-logo-en.png`) and the **favicon** live – deliberately under
`content/`, not under `assets/`.

#### Image gallery (`gallery` blocks)

Several images – screenshots, for instance – can be shown as a grid of thumbnails with
captions instead of one below the other. It is written as a fenced code block with the
language `gallery` (the same idea as `` ```plantuml `` and `` ```math ``):

````markdown
```gallery
width: 200
ratio: 16/9
login.png     | Logging in
overview.png  | The overview screen
detail.png
```
````

- **One image per line**; everything after the `|` becomes the caption. Leave the `|` out and
  the image gets no caption.
- File names go through the **same cascade** as every other image – an `images/` prefix is not
  needed, and a language-specific file silently replaces the shared one.
- **Size:** an optional `width: <pixels>` line sets the thumbnail width for that gallery
  (default 150), and `ratio: <w/h>` the tile’s aspect ratio (default `4/3`; `16:9` and `16/9`
  are both accepted, as is a plain number such as `1`). Values that are not well formed are
  ignored, so a typo falls back to the defaults instead of producing broken CSS. The defaults
  themselves live in `style.css` as `--gallery-width` and `--gallery-ratio`.
- All thumbnails of one gallery share that tile format, and the image is **fitted, never
  cropped** – so mixed portrait and landscape images still line up and the captions stay on one
  baseline. For a gallery of 16:9 screenshots, `ratio: 16/9` removes the empty bands above and
  below them.
- Clicking a thumbnail opens the **lightbox** that every content image uses. There is therefore
  no second, full-resolution copy of the file to maintain – but the thumbnail *is* the original
  scaled down by the browser, so very large images are worth shrinking before adding them.

### Site-specific styles (`content/style.css`)

`assets/css/style.css` belongs to the engine and is shared by every site built with it. A site
that needs to deviate – a larger logo caption, its own accent colour – puts a `style.css` next
to its `meta.properties`:

```css
/* content/style.css */
.logo-sub { font-size: 0.95rem; }
```

It is published as `css/site.css` and linked **after** the engine’s stylesheet, so its rules
win without `!important`. Prefer redefining the colour variables from `:root` over restyling
single elements – they carry through to night mode and print automatically. The file is
optional; where a site does not bring one, an empty `css/site.css` is written so that the
templates can link it unconditionally.

### Automatic values (date, copyright)

- `date` may be omitted from the front matter and is then derived from the file's last
  modification time.
- The copyright year and "last modified on …" in the footer are determined from the build date.

### Enabling LaTeX/formulas (`math`)

Formula typesetting is only loaded on pages that request it – via `math=true` in the front
matter. It uses the **locally bundled** MathJax (`assets/js/tex-svg.js`, SVG output → no
external fonts, no CDN). The delimiters are `$…$` (inline) and `$$…$$` (displayed); in addition,
`` ```math `` code blocks are turned into displayed formulas. `$` delimiters are used on
purpose instead of `\(…\)`, because the latter would be destroyed by the Markdown parser.

### Maps (`map` blocks)

A map with pins is written as a fenced code block with the language `map` – the lines with a
colon configure it, every other line is one pin:

````markdown
```map
height: 340
49.1469, 9.2166 | Bildungscampus | Bildungscampus 13; 74076 Heilbronn | https://www.hs-heilbronn.de
49.1225, 9.2108 | Campus Sontheim | Max-Planck-Straße 39; 74081 Heilbronn
```
````

A pin line is `latitude, longitude | title | line; line; … | link`; only the two coordinates
(decimal degrees) are required. Without `center`/`zoom` the map picks the section so that all
pins fit.

| Line | Meaning |
|------|---------|
| `height: 340` | height in pixels (default 380) |
| `center: 49.1, 9.2` | fixed centre instead of the automatic section |
| `zoom: 12` | zoom level (0 = world, 19 = house number) |
| `data: name` | pins from `content/data/name.json` |
| `tiles: …` | a different tile server (default: OpenStreetMap) |
| `attribution: …` | credit for the map material |
| `filter: field \| Label \| English label` | drop-down over one field of the entries |
| `search: placeholder \| English placeholder` | text box searching the whole text of an entry |
| `list: true` | list of matches below the map, headed "Results:" |

The three last lines build a **filter bar**: the drop-down is filled from the
values actually present in the data (no second list to maintain in the Markdown),
the text box matches title, subtitle and every line – postcode and town
included – and the list below the map jumps to a pin when clicked. A counter
shows how many of the entries are visible, and everything filters in the browser,
with the map re-fitting to what is left.

The bar follows the **interface language**: the English label goes after the second
bar in the block, an entry may carry `<field>_en` next to `<field>` to translate the
drop-down’s values, and "All", "Reset" and "Results:" come from `map.all`,
`map.reset`, `map.results` in the language files. Filtering always runs on the base
field, so switching language relabels the bar without disturbing the selection.

**Longer lists** – an address register, say – belong in `content/data/<name>.json` rather than in
the prose. Required per entry are `lat` and `lon`; `title`, `subtitle`, `lines[]`, `href` and
`hrefText` are optional:

```json
[
  { "lat": 49.1469, "lon": 9.2166, "title": "Bildungscampus",
    "subtitle": "Hochschule Heilbronn",
    "lines": ["Bildungscampus 13", "74076 Heilbronn"],
    "href": "https://www.hs-heilbronn.de", "hrefText": "hs-heilbronn.de" }
]
```

`DataBundle` turns each such file into `data/<name>.js` (`window.MAPDATA["<name>"] = …`), which
the page includes as a script. Nothing is fetched at runtime, so a map also works when the site
is opened through `file://` – the same reasoning as for the search index. Pins written in the
block and pins from `data:` add up.

Three things are worth knowing:

- **One tile server for the whole site:** `mapTiles` and `mapAttribution` in
  `content/meta.properties` set the default for every map, so the address does
  not have to be repeated per block; `tiles:`/`attribution:` in a block still win
  over it.
- The **map material** is loaded from a tile server *while reading* (OpenStreetMap by default).
  Unlike formulas and diagrams, a map is therefore **not** self-contained: without a network it
  stays empty, and the tile server learns the reader’s IP address – worth a line in a privacy
  statement. `tiles:` points the map at a different (or self-hosted) server.
- **Leaflet** is bundled locally (`assets/js/leaflet.js`, `assets/css/leaflet.css`, marker images
  in `assets/css/images/`) and is loaded only on pages that actually contain a map.
- The **mouse wheel** zooms only with Ctrl/Cmd held down; otherwise scrolling through the page
  would get caught in the map.

The lecture "Tutorial: Authoring a Lecture" has a page *Karten/Maps* with both variants live.

### Smooth scrolling

Links to a target on the same page (the `[TOC]`, heading anchors) scroll there smoothly rather
than jumping; `scroll-padding-top` keeps the target clear of the sticky header. Readers who
have asked their system for reduced motion (`prefers-reduced-motion`) get the instant jump.

### Syntax highlighting

Code blocks with a language tag (`` ```java ``, `` ```sql ``, `` ```python ``, etc.) are
highlighted in colour. This uses [highlight.js](https://highlightjs.org/), **bundled locally**
(`assets/js/highlight.min.js`, common languages incl. Java/SQL/Python; no CDN), with the colour
scheme in `assets/css/highlight.css`. Only blocks **with** a language tag are colourized on the
client; blocks without a language stay untouched (handy for verbatim examples). No configuration
is needed – the language tag in the Markdown is enough.

## License

This project is licensed under the **Apache License, Version 2.0**. The full license text is
in the [`LICENSE`](LICENSE) file.

```
Copyright 2026 Daniel Pfeifer, Heilbronn University

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
```

The bundled MathJax (`assets/js/tex-svg.js`), highlight.js and lunr.js are themselves licensed
under the Apache-2.0 / BSD / MIT licenses of their respective projects.
