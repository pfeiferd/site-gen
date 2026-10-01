package de.hshn.lectures.build;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Copies {@code assets/} to a staging folder and removes source comments from the
 * engine's own stylesheets on the way. JBake then publishes the staged copy (see
 * {@code asset.folder} in {@code jbake.properties}), so the sources keep their
 * documentation while visitors download the short form.
 *
 * <p>Only the files listed in {@link #OWN} are touched, and only stylesheets.
 * Everything else is copied byte for byte:
 *
 * <ul>
 *   <li><b>Imported libraries</b> (Leaflet, lunr, highlight.js, MathJax) are none of
 *       our business - they are already minified and carry licence headers.</li>
 *   <li><b>Scripts</b> are left alone on purpose. Telling a comment from a regular
 *       expression needs a real JavaScript scanner, and the three scripts of our own
 *       hold about 4 KiB of comments after compression - not worth that machinery.
 *       Their comments simply ship.</li>
 *   <li><b>New files of our own</b> ship with their comments until someone adds them
 *       to the list, so forgetting one costs bytes, never correctness.</li>
 * </ul>
 *
 * <p>CSS is safe to scan with a few lines: a comment can only hide inside a string,
 * and there is no construct like a regular-expression literal to confuse it with.
 *
 * <p>The same scanner serves a site's own {@code content/style.css}, which
 * {@link ImageCascade} publishes as {@code css/site.css} - so content repositories
 * are covered automatically, without a setting of their own.
 */
final class AssetStrip {

    /** Stylesheets written by this project; everything else is copied unchanged. */
    private static final Set<String> OWN = Set.of(
            "css/style.css",
            "css/fonts.css");

    private final Path assetsDir;
    private final Path outputDir;

    private int strippedCount;
    private long savedBytes;

    AssetStrip(Path assetsDir, Path outputDir) {
        this.assetsDir = assetsDir;
        this.outputDir = outputDir;
    }

    void run() throws IOException {
        if (!Files.isDirectory(assetsDir)) {
            System.out.println("[assets] no assets/ directory at " + assetsDir + " - nothing to do");
            return;
        }

        // A stale staging folder would keep files that no longer exist in assets/.
        if (Files.exists(outputDir)) {
            deleteTree(outputDir);
        }
        Files.createDirectories(outputDir);

        try (Stream<Path> files = Files.walk(assetsDir)) {
            for (Path file : files.filter(Files::isRegularFile).sorted().toList()) {
                copy(file);
            }
        }

        System.out.println("[assets] staged → " + outputDir + ": "
                + strippedCount + " stylesheet(s) stripped, " + savedBytes / 1024 + " KiB saved");
    }

    private void copy(Path file) throws IOException {
        String relative = assetsDir.relativize(file).toString().replace('\\', '/');
        Path target = outputDir.resolve(relative);
        Files.createDirectories(target.getParent());

        if (!OWN.contains(relative)) {
            Files.copy(file, target, StandardCopyOption.REPLACE_EXISTING);
            return;
        }

        String source = Files.readString(file, StandardCharsets.UTF_8);
        Files.writeString(target, stripStylesheet(source), StandardCharsets.UTF_8);

        long before = Files.size(file);
        long after = Files.size(target);
        if (after < before) {
            strippedCount++;
            savedBytes += before - after;
        }
    }

    /**
     * Strips a stylesheet for publishing: comments out, blank lines tidied. Also used
     * by {@link ImageCascade} for a site's own {@code content/style.css}, so every
     * content repository gets the same treatment without doing anything.
     */
    static String stripStylesheet(String css) {
        return tidy(stripCss(css));
    }

    /**
     * Removes {@code /* ... *}{@code /} comments from a stylesheet. A {@code /*} inside
     * a string is not a comment, so strings are stepped over; a {@code /*!} marks a
     * licence header and stays.
     */
    static String stripCss(String s) {
        StringBuilder out = new StringBuilder(s.length());
        int i = 0;
        int n = s.length();

        while (i < n) {
            char c = s.charAt(i);

            if (c == '/' && i + 1 < n && s.charAt(i + 1) == '*') {
                boolean licence = i + 2 < n && s.charAt(i + 2) == '!';
                int end = s.indexOf("*/", i + 2);
                end = (end < 0) ? n : Math.min(end + 2, n);   // unterminated: swallow the rest
                if (licence) {
                    out.append(s, i, end);
                }
                i = end;
                continue;
            }

            if (c == '"' || c == '\'') {
                int end = endOfString(s, i, c);
                out.append(s, i, end);
                i = end;
                continue;
            }

            out.append(c);
            i++;
        }
        return out.toString();
    }

    /** Index just past the string starting at {@code start}, honouring escapes. */
    private static int endOfString(String s, int start, char quote) {
        int i = start + 1;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '\\') {
                i += 2;
                continue;
            }
            if (c == quote) {
                return i + 1;
            }
            i++;
        }
        return s.length();                 // unterminated - take the rest
    }

    /** Drops lines left blank by the removal and collapses runs of blank lines. */
    private static String tidy(String s) {
        List<String> kept = new ArrayList<>();
        boolean previousBlank = false;
        for (String line : s.split("\n", -1)) {
            String trimmed = line.stripTrailing();
            boolean blank = trimmed.isBlank();
            if (blank && previousBlank) {
                continue;
            }
            kept.add(blank ? "" : trimmed);
            previousBlank = blank;
        }
        String joined = String.join("\n", kept).strip();
        return joined.isEmpty() ? joined : joined + "\n";
    }

    private static void deleteTree(Path root) throws IOException {
        try (Stream<Path> paths = Files.walk(root)) {
            for (Path p : paths.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(p);
            }
        }
    }
}
