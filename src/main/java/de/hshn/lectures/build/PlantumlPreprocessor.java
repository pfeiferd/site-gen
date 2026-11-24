package de.hshn.lectures.build;

import net.sourceforge.plantuml.FileFormat;
import net.sourceforge.plantuml.FileFormatOption;
import net.sourceforge.plantuml.SourceStringReader;
import net.sourceforge.plantuml.core.DiagramDescription;
import net.sourceforge.plantuml.dot.GraphvizUtils;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.stream.Stream;

/**
 * Build-time PlantUML renderer for the JBake site.
 *
 * <p>Scans every Markdown file under {@code content/} for fenced
 * <code>```plantuml … ```</code> blocks and every standalone
 * {@code *.puml} file, and renders each diagram to a committed SVG under
 * {@code target/website/images/plantuml/} (site output, not assets). The FreeMarker page template then swaps the
 * rendered code blocks for the matching {@code <img>} at generation time.</p>
 *
 * <p>Naming convention (must stay in sync with {@code templates/page.ftl}); the
 * output mirrors the sub-directory structure under {@code content/} so that
 * equally named files of different lectures do not collide:</p>
 * <ul>
 *   <li>fenced block <em>n</em> (1-based) in {@code content/lecture/foo.md} →
 *       {@code target/website/images/plantuml/lecture/foo-n.svg}</li>
 *   <li>standalone {@code content/lecture/Demo.puml} →
 *       {@code target/website/images/plantuml/lecture/Demo.svg}</li>
 * </ul>
 *
 * <p>Rendering uses <em>Graphviz</em> ({@code dot}) when it is installed – found
 * via {@code GRAPHVIZ_DOT}, the {@code PATH} or the usual install locations –
 * and falls back to PlantUML's built-in <em>Smetana</em> layout otherwise.
 * Smetana needs no installation but lays out less carefully and omits e.g. the
 * reading-direction triangles of association names ({@code : name >}).
 * {@code PLANTUML_LAYOUT=smetana} forces Smetana. Each SVG carries a hash of its source in a
 * trailing comment; unchanged diagrams are skipped across incremental rebuilds
 * ({@code mvn clean} wipes {@code target} and forces a re-render). Writing into
 * the site output keeps generated diagrams out of {@code assets/}.</p>
 *
 * <p>Packaged into the project's shaded jar and executed during the Maven build
 * (see {@code pom.xml}); can also be run standalone:
 * {@code java -jar lectures-website-<version>.jar <baseDir>}.</p>
 */
public final class PlantumlPreprocessor {

    /** Trailing SVG comment that records the hash of the diagram source. */
    private static final String HASH_MARKER = "<!-- puml-source-sha256:";

    /** Usual Graphviz install locations, searched after GRAPHVIZ_DOT and the PATH. */
    private static final List<String> DOT_CANDIDATES = List.of(
            "/opt/homebrew/bin/dot", "/usr/local/bin/dot", "/opt/local/bin/dot", "/usr/bin/dot");

    private final Path contentDir;
    private final Path outputDir;
    private final MessageDigest digest;
    /** Path of the Graphviz {@code dot} executable, or null to lay out with Smetana. */
    private final String dot;

    private int renderedCount;
    private int skippedCount;

    /**
     * @param contentDir the source content directory to scan for diagrams.
     * @param outputDir   the directory to write the rendered SVGs into.
     */
    public PlantumlPreprocessor(Path contentDir, Path outputDir) throws NoSuchAlgorithmException {
        this.contentDir = contentDir.toAbsolutePath().normalize();
        this.outputDir = outputDir.toAbsolutePath().normalize();
        this.digest = MessageDigest.getInstance("SHA-256");
        this.dot = findDot();
        if (dot != null) {
            GraphvizUtils.setDotExecutable(dot);
        }
    }

    /**
     * Looks for a working Graphviz {@code dot}: {@code GRAPHVIZ_DOT}, then the
     * {@code PATH}, then {@link #DOT_CANDIDATES}. Returns null if none answers
     * {@code dot -V} or {@code PLANTUML_LAYOUT=smetana} is set.
     */
    private static String findDot() {
        if ("smetana".equalsIgnoreCase(System.getenv("PLANTUML_LAYOUT"))) {
            return null;
        }
        List<String> candidates = new ArrayList<>();
        String env = System.getenv("GRAPHVIZ_DOT");
        if (env != null && !env.isBlank()) {
            candidates.add(env);
        }
        String path = System.getenv("PATH");
        if (path != null) {
            for (String dir : path.split(File.pathSeparator)) {
                if (!dir.isBlank()) {
                    candidates.add(Path.of(dir, "dot").toString());
                }
            }
        }
        candidates.addAll(DOT_CANDIDATES);
        for (String candidate : candidates) {
            if (Files.isExecutable(Path.of(candidate)) && answers(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /** Whether {@code dot -V} runs successfully. */
    private static boolean answers(String dot) {
        try {
            Process p = new ProcessBuilder(dot, "-V").redirectErrorStream(true).start();
            p.getInputStream().readAllBytes();
            return p.waitFor(30, TimeUnit.SECONDS) && p.exitValue() == 0;
        } catch (IOException e) {
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /**
     * Entry point that wires all build tools from the paths passed by the Maven
     * exec plugin: {@code args[0]} = the source content dir ({@code content.dir}
     * property), {@code args[1]} = the Maven build dir ({@code target}),
     * {@code args[2]} = where the finished site goes ({@code site.dir}, by
     * default {@code <build>/website}).
     *
     * <p>Staging stays under the build dir because JBake resolves its source
     * folder relative to this project; only the content location and the site
     * output are freely selectable. That is what lets a content project build
     * into its own {@code target/} without overwriting the engine's.</p>
     */
    public static void main(String[] args) throws Exception {
        Path contentDir = Path.of(args.length > 0 ? args[0] : "content");
        Path buildDir   = Path.of(args.length > 1 ? args[1] : "target");
        Path website    = args.length > 2 ? Path.of(args[2]) : buildDir.resolve("website");
        // Verzeichnis der Engine selbst - dort liegen templates/ und assets/.
        Path engineDir  = args.length > 3 ? Path.of(args[3]) : buildDir.getParent();
        new PlantumlPreprocessor(contentDir, website.resolve("images").resolve("plantuml")).run();
        // TikZ/pgfplots-Bilder: gleiche Konvention wie PlantUML, nur mit einer
        // installierten TeX-Distribution statt einer Java-Bibliothek.
        new TikzPreprocessor(contentDir, website.resolve("images").resolve("tikz"),
                buildDir.resolve("tikz-work")).run();
        new MetaMerge(contentDir, buildDir.resolve("staged-content")).run();
        new ImageCascade(contentDir, website).run();
        new IndexRedirects(contentDir, website).run();
        new DataBundle(contentDir, website).run();
        // Muss vor JBake laufen: es veroeffentlicht den Zwischenstand,
        // siehe asset.folder in jbake.properties.
        new AssetStrip(engineDir.resolve("assets"), buildDir.resolve("staged-assets")).run();
    }

    /** Renders all diagrams found under {@code content/} into {@code outputDir}. */
    public void run() throws IOException {
        if (!Files.isDirectory(contentDir)) {
            System.out.println("[plantuml] no content/ directory at " + contentDir + " — nothing to do");
            return;
        }
        Files.createDirectories(outputDir);
        System.out.println(dot != null
                ? "[plantuml] layout: Graphviz (" + dot + ")"
                : "[plantuml] layout: Smetana – no Graphviz found or PLANTUML_LAYOUT=smetana"
                        + " (install Graphviz for full-quality diagrams)");

        try (Stream<Path> files = Files.walk(contentDir)) {
            for (Path file : files.filter(Files::isRegularFile).sorted().toList()) {
                processFile(file);
            }
        }
        System.out.println("[plantuml] done: " + renderedCount + " rendered, "
                + skippedCount + " unchanged → " + outputDir);
    }

    /** Renders every diagram contained in a single content file. */
    private void processFile(Path file) throws IOException {
        String name = file.getFileName().toString();
        // Ausgabe spiegelt die Unterverzeichnisse von content/ wider, damit sich
        // gleichnamige Dateien verschiedener Vorlesungen (z. B. einfuehrung.md)
        // nicht überschreiben.
        Path rel = contentDir.relativize(file);
        Path targetDir = rel.getParent() == null ? outputDir : outputDir.resolve(rel.getParent());
        if (name.endsWith(".md")) {
            String slug = name.substring(0, name.length() - ".md".length());
            // Zaeune wie der Markdown-Parser lesen: ein ````-Block, der ein
            // ```plantuml-Beispiel ZEIGT, ist kein Diagramm (sonst verschoebe sich
            // die Nummerierung gegenueber page.ftl).
            List<String> blocks = FencedBlocks.bodies(TextIO.read(file), "plantuml");
            for (int i = 0; i < blocks.size(); i++) {
                render(blocks.get(i), targetDir.resolve(slug + "-" + (i + 1) + ".svg"));
            }
        } else if (name.endsWith(".puml") || name.endsWith(".plantuml")) {
            String diagramName = name.substring(0, name.lastIndexOf('.'));
            render(TextIO.read(file), targetDir.resolve(diagramName + ".svg"));
        }
    }

    /**
     * Renders one diagram to {@code target}, updating the rendered/skipped counters.
     * Diagrams whose source is unchanged (matching hash marker) are skipped.
     */
    private void render(String source, Path target) throws IOException {
        String prepared = prepare(source);
        String hash = sha256(prepared);

        if (isUpToDate(target, hash)) {
            skippedCount++;
            return;
        }

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        DiagramDescription desc =
                new SourceStringReader(prepared).outputImage(buffer, new FileFormatOption(FileFormat.SVG));
        if (desc == null || desc.getDescription() == null) {
            throw new IOException("PlantUML could not parse diagram for " + target.getFileName());
        }

        String svg = buffer.toString(StandardCharsets.UTF_8) + "\n" + HASH_MARKER + hash + " -->\n";
        Files.createDirectories(target.getParent());
        Files.writeString(target, svg, StandardCharsets.UTF_8);
        renderedCount++;
        System.out.println("[plantuml] " + target.getFileName() + " (" + desc.getDescription() + ")");
    }

    /** Whether {@code target} already holds an SVG rendered from this exact source hash. */
    private boolean isUpToDate(Path target, String hash) throws IOException {
        return Files.exists(target)
                && Files.readString(target, StandardCharsets.UTF_8).contains(HASH_MARKER + hash + " -->");
    }

    /**
     * Normalises the source and, without Graphviz, selects the Smetana layout.
     * The pragma is part of the hashed source, so switching layouts re-renders.
     */
    private String prepare(String source) {
        String s = source.strip();
        boolean uml = !s.contains("@start") || s.contains("@startuml");
        StringBuilder header = new StringBuilder();
        if (dot == null) {
            header.append("\n!pragma layout smetana");
        } else if (!s.contains("linetype")) {
            // Gerade Linien mit Ecken statt Bezierkurven (Hausstil fuer UML).
            // "polyline" statt "ortho": bei ortho kann Graphviz Beschriftungen
            // nicht sauber platzieren, sie landen auf Linien und Klassen. Ein
            // Diagramm kann mit eigenem "skinparam linetype ..." abweichen.
            header.append("\nskinparam linetype polyline");
        }
        if (uml) {
            // Klassen eckig wie im UML-Standard (PlantUML rundet sie sonst ab);
            // wirkt nur in Klassendiagrammen, Objekte sind ohnehin eckig.
            header.append("\n<style>\nclassDiagram {\n  class {\n    RoundCorner 0\n  }\n}\n</style>");
        }
        if (!s.contains("@start")) {
            return "@startuml" + header + "\n" + s + "\n@enduml";
        }
        // Insert the header right after the first @start… directive.
        return header.length() == 0 ? s
                : s.replaceFirst("(?m)(@start\\w+[^\\n]*)$", "$1" + Matcher.quoteReplacement(header.toString()));
    }

    private String sha256(String text) {
        byte[] hashed = digest.digest(text.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(hashed.length * 2);
        for (byte b : hashed) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
