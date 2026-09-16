title=Maps
navorder=06
~~~~~~

# Maps

[TOC]

## Adding a map

A map is written as a code block with the language `map`. The lines with a colon
configure the map, every other line is one pin:

```map
height: 340
49.1469, 9.2166 | Bildungscampus | Bildungscampus 13; 74076 Heilbronn
49.1225, 9.2108 | Campus Sontheim | Max-Planck-Straße 39; 74081 Heilbronn
```

A pin line reads

```
latitude, longitude | title | line; line; … | link
```

Title, lines and link are optional – only the two coordinates are required.
Without `center` and `zoom` the map picks the section itself so that all pins
are visible.

## Settings

| Line | Meaning |
|------|---------|
| `height: 340` | height of the map in pixels (default 380) |
| `center: 49.1, 9.2` | fixed centre instead of the automatic section |
| `zoom: 12` | zoom level (0 = world, 19 = house number) |
| `data: name` | pins from `content/data/name.json` |
| `tiles: …` | a tile server of your own instead of OpenStreetMap |
| `attribution: …` | credit for the map material |

## Many pins: a data file

Pins that do not belong in the prose – an address register, say – are better
kept in `content/data/<name>.json`. The map picks them up with `data: <name>`:

```map
height: 360
data: hochschulorte
filter: ort | Standort | Location
search: Name oder Ort | Name or town
list: true
```

The three extra lines build a **filter bar** above the map:

| Line | Effect |
|------|--------|
| `filter: ort \| Standort \| Location` | drop-down over the `ort` field of the entries. Its values come from the data – there is no second list to maintain in the Markdown. The English label follows after the second bar. |
| `search: Name oder Ort \| Name or town` | text box; it matches the title, the subtitle and every line of an entry, so postcode and town are covered |
| `list: true` | list of matches below the map, headed "Results:"; clicking a name jumps to that pin |

**Both languages:** the English wording goes after the second bar; without it the
German one is used for both. The **values** of the drop-down can be translated as
well – give an entry an `ort_en` next to its `ort`. Filtering always runs on the
base field, so a language switch leaves the selection untouched and only relabels
it. "All", "Reset" and "Results:" come from the site's language files
(`map.all`, `map.reset`, `map.results`).

On the right of the bar a counter shows how many entries are currently visible,
next to a button that clears the filter. Everything filters in the browser, and
the map re-fits its section to whatever is left.

The file itself is a list of objects. `lat` and `lon` are required, everything
else is optional:
 
```json
[
  {
    "lat": 49.1469, "lon": 9.2166,
    "title": "Bildungscampus",
    "subtitle": "Heilbronn University",
    "lines": ["Bildungscampus 13", "74076 Heilbronn"],
    "ort": "Heilbronn",
    "href": "https://www.hs-heilbronn.de", "hrefText": "hs-heilbronn.de"
  }
]
```

Fields beyond the documented ones – `ort` above – are kept and can be used by
`filter:`. During the build the file becomes `data/<name>.js` and is included in
the document, so **nothing is fetched at runtime**: the map also works when you
open the page straight from the file system. Both sources can be combined: pins
in the block **and** `data:` add up.

## What you should know

- The **map material** is loaded from a tile server while the page is read.
  Which one is set as `mapTiles`/`mapAttribution` in `content/meta.properties`
  and then applies to every map of the site – this one uses the German OSM
  association's server. Without that entry it would be `tile.openstreetmap.org`,
  and `tiles:` in a block beats both. Unlike formulas and diagrams a map is therefore
  not fully contained in the project: without a network it stays empty, and the
  server learns the readers' IP address. On a site with a privacy statement that
  is worth a line.
- The **library** (Leaflet) is bundled locally like MathJax and highlight.js and
  is loaded only on pages that contain a map.
- The **mouse wheel** zooms only with Ctrl or Cmd held down – otherwise
  scrolling through the page would get caught in the map.
- Coordinates are decimal degrees (`49.1469, 9.2166`), not degrees and minutes.
