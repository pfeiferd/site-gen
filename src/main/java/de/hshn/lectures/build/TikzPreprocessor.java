package de.hshn.lectures.build;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/**
 * Build-time renderer for TikZ and pgfplots figures.
 *
 * <p>Scans every Markdown file under {@code content/} for fenced
 * <code>```tikz … ```</code> blocks and every standalone {@code *.tikz} file,
 * compiles each figure with LaTeX and converts the result to an SVG under
 * {@code target/website/images/tikz/}. The FreeMarker page template then swaps
 * the rendered code blocks for the matching {@code <img>} – exactly like
 * {@link PlantumlPreprocessor} does for PlantUML, and with the same naming
 * convention (must stay in sync with {@code templates/page.ftl}):</p>
 * <ul>
 *   <li>fenced block <em>n</em> (1-based) in {@code content/lecture/foo.md} →
 *       {@code target/website/images/tikz/lecture/foo-n.svg}</li>
 *   <li>standalone {@code content/lecture/Plot.tikz} →
 *       {@code target/website/images/tikz/lecture/Plot.svg}</li>
 * </ul>
 *
 * <p>Unlike PlantUML there is no pure-Java TeX, so this tool calls an
 * <strong>installed</strong> TeX distribution: {@code latex} (DVI output) and
 * {@code dvisvgm} must be on the {@code PATH} (override the names with the
 * environment variables {@code TIKZ_LATEX} and {@code TIKZ_DVISVGM}). The DVI
 * route is chosen on purpose: pgf has a native {@code dvisvgm} driver, so fills,
 * shadings and transparency become real SVG without Ghostscript, and
 * {@code --no-fonts} turns every glyph into a path – the figures need no fonts
 * in the browser. If the toolchain is missing, every figure that has not been
 * rendered before becomes a placeholder SVG that says so, and a warning is
 * printed; the build itself goes on. A figure that does not compile fails the
 * build with the relevant lines of the LaTeX log.</p>
 *
 * <p>What a block may contain: a complete document (starts with
 * {@code \documentclass} – used as is), one or more {@code tikzpicture}
 * environments (wrapped into a minimal document), or just the <em>inside</em>
 * of one picture, e.g. a bare pgfplots {@code axis} (wrapped into a
 * {@code tikzpicture} as well). The minimal document loads {@code tikz} and
 * {@code pgfplots}; sites and lectures add packages, libraries and settings via
 * {@code tikz-preamble.tex} files that cascade like {@code meta.properties}:
 * every such file on the way from {@code content/} down to the page's folder is
 * appended to the preamble, in that order. A preamble file that itself begins
 * with {@code \documentclass} replaces the built-in document head entirely.</p>
 *
 * <p>Each SVG carries a hash of its complete LaTeX source in a trailing comment;
 * unchanged figures are skipped across incremental rebuilds.</p>
 */
public final class TikzPreprocessor {

    /** Trailing SVG comment that records the hash of the figure source. */
    private static final String HASH_MARKER = "<!-- tikz-source-sha256:";

    /** Name of the optional preamble files in the content cascade. */
    static final String PREAMBLE_FILE = "tikz-preamble.tex";

    /**
     * Built-in document head. {@code preview} crops the page to the figure
     * ({@code dvisvgm --bbox=preview} reads that box back), the pgf driver must
     * be fixed to dvisvgm BEFORE tikz is loaded, or pgf would assume dvips.
     */
    private static final String DEFAULT_HEAD = String.join("\n",
            "\\documentclass{article}",
            "\\usepackage[T1]{fontenc}",
            "\\usepackage[utf8]{inputenc}",
            "\\usepackage{amsmath,amssymb}",
            "\\usepackage{tikz}",
            "\\usepackage{pgfplots}",
            "\\pgfplotsset{compat=newest}",
            "");

    private static final String PREVIEW = String.join("\n",
            "\\usepackage[active,tightpage]{preview}",
            "\\setlength\\PreviewBorder{2pt}",
            "\\pagestyle{empty}",
            "");

    private static final long TOOL_TIMEOUT_SECONDS = 120;

    private final Path contentDir;
    private final Path outputDir;
    private final Path workDir;
    private final MessageDigest digest;
    private final String latexCmd;
    private final String dvisvgmCmd;

    /** null = not probed yet, otherwise whether latex and dvisvgm both answered. */
    private Boolean toolchainAvailable;
    private int renderedCount;
    private int skippedCount;
    private int placeholderCount;

    /**
     * @param contentDir the source content directory to scan for figures.
     * @param outputDir  the directory to write the rendered SVGs into.
     * @param workDir    scratch directory for the LaTeX runs (under {@code target/}).
     */
    public TikzPreprocessor(Path contentDir, Path outputDir, Path workDir) throws NoSuchAlgorithmException {
        this.contentDir = contentDir.toAbsolutePath().normalize();
        this.outputDir = outputDir.toAbsolutePath().normalize();
        this.workDir = workDir.toAbsolutePath().normalize();
        this.digest = MessageDigest.getInstance("SHA-256");
        this.latexCmd = env("TIKZ_LATEX", "latex");
        this.dvisvgmCmd = env("TIKZ_DVISVGM", "dvisvgm");
    }

    private static String env(String name, String fallback) {
        String v = System.getenv(name);
        return v == null || v.isBlank() ? fallback : v.strip();
    }

    /** Renders all figures found under {@code content/} into {@code outputDir}. */
    public void run() throws IOException {
        if (!Files.isDirectory(contentDir)) {
            System.out.println("[tikz] no content/ directory at " + contentDir + " — nothing to do");
            return;
        }
        try (Stream<Path> files = Files.walk(contentDir)) {
            for (Path file : files.filter(Files::isRegularFile).sorted().toList()) {
                processFile(file);
            }
        }
        if (renderedCount + skippedCount + placeholderCount == 0) {
            return; // Sites without a single figure get no log line.
        }
        System.out.println("[tikz] done: " + renderedCount + " rendered, " + skippedCount + " unchanged"
                + (placeholderCount > 0 ? ", " + placeholderCount + " placeholder(s)" : "")
                + " → " + outputDir);
    }

    /** Renders every figure contained in a single content file. */
    private void processFile(Path file) throws IOException {
        String name = file.getFileName().toString();
        // Ausgabe spiegelt die Unterverzeichnisse von content/ wider (wie bei
        // PlantUML), damit gleichnamige Seiten verschiedener Vorlesungen sich
        // nicht ueberschreiben.
        Path rel = contentDir.relativize(file);
        Path targetDir = rel.getParent() == null ? outputDir : outputDir.resolve(rel.getParent());
        if (name.endsWith(".md")) {
            String slug = name.substring(0, name.length() - ".md".length());
            List<String> blocks = FencedBlocks.bodies(TextIO.read(file), "tikz");
            String preamble = blocks.isEmpty() ? null : preambleFor(file);
            for (int i = 0; i < blocks.size(); i++) {
                render(blocks.get(i), preamble, targetDir.resolve(slug + "-" + (i + 1) + ".svg"));
            }
        } else if (name.endsWith(".tikz")) {
            String figureName = name.substring(0, name.length() - ".tikz".length());
            render(TextIO.read(file), preambleFor(file), targetDir.resolve(figureName + ".svg"));
        }
    }

    /**
     * Collects the {@code tikz-preamble.tex} cascade for a page: all preamble
     * files from {@code content/} down to the page's own folder, concatenated.
     */
    private String preambleFor(Path page) throws IOException {
        StringBuilder sb = new StringBuilder();
        Path rel = contentDir.relativize(page.getParent());
        Path dir = contentDir;
        List<Path> dirs = new ArrayList<>();
        dirs.add(dir);
        for (Path part : rel) {
            if (part.toString().isEmpty()) {
                continue;
            }
            dir = dir.resolve(part);
            dirs.add(dir);
        }
        for (Path d : dirs) {
            Path pre = d.resolve(PREAMBLE_FILE);
            if (Files.isRegularFile(pre)) {
                sb.append("% ---- ").append(contentDir.relativize(pre)).append('\n');
                sb.append(TextIO.read(pre).strip()).append('\n');
            }
        }
        return sb.toString();
    }

    /**
     * Builds the complete LaTeX source for one block (see the class comment
     * for the three accepted forms). A block with its own {@code \documentclass}
     * is used as is - then the author also owns the page cropping (see
     * {@code --bbox} in {@link #render}).
     */
    String assemble(String body, String preamble) {
        String s = body.strip();
        String driver = "\\def\\pgfsysdriver{pgfsys-dvisvgm.def}\n";
        if (s.contains("\\documentclass")) {
            return driver + s + "\n";
        }
        String pre = preamble == null ? "" : preamble;
        String head = pre.stripLeading().startsWith("\\documentclass") ? "" : DEFAULT_HEAD;
        if (!s.contains("\\begin{tikzpicture}")) {
            s = "\\begin{tikzpicture}\n" + s + "\n\\end{tikzpicture}";
        }
        return driver + head + pre + PREVIEW
                + "\\begin{document}\n\\begin{preview}\n" + s + "\n\\end{preview}\n\\end{document}\n";
    }

    /**
     * Renders one figure to {@code target}, updating the counters. Figures whose
     * source is unchanged (matching hash marker) are skipped.
     */
    private void render(String body, String preamble, Path target) throws IOException {
        String source = assemble(body, preamble);
        String hash = sha256(source);
        if (isUpToDate(target, hash)) {
            skippedCount++;
            return;
        }
        Files.createDirectories(target.getParent());
        if (!toolchainAvailable()) {
            if (!Files.exists(target)) {
                // Platzhalter OHNE Hash-Marker: der naechste Bau mit TeX rendert neu.
                Files.writeString(target, placeholderSvg(target.getFileName().toString()), StandardCharsets.UTF_8);
            }
            placeholderCount++;
            return;
        }
        Path job = Files.createDirectories(workDir.resolve(jobName(target)));
        Path tex = job.resolve("figure.tex");
        Files.writeString(tex, source, StandardCharsets.UTF_8);
        for (String stale : List.of("figure.dvi", "figure.log", "figure.aux")) {
            Files.deleteIfExists(job.resolve(stale));
        }

        run(job, target, latexCmd, "-interaction=batchmode", "-halt-on-error", "-no-shell-escape",
                "-output-directory=" + job, tex.toString());
        Path dvi = job.resolve("figure.dvi");
        if (!Files.exists(dvi)) {
            throw new IOException("LaTeX produced no DVI for " + target.getFileName() + latexLogExcerpt(job));
        }
        run(job, target, dvisvgmCmd, "--no-fonts", "--bbox=preview", "--exact-bbox", "--verbosity=1",
                "--output=" + target, dvi.toString());
        if (!Files.exists(target)) {
            throw new IOException("dvisvgm produced no SVG for " + target.getFileName());
        }
        Files.writeString(target, Files.readString(target, StandardCharsets.UTF_8).stripTrailing()
                + "\n" + HASH_MARKER + hash + " -->\n", StandardCharsets.UTF_8);
        renderedCount++;
        System.out.println("[tikz] " + outputDir.relativize(target));
    }

    /** One scratch folder per figure; keeps logs inspectable after a failure. */
    private String jobName(Path target) {
        String rel = outputDir.relativize(target).toString().replace('\\', '/');
        return rel.substring(0, rel.length() - ".svg".length()).replace('/', '_');
    }

    /** Runs one tool in {@code job}; a non-zero exit fails the build with the LaTeX log excerpt. */
    private void run(Path job, Path target, String... command) throws IOException {
        Path console = job.resolve("console.txt");
        Process p = new ProcessBuilder(command)
                .directory(job.toFile())
                .redirectErrorStream(true)
                .redirectOutput(console.toFile())
                .start();
        try {
            if (!p.waitFor(TOOL_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                throw new IOException(command[0] + " timed out after " + TOOL_TIMEOUT_SECONDS
                        + " s for " + target.getFileName() + " (work dir: " + job + ")");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            p.destroyForcibly();
            throw new IOException("interrupted while running " + command[0], e);
        }
        if (p.exitValue() != 0) {
            String out = Files.exists(console) ? Files.readString(console, StandardCharsets.UTF_8).strip() : "";
            throw new IOException(command[0] + " failed (exit " + p.exitValue() + ") for "
                    + outputDir.relativize(target) + latexLogExcerpt(job)
                    + (out.isEmpty() ? "" : "\n--- " + command[0] + " output ---\n" + tail(out, 15))
                    + "\n(work dir: " + job + ")");
        }
    }

    /** The error lines ("! …" plus context) of figure.log, or the log's tail. */
    private String latexLogExcerpt(Path job) throws IOException {
        Path log = job.resolve("figure.log");
        if (!Files.exists(log)) {
            return "";
        }
        String text = TextIO.read(log);
        String[] lines = text.split("\\r?\\n");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("! ")) {
                for (int j = i; j < Math.min(lines.length, i + 6); j++) {
                    sb.append(lines[j]).append('\n');
                }
                sb.append('\n');
            }
        }
        String excerpt = sb.length() > 0 ? sb.toString().strip() : tail(text, 20);
        return "\n--- figure.log ---\n" + excerpt;
    }

    private static String tail(String text, int n) {
        String[] lines = text.split("\\r?\\n");
        int from = Math.max(0, lines.length - n);
        return String.join("\n", List.of(lines).subList(from, lines.length));
    }

    /** Probes latex and dvisvgm once; prints a warning when either is missing. */
    private boolean toolchainAvailable() {
        if (toolchainAvailable == null) {
            String missing = null;
            if (!answers(latexCmd)) {
                missing = latexCmd;
            } else if (!answers(dvisvgmCmd)) {
                missing = dvisvgmCmd;
            }
            toolchainAvailable = missing == null;
            if (missing != null) {
                System.out.println("[tikz] WARNING: '" + missing + "' not found - TikZ/pgfplots figures are NOT"
                        + " rendered; placeholders are written instead. Install TeX Live (latex, tikz, pgfplots,"
                        + " preview, dvisvgm) or point TIKZ_LATEX / TIKZ_DVISVGM at the executables.");
            }
        }
        return toolchainAvailable;
    }

    private boolean answers(String command) {
        try {
            Process p = new ProcessBuilder(command, "--version")
                    .redirectErrorStream(true)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .start();
            if (!p.waitFor(30, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                return false;
            }
            return p.exitValue() == 0;
        } catch (IOException e) {
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    /** A visible stand-in so the page still shows WHERE a figure belongs. */
    private static String placeholderSvg(String fileName) {
        return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"480\" height=\"72\" viewBox=\"0 0 480 72\">\n"
                + "<rect x=\"0.5\" y=\"0.5\" width=\"479\" height=\"71\" fill=\"#fff8e1\" stroke=\"#c90\" stroke-dasharray=\"4 3\"/>\n"
                + "<text x=\"240\" y=\"30\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"14\" fill=\"#663\">"
                + "TikZ figure not rendered: LaTeX toolchain missing at build time</text>\n"
                + "<text x=\"240\" y=\"52\" text-anchor=\"middle\" font-family=\"monospace\" font-size=\"12\" fill=\"#663\">"
                + fileName + "</text>\n</svg>\n";
    }

    /** Whether {@code target} already holds an SVG rendered from this exact source hash. */
    private boolean isUpToDate(Path target, String hash) throws IOException {
        return Files.exists(target)
                && Files.readString(target, StandardCharsets.UTF_8).contains(HASH_MARKER + hash + " -->");
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
