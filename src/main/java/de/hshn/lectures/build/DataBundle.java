package de.hshn.lectures.build;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

/**
 * Publishes the data sets under {@code content/data/} for use in the browser.
 *
 * <p>A file {@code content/data/<name>.json} becomes
 * {@code <output>/data/<name>.js} containing</p>
 *
 * <pre>{@code window.MAPDATA = window.MAPDATA || {};
 * window.MAPDATA["<name>"] = <the JSON, verbatim>;}</pre>
 *
 * <p>The detour via a script (instead of serving the JSON and fetching it) is
 * deliberate: a {@code fetch()} is blocked when the site is opened through
 * {@code file://}, a {@code <script>} is not. The same reasoning already
 * applies to the search index.</p>
 *
 * <p>The JSON is copied through unchanged – the build does not interpret it.
 * A syntax error therefore surfaces in the browser, not here.</p>
 *
 * <p>Run from {@link PlantumlPreprocessor#main(String[])} during the Maven
 * {@code package} phase, before JBake. JBake does not wipe its output
 * directory, so the files written here survive the bake.</p>
 */
public final class DataBundle {

    /** Directory below {@code content/} that holds the data sets. */
    private static final String DATA = "data";

    private final Path contentDir;
    private final Path outputDir;
    private int written;

    public DataBundle(Path contentDir, Path outputDir) {
        this.contentDir = contentDir.toAbsolutePath().normalize();
        this.outputDir = outputDir.toAbsolutePath().normalize();
    }

    public static void main(String[] args) throws Exception {
        Path contentDir = Path.of(args.length > 0 ? args[0] : "content");
        Path out = Path.of(args.length > 1 ? args[1] : "target/website");
        new DataBundle(contentDir, out).run();
    }

    public void run() throws IOException {
        Path src = contentDir.resolve(DATA);
        if (!Files.isDirectory(src)) {
            return;
        }
        Path dst = outputDir.resolve(DATA);
        Files.createDirectories(dst);
        try (Stream<Path> files = Files.list(src)) {
            for (Path file : files.filter(Files::isRegularFile).sorted().toList()) {
                String name = file.getFileName().toString();
                if (!name.endsWith(".json")) {
                    continue;
                }
                String base = name.substring(0, name.length() - ".json".length());
                String json = TextIO.read(file).strip();
                String js = "window.MAPDATA = window.MAPDATA || {};\n"
                        + "window.MAPDATA[" + jsString(base) + "] = " + json + ";\n";
                Files.writeString(dst.resolve(base + ".js"), js, StandardCharsets.UTF_8);
                written++;
            }
        }
        System.out.println("[data] " + written + " data set(s) → <output>/data/*.js");
    }

    private static String jsString(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '<':  sb.append("\\u003c"); break;
                default:   sb.append(c);
            }
        }
        return sb.append('"').toString();
    }
}
