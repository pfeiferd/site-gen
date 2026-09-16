title=Images
navorder=03
~~~~~~

# Embedding images

[TOC]

_Images are referenced simply by their name – where the file actually lives is decided by a cascade._


<div class="nextpage"></div>

## Inserting an image

You embed an image with the Markdown notation "exclamation mark, alternative text in square brackets, file name in round brackets". The bare file name is enough:

```
![An example image](beispiel.svg)
```

Result:

![An example image](beispiel.svg)


<div class="nextpage"></div>

## Size and alignment

For a little more control – a fixed width, say – you can also use plain HTML with the class `content-img`:

```
<img class="content-img" src="beispiel.svg" alt="An example image" style="max-width:320px">
```

Result:

<img class="content-img" src="beispiel.svg" alt="An example image" style="max-width:320px">


<div class="nextpage"></div>

## Where the image files live

You always reference an image just by its file name. Where it is really stored follows from a cascade (from general to specific). What is named later wins when file names are equal:

| Location                              | applies to                                |
|---------------------------------------|-------------------------------------------|
| `content/images/`                     | the entire website                        |
| `content/<lecture>/common/images/`    | all languages of this lecture             |
| `content/<lecture>/de/images/`        | the German version only                   |
| `content/<lecture>/en/images/`        | the English version only                  |

The example image above lives at `content/common/images/beispiel.svg` and is therefore available in both languages.


<div class="nextpage"></div>

## Language-specific images

The trick of the cascade: a language-specific image overrides the shared one **without the reference in the text changing**. If a diagram contains German labels, for example, you place

- the German version at `de/images/schema.svg` and
- the English one at `en/images/schema.svg`

both under the same name `schema.svg`. In the text you only ever write `schema.svg`, and depending on the language the matching file appears automatically.

## Image gallery

Several images can be shown as a **gallery**: a grid of thumbnails with captions.
Clicking a thumbnail opens it in the full view.

```gallery
beispiel.svg  | An example image
feather.svg   | The icon of this lecture
hhn-logo.png  | The university's logo
favicon.png   | The site's favicon
```

You write it as a code block with the language `gallery` – one image per line,
followed by `|` and the caption (which may be left out). The file names follow the
same rule as everywhere else, an `images/` prefix is not needed.

The size of the tiles is set by two optional lines inside the block: `width: 220`
sets the width in pixels (default 150), `ratio: 16/9` the aspect ratio (default
4/3). The image is **fitted** into the tile and never cropped – so portrait and
landscape images still stand side by side at the same height.
