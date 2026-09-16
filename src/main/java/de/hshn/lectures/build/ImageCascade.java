package de.hshn.lectures.build;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Materialises per-language image folders for the JBake site by resolving image
 * file names through a cascade.
 *
 * <p>For a page in language {@code <lang>} of a lecture {@code <lecture>} an
 * image referenced by (relative) name is resolved lowest → highest precedence
 * from:</p>
 * <ol>
 *   <li>{@code content/images/} — site-wide images</li>
 *   <li>{@code content/<lecture>/common/images/} — images shared by all
 *       languages of the lecture</li>
 *   <li>{@code content/<lecture>/<lang>/images/} — language-specific images</li>
 * </ol>
 *
 * <p>A single-lecture site may drop the {@code <lecture>} level and put
 * {@code de/}, {@code en/} and {@code common/} directly under {@code content/};
 * the cascade then works the same way, one directory level up, and materialises
 * into {@code <output>/<lang>/images/}.</p>
 *
 * <p>An optional {@code content/style.css} is published as
 * {@code <output>/css/site.css} – the site's own layer on top of the engine's
 * stylesheet, for wording-independent tweaks (logo size, colours). The file is
 * always written, empty if the content does not bring one, so the templates can
 * link it unconditionally.</p>
 *
 * <p>Alongside the images, {@code content/files/} is published verbatim to
 * {@code <output>/files/} – the place for downloads that are not images
 * (PDFs, slides, data sets). Pages link them as {@code files/<name>}; the
 * templates prepend the path back to the site root.</p>
 *
 * <p>In addition, {@code content/images/} is published verbatim to the output
 * root {@code <output>/images/} so site-wide, non-lecture content (the university
 * logo, favicon, …) can be referenced from any page via
 * {@code ${rootpath}images/<name>} — these are institution-specific content and
 * therefore live under {@code content/}, not {@code assets/}.</p>
 *
 * <p>The merged set is written to {@code <output>/<lecture>/<lang>/images/} so
 * that JBake publishes it and a page at {@code <lecture>/<lang>/<page>.html}
 * can reference an image simply as {@code images/<name>} (resolved relative to
 * the page). Higher-precedence sources overwrite equally named files of lower
 * precedence, implementing the cascade.</p>
 *
 * <p>Run from {@link PlantumlPreprocessor#main(String[])} during the Maven
 * {@code package} phase, before JBake. JBake does not wipe its output directory,
 * so the images written here into {@code target/website} survive the bake and the
 * project's {@code assets/} folder stays free of content-derived files.</p>
 */
public final class ImageCascade {

    /** Languages recognised as content variants (in addition to {@code common}). */
    private static final List<String> LANGS = List.of("de", "en");

    /** Name of the images sub-directory at every cascade level. */
    private static final String IMAGES = "images";

    /** Downloads that are not images; published verbatim to {@code <output>/files/}. */
    private static final String FILES = "files";

    /** Data sets for the browser; published by {@link DataBundle}. */
    private static final String DATA_DIR = "data";

    private final Path contentDir;
    private final Path outputDir;
    private int copied;

    /**
     * @param contentDir the source content directory (contains {@code images/} and
     *                   the per-lecture folders).
     * @param outputDir  the generated site directory to publish the images INTO
     *                   (e.g. {@code target/website}); keeps images out of {@code assets/}.
     */
    public ImageCascade(Path contentDir, Path outputDir) {
        this.contentDir = contentDir.toAbsolutePath().normalize();
        this.outputDir = outputDir.toAbsolutePath().normalize();
    }

    public static void main(String[] args) throws Exception {
        Path contentDir = Path.of(args.length > 0 ? args[0] : "content");
        Path out = Path.of(args.length > 1 ? args[1] : "target/website");
        new ImageCascade(contentDir, out).run();
    }

    /** Materialises the per-language image folders for every lecture. */
    public void run() throws IOException {
        if (!Files.isDirectory(contentDir)) {
            return;
        }
        Path globalImages = contentDir.resolve(IMAGES);

        // Site-wide content images (e.g. university logo, favicon) are published to
        // the output root images/ so every page can reference them via
        // ${rootpath}images/<name>. These are HHN-specific content, hence they live
        // under content/images and NOT under assets/ (which holds only generic UI icons).
        copyTree(globalImages, outputDir.resolve(IMAGES));

        // Downloads (PDFs & Co.) unveraendert nach <output>/files/ - sie gehoeren
        // zum Inhalt, sind aber keine Bilder und durchlaufen keine Kaskade.
        copyTree(contentDir.resolve(FILES), outputDir.resolve(FILES));

        // Site-eigene Stilschicht. Wird immer geschrieben (notfalls leer), damit
        // die Templates sie ohne Existenzpruefung einbinden koennen.
        Path siteCss = outputDir.resolve("css").resolve("site.css");
        Files.createDirectories(siteCss.getParent());
        Path ownCss = contentDir.resolve("style.css");
        if (Files.isRegularFile(ownCss)) {
            Files.copy(ownCss, siteCss, StandardCopyOption.REPLACE_EXISTING);
            copied++;
        } else {
            Files.writeString(siteCss, "/* Diese Site bringt keine eigene style.css mit. */\n");
        }

        // Flache Struktur: die einzige Vorlesung liegt direkt in content/ (de/, en/,
        // common/ ohne Zwischenebene) -> die Bilder gehoeren nach <output>/<lang>/.
        materialise(contentDir, outputDir, globalImages);

        try (Stream<Path> children = Files.list(contentDir)) {
            for (Path lecture : children.filter(Files::isDirectory).sorted().toList()) {
                String slug = lecture.getFileName().toString();
                if (slug.equals(IMAGES) || slug.equals(FILES) || slug.equals(DATA_DIR) || slug.equals("common") || LANGS.contains(slug)) {
                    continue; // site-wide images, or parts of a lecture in the flat layout
                }
                materialise(lecture, outputDir.resolve(slug), globalImages);
            }
        }
        System.out.println("[images] cascade materialised into site output: " + copied
                + " file(s) → <output>/[<lecture>/]<lang>/images");
    }

    /**
     * Applies the cascade for one lecture: {@code lectureDir} holds the language
     * folders, {@code outBase} is where its pages end up in the output (the site
     * root for a lecture that lives directly under {@code content/}).
     */
    private void materialise(Path lectureDir, Path outBase, Path globalImages) throws IOException {
        Path commonImages = lectureDir.resolve("common").resolve(IMAGES);
        for (String lang : LANGS) {
            Path langDir = lectureDir.resolve(lang);
            if (!Files.isDirectory(langDir)) {
                continue; // this language does not exist for the lecture
            }
            Path target = outBase.resolve(lang).resolve(IMAGES);
            // The target is fully generated: clear it so removed sources
            // do not linger, then apply the cascade in precedence order.
            deleteRecursive(target);
            copyTree(globalImages, target);              // 1) site-wide
            copyTree(commonImages, target);              // 2) lecture-common
            copyTree(langDir.resolve(IMAGES), target);   // 3) language-specific
        }
    }

    /** Copies every regular file below {@code src} into {@code dstRoot}, overwriting. */
    private void copyTree(Path src, Path dstRoot) throws IOException {
        if (!Files.isDirectory(src)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(src)) {
            for (Path file : walk.filter(Files::isRegularFile).sorted().toList()) {
                Path dst = dstRoot.resolve(src.relativize(file).toString());
                Files.createDirectories(dst.getParent());
                Files.copy(file, dst, StandardCopyOption.REPLACE_EXISTING);
                copied++;
            }
        }
    }

    /** Recursively deletes {@code dir} if it exists (deepest entries first). */
    private void deleteRecursive(Path dir) throws IOException {
        if (!Files.exists(dir)) {
            return;
        }
        try (Stream<Path> walk = Files.walk(dir)) {
            for (Path p : walk.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(p);
            }
        }
    }
}
