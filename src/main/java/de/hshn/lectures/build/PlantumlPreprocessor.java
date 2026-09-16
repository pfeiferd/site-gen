package de.hshn.lectures.build;

import net.sourceforge.plantuml.FileFormat;
import net.sourceforge.plantuml.FileFormatOption;
import net.sourceforge.plantuml.SourceStringReader;
import net.sourceforge.plantuml.core.DiagramDescription;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
 * <p>Rendering uses PlantUML's built-in <em>Smetana</em> layout engine, so no
 * Graphviz installation is required. Each SVG carries a hash of its source in a
 * trailing comment; unchanged diagrams are skipped across incremental rebuilds
 * ({@code mvn clean} wipes {@code target} and forces a re-render). Writing into
 * the site output keeps generated diagrams out of {@code assets/}.</p>
 *
 * <p>Packaged into the project's shaded jar and executed during the Maven build
 * (see {@code pom.xml}); can also be run standalone:
 * {@code java -jar lectures-website-<version>.jar <baseDir>}.</p>
 */
public final class PlantumlPreprocessor {

    /** Matches a fenced ```plantuml block and captures its body. */
    private static final Pattern FENCE =
            Pattern.compile("```plantuml[^\\n]*\\r?\\n(.*?)```", Pattern.DOTALL);

    /** Trailing SVG comment that records the hash of the diagram source. */
    private static final String HASH_MARKER = "<!-- puml-source-sha256:";

    private final Path contentDir;
    private final Path outputDir;
    private final MessageDigest digest;

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
        new PlantumlPreprocessor(contentDir, website.resolve("images").resolve("plantuml")).run();
        new MetaMerge(contentDir, buildDir.resolve("staged-content")).run();
        new ImageCascade(contentDir, website).run();
        new IndexRedirects(contentDir, website).run();
        new DataBundle(contentDir, website).run();
    }

    /** Renders all diagrams found under {@code content/} into {@code outputDir}. */
    public void run() throws IOException {
        if (!Files.isDirectory(contentDir)) {
            System.out.println("[plantuml] no content/ directory at " + contentDir + " — nothing to do");
            return;
        }
        Files.createDirectories(outputDir);

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
            List<String> blocks = extractBlocks(TextIO.read(file));
            for (int i = 0; i < blocks.size(); i++) {
                render(blocks.get(i), targetDir.resolve(slug + "-" + (i + 1) + ".svg"));
            }
        } else if (name.endsWith(".puml") || name.endsWith(".plantuml")) {
            String diagramName = name.substring(0, name.lastIndexOf('.'));
            render(TextIO.read(file), targetDir.resolve(diagramName + ".svg"));
        }
    }

    private List<String> extractBlocks(String markdown) {
        List<String> blocks = new ArrayList<>();
        Matcher m = FENCE.matcher(markdown);
        while (m.find()) {
            blocks.add(m.group(1));
        }
        return blocks;
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

    /** Normalises the source and forces the Graphviz-free Smetana layout engine. */
    private String prepare(String source) {
        String s = source.strip();
        if (!s.contains("@start")) {
            return "@startuml\n!pragma layout smetana\n" + s + "\n@enduml";
        }
        // Insert the pragma right after the first @start… directive.
        return s.replaceFirst("(?m)(@start\\w+[^\\n]*)$", "$1\n!pragma layout smetana");
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
