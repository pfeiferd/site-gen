package de.hshn.lectures.build;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Merges per-directory {@code meta.properties} files into each Markdown file's
 * front matter and writes the result to a staging content tree that JBake
 * consumes ({@code content.folder=target/staged-content} in jbake.properties).
 *
 * <p>This removes the need to repeat lecture-/language-wide metadata (such as
 * {@code lecture}, {@code lectureTitle}, {@code lectureIcon}, {@code lang},
 * {@code navgroup}) in every {@code .md}. For a file at
 * {@code content/<lecture>/<lang>/foo.md} the effective front matter is the
 * cascade (lowest → highest precedence):</p>
 * <ol>
 *   <li>{@code content/meta.properties}</li>
 *   <li>{@code content/<lecture>/meta.properties}</li>
 *   <li>{@code content/<lecture>/<lang>/meta.properties}</li>
 *   <li>the {@code .md}'s own front matter (wins)</li>
 * </ol>
 *
 * <p>Only Markdown files are staged (JBake reads only those from the content
 * folder); images and {@code meta.properties} stay in the real {@code content/}
 * tree and are handled elsewhere. Run from
 * {@link PlantumlPreprocessor#main(String[])} during the Maven {@code package}
 * phase, before JBake generates the site.</p>
 */
public final class MetaMerge {

    /** Front-matter / body separator used by the JBake Markdown files. */
    private static final String SEP = "~~~~~~";
    private static final String META = "meta.properties";

    private final Path contentDir;
    private final Path stageDir;
    private int staged;

    /** Site-wide string tables (content/site_<lang>.properties); page tables are merged on top. */
    private Map<String, String> siteEn = new LinkedHashMap<>();
    private Map<String, String> siteDe = new LinkedHashMap<>();

    public MetaMerge(Path contentDir, Path stageDir) {
        this.contentDir = contentDir.toAbsolutePath().normalize();
        this.stageDir = stageDir.toAbsolutePath().normalize();
    }

    /** Stages every Markdown file with its cascaded front matter. */
    public void run() throws IOException {
        if (!Files.isDirectory(contentDir)) {
            System.out.println("[meta] no content/ directory — nothing to stage");
            return;
        }
        deleteRecursive(stageDir);
        Files.createDirectories(stageDir);

        // Site-wide UI strings (content/site_<lang>.properties). Per-page strings
        // (content/<name>_<lang>.properties, e.g. index_en, search_de) are merged on
        // top per page. Translations thus live in content/, never under assets/.
        siteEn = loadMap(contentDir.resolve("site_en.properties"));
        siteDe = loadMap(contentDir.resolve("site_de.properties"));

        try (Stream<Path> files = Files.walk(contentDir)) {
            for (Path f : files.filter(Files::isRegularFile).sorted().toList()) {
                if (f.getFileName().toString().endsWith(".md")) {
                    stageMarkdown(f);
                }
            }
        }
        System.out.println("[meta] staged " + staged + " markdown file(s) → " + stageDir);
    }

    private void stageMarkdown(Path file) throws IOException {
        String raw = TextIO.read(file);
        String[] split = splitFrontMatter(raw);

        Map<String, String> fileFm = new LinkedHashMap<>();
        parseInto(split[0], fileFm);
        // publish=false an dieser Datei ODER an einem uebergeordneten meta.properties
        // (global/<lecture>/<lang>) -> Seite wird NICHT gestaged (kein Output, kein
        // Menue-Eintrag). Uebergeordnetes false uebersteuert. Default: published.
        if (!isPublished(file.getParent(), fileFm)) {
            return;
        }

        Map<String, String> merged = new LinkedHashMap<>();
        applyMetaChain(file.getParent(), merged);   // directory cascade (low → high)
        parseInto(split[0], merged);                 // file's own front matter wins

        // Sprache aus dem Ordnernamen ableiten (de/en) – nicht mehr redundant im
        // Front matter/meta.properties pflegen. Der Ordner ist die Quelle der Wahrheit.
        Path parent = file.getParent();
        if (parent != null) {
            String dir = parent.getFileName().toString();
            if (dir.equals("de") || dir.equals("en")) {
                merged.put("lang", dir);
            }
        }
        // Per-page i18n tables = site-wide + content/<base>_<lang>.properties, emitted
        // as window.I18N = {de:..., en:...} by the templates.
        String base = file.getFileName().toString();
        base = base.substring(0, base.length() - ".md".length());
        Path dir = file.getParent();
        Map<String, String> enMap = new LinkedHashMap<>(siteEn);
        enMap.putAll(loadMap(dir.resolve(base + "_en.properties")));
        Map<String, String> deMap = new LinkedHashMap<>(siteDe);
        deMap.putAll(loadMap(dir.resolve(base + "_de.properties")));
        merged.put("i18nEn", toJson(enMap));
        merged.put("i18nDe", toJson(deMap));

        // "date" darf im .md weggelassen werden -> automatisch aus der letzten
        // Dateiaenderung ableiten (JBake benoetigt ein Datum).
        if (!merged.containsKey("date")) {
            merged.put("date", fileDate(file));
        }

        StringBuilder out = new StringBuilder();
        for (Map.Entry<String, String> e : merged.entrySet()) {
            out.append(e.getKey()).append('=').append(e.getValue()).append('\n');
        }
        out.append(SEP).append('\n').append(split[1]);

        Path target = stageDir.resolve(contentDir.relativize(file).toString());
        Files.createDirectories(target.getParent());
        Files.writeString(target, out.toString(), StandardCharsets.UTF_8);
        staged++;
    }

    /** Splits raw markdown into [frontMatterText, bodyText] at the first SEP line. */
    private static String[] splitFrontMatter(String raw) {
        String[] lines = raw.split("\n", -1);
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].strip().equals(SEP)) {
                StringBuilder head = new StringBuilder();
                for (int j = 0; j < i; j++) head.append(lines[j]).append('\n');
                StringBuilder body = new StringBuilder();
                for (int j = i + 1; j < lines.length; j++) {
                    body.append(lines[j]);
                    if (j < lines.length - 1) body.append('\n');
                }
                return new String[]{head.toString(), body.toString()};
            }
        }
        return new String[]{"", raw}; // no front matter present
    }

    /** Reads meta.properties from contentDir down to {@code dir}, deeper wins. */
    private void applyMetaChain(Path dir, Map<String, String> merged) throws IOException {
        List<Path> chain = new ArrayList<>();
        for (Path d = dir; d != null && d.startsWith(contentDir); d = d.getParent()) {
            chain.add(d);
            if (d.equals(contentDir)) break;
        }
        Collections.reverse(chain); // contentDir (lowest precedence) first
        for (Path c : chain) {
            Path meta = c.resolve(META);
            if (Files.isRegularFile(meta)) {
                parseInto(TextIO.read(meta), merged);
            }
        }
    }

    /**
     * A page is published unless {@code publish=false} appears at any level: the
     * file's own front matter or any {@code meta.properties} from {@code contentDir}
     * down to {@code dir} (a higher-level {@code false} overrides lower levels).
     */
    private boolean isPublished(Path dir, Map<String, String> fileFm) throws IOException {
        for (Path d = dir; d != null && d.startsWith(contentDir); d = d.getParent()) {
            if (isFalse(loadMap(d.resolve(META)).get("publish"))) {
                return false;
            }
            if (d.equals(contentDir)) break;
        }
        return !isFalse(fileFm.get("publish"));
    }

    private static boolean isFalse(String value) {
        return value != null && value.trim().equalsIgnoreCase("false");
    }

    /** Loads a {@code key=value} properties file into a map (empty if the file is absent). */
    private static Map<String, String> loadMap(Path file) throws IOException {
        Map<String, String> m = new LinkedHashMap<>();
        if (Files.isRegularFile(file)) {
            parseInto(TextIO.read(file), m);
        }
        return m;
    }

    /** Last-modified date of {@code file} as {@code yyyy-MM-dd}. */
    private static String fileDate(Path file) throws IOException {
        FileTime t = Files.getLastModifiedTime(file);
        return t.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString();
    }

    /** Serialises a string map to a compact JSON object (for embedding in a &lt;script&gt;). */
    private static String toJson(Map<String, String> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> e : map.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            jsonString(sb, e.getKey()).append(':');
            jsonString(sb, e.getValue());
        }
        return sb.append('}').toString();
    }

    /** Appends {@code s} as a JSON string literal (escaping quotes, controls and '<'). */
    private static StringBuilder jsonString(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                case '<':  sb.append("\\u003c"); break; // safe inside <script>
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"');
    }

    /** Parses {@code key=value} lines (ignoring blanks and #comments) into {@code target}. */
    private static void parseInto(String text, Map<String, String> target) {
        for (String line : text.split("\n", -1)) {
            String s = line.strip();
            if (s.isEmpty() || s.startsWith("#")) continue;
            int eq = s.indexOf('=');
            if (eq > 0) target.put(s.substring(0, eq).trim(), s.substring(eq + 1));
        }
    }

    private void deleteRecursive(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (Stream<Path> walk = Files.walk(dir)) {
            for (Path p : walk.sorted(Comparator.reverseOrder()).toList()) {
                Files.deleteIfExists(p);
            }
        }
    }
}
