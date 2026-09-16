package de.hshn.lectures.build;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Generates redirect {@code index.html} files so that URLs ending on a lecture
 * folder – or on a lecture's language folder – land directly in the lecture
 * instead of producing a web-server "Not Found":
 *
 * <ul>
 *   <li>{@code /<lecture>/<lang>/} → first topic of that language variant
 *       (e.g. {@code /tswe/en/} → {@code introduction.html}).</li>
 *   <li>{@code /<lecture>/<lang>/} for a language that does NOT exist → the
 *       default variant that does (e.g. {@code /tswe/de/} → {@code ../en/…}).</li>
 *   <li>{@code /<lecture>/} → the default language's first topic
 *       (e.g. {@code /tswe/} → {@code en/introduction.html}).</li>
 * </ul>
 *
 * <p>A single-lecture site may put {@code de/}/{@code en/} directly under
 * {@code content/}; the same redirects are then written one level up, and the
 * site root {@code /} takes the place of {@code /<lecture>/} – unless
 * {@code content/index.md} is published, in which case that start page is baked
 * to {@code /index.html} and wins.</p>
 *
 * <p>The "first topic" is the published Markdown file with the lowest
 * {@code navorder}. The default language is the first of {@code de}, {@code en}
 * that has a published variant (German is the site's primary language).</p>
 *
 * <p>Like {@link ImageCascade}, the files are written directly into the JBake
 * output directory ({@code target/website}); JBake does not wipe its output, so
 * they survive the bake. Run from {@link PlantumlPreprocessor#main(String[])}.</p>
 */
public final class IndexRedirects {

    private static final String META = "meta.properties";
    private static final String SEP = "~~~~~~";
    /** Language folders in default-preference order (primary language first). */
    private static final List<String> LANGS = List.of("de", "en");

    private final Path contentDir;
    private final Path outputDir;
    private int written;

    public IndexRedirects(Path contentDir, Path outputDir) {
        this.contentDir = contentDir.toAbsolutePath().normalize();
        this.outputDir = outputDir.toAbsolutePath().normalize();
    }

    public static void main(String[] args) throws Exception {
        Path contentDir = Path.of(args.length > 0 ? args[0] : "content");
        Path out = Path.of(args.length > 1 ? args[1] : "target/website");
        new IndexRedirects(contentDir, out).run();
    }

    public void run() throws IOException {
        if (!Files.isDirectory(contentDir)) {
            System.out.println("[index] no content/ directory — nothing to do");
            return;
        }
        // Flache Struktur: die einzige Vorlesung liegt direkt in content/.
        processLecture(contentDir, outputDir);

        try (Stream<Path> top = Files.list(contentDir)) {
            for (Path lecture : top.filter(Files::isDirectory).sorted().toList()) {
                String slug = lecture.getFileName().toString();
                if (slug.equals("images") || slug.equals("files") || slug.equals("data") || slug.equals("common") || LANGS.contains(slug)) {
                    continue; // site-wide images, or parts of a lecture in the flat layout
                }
                processLecture(lecture, outputDir.resolve(slug));
            }
        }
        System.out.println("[index] wrote " + written + " redirect index.html file(s) → " + outputDir);
    }

    /**
     * @param lectureDir the directory holding the {@code de/}/{@code en/} folders
     *                   (a lecture folder, or {@code content/} itself in the flat
     *                   single-lecture layout).
     * @param outBase    where that lecture's pages land in the output – the site
     *                   root for the flat layout.
     */
    private void processLecture(Path lectureDir, Path outBase) throws IOException {
        // A lecture is a directory that has a de/ or en/ language subfolder.
        // Anything else under content/ (e.g. images/) is skipped.
        // A publish=false at the lecture level hides it entirely.
        if (isFalse(loadMap(lectureDir.resolve(META)).get("publish"))) {
            return;
        }

        // first[lang] = first-topic html file name (e.g. "introduction.html"),
        // for every language variant that actually has a published topic.
        Map<String, String> first = new LinkedHashMap<>();
        for (String lang : LANGS) {
            Path langDir = lectureDir.resolve(lang);
            if (!Files.isDirectory(langDir)) continue;
            if (isFalse(loadMap(langDir.resolve(META)).get("publish"))) continue;
            String topic = firstTopic(langDir);
            if (topic != null) first.put(lang, topic);
        }
        if (first.isEmpty()) return; // not a lecture (no language variant with topics)

        String defaultLang = first.keySet().iterator().next(); // LANGS order → primary first
        String defaultTopic = first.get(defaultLang);

        // Per-language index.html: existing variant → its own first topic;
        // missing variant → fall back to the default variant that exists. The
        // "?lang=" parameter always matches the language actually served (i18n.js
        // reads it to select the UI language), so a missing variant lands on the
        // default with that default's lang.
        for (String lang : LANGS) {
            Path langOut = outBase.resolve(lang).resolve("index.html");
            if (first.containsKey(lang)) {
                // Heisst das erste Thema selbst index.md, steht unter <lang>/ bereits
                // die echte Seite - eine Weiterleitung zeigte dort auf sich selbst.
                if (first.get(lang).equals("index.html")) continue;
                writeRedirect(langOut, first.get(lang), lang);                       // tswe/en/ → introduction.html?lang=en
            } else {
                writeRedirect(langOut, "../" + defaultLang + "/" + defaultTopic, defaultLang); // tswe/de/ → ../en/introduction.html?lang=en
            }
        }

        // Lecture-level index.html → default language's first topic. In the flat
        // layout that is the site root: a published content/index.md is baked there
        // by JBake and takes precedence, so the redirect is left out then.
        if (outBase.equals(outputDir) && hasStartPage()) {
            return;
        }
        Map<String, String> byLang = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : first.entrySet()) {
            byLang.put(e.getKey(), e.getKey() + "/" + e.getValue());
        }
        if (byLang.size() == 1) {
            writeRedirect(outBase.resolve("index.html"), defaultLang + "/" + defaultTopic, defaultLang);
        } else {
            writeLangRedirect(outBase.resolve("index.html"), byLang, defaultLang);
        }
    }

    /**
     * Redirect that keeps the reader's interface language: the script picks the
     * variant matching {@code ?lang=} or the stored choice, the meta refresh
     * (no JavaScript) falls back to the default language. Used where one entry
     * point serves several language variants – a lecture folder or, in the flat
     * layout, the site root.
     */
    private void writeLangRedirect(Path file, Map<String, String> byLang, String defaultLang)
            throws IOException {
        String fallback = byLang.get(defaultLang) + "?lang=" + defaultLang;
        // Hinweis zur Sprachwahl im Skript unten: gibt es die Wunschsprache des
        // Lesers als Inhalt, fuehrt der Weg dorthin. Gibt es sie nicht, bleibt es
        // bei der Vorgabe-Variante - die OBERFLAECHE aber bei seiner Wunschsprache.
        StringBuilder map = new StringBuilder("{");
        for (Map.Entry<String, String> e : byLang.entrySet()) {
            if (map.length() > 1) map.append(',');
            map.append(jsString(e.getKey())).append(':').append(jsString(e.getValue()));
        }
        map.append('}');
        String html = "<!doctype html>\n"
                + "<html lang=\"" + defaultLang + "\">\n"
                + "<head>\n"
                + "<meta charset=\"utf-8\">\n"
                + "<meta name=\"robots\" content=\"noindex\">\n"
                + "<title>Redirecting…</title>\n"
                + "<link rel=\"canonical\" href=\"" + htmlAttr(byLang.get(defaultLang)) + "\">\n"
                + "<meta http-equiv=\"refresh\" content=\"0; url=" + htmlAttr(fallback) + "\">\n"
                + "<script>(function(){var m=" + map + ",d=" + jsString(defaultLang) + ",l=\"\";\n"
                + "try{l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('lang')||\"\";}catch(e){}\n"
                + "if(l!=='de'&&l!=='en')l=d;var t=(m[l]||m[d])+'?lang='+l,s=location.search;if(s)t+='&'+s.slice(1);\n"
                + "location.replace(t+location.hash);})();</script>\n"
                + "</head>\n"
                + "<body>\n"
                + "<p>Redirecting to <a href=\"" + htmlAttr(fallback) + "\">the lecture</a>…</p>\n"
                + "</body>\n"
                + "</html>\n";
        Files.createDirectories(file.getParent());
        Files.writeString(file, html, StandardCharsets.UTF_8);
        written++;
    }

    /** Is there a published {@code content/index.md} that JBake bakes to the site root? */
    private boolean hasStartPage() throws IOException {
        Path indexMd = contentDir.resolve("index.md");
        return Files.isRegularFile(indexMd) && !isFalse(frontMatter(indexMd).get("publish"));
    }

    /** Published {@code *.md} with the lowest {@code navorder}, as {@code <base>.html} (or null). */
    private String firstTopic(Path langDir) throws IOException {
        String bestBase = null;
        long bestOrder = Long.MAX_VALUE;
        String bestName = null;
        try (Stream<Path> files = Files.list(langDir)) {
            for (Path f : files.filter(Files::isRegularFile).sorted().toList()) {
                String name = f.getFileName().toString();
                if (!name.endsWith(".md")) continue;
                Map<String, String> fm = frontMatter(f);
                if (isFalse(fm.get("publish"))) continue;
                long order = parseOrder(fm.get("navorder"));
                // Lowest navorder wins; ties broken by file name for stability.
                if (order < bestOrder || (order == bestOrder && (bestName == null || name.compareTo(bestName) < 0))) {
                    bestOrder = order;
                    bestName = name;
                    bestBase = name.substring(0, name.length() - ".md".length());
                }
            }
        }
        return bestBase == null ? null : bestBase + ".html";
    }

    /** Parses the leading integer of a navorder value (e.g. "01" → 1); unknown → very large. */
    private static long parseOrder(String navorder) {
        if (navorder == null) return Long.MAX_VALUE - 1;
        String s = navorder.trim();
        int i = 0;
        while (i < s.length() && Character.isDigit(s.charAt(i))) i++;
        if (i == 0) return Long.MAX_VALUE - 1;
        try {
            return Long.parseLong(s.substring(0, i));
        } catch (NumberFormatException e) {
            return Long.MAX_VALUE - 1;
        }
    }

    /** Reads a Markdown file's front matter (the {@code key=value} lines before {@code ~~~~~~}). */
    private static Map<String, String> frontMatter(Path md) throws IOException {
        Map<String, String> m = new LinkedHashMap<>();
        String raw = TextIO.read(md);
        for (String line : raw.split("\n", -1)) {
            if (line.strip().equals(SEP)) break;
            parseLine(line, m);
        }
        return m;
    }

    private static Map<String, String> loadMap(Path file) throws IOException {
        Map<String, String> m = new LinkedHashMap<>();
        if (Files.isRegularFile(file)) {
            for (String line : TextIO.read(file).split("\n", -1)) {
                parseLine(line, m);
            }
        }
        return m;
    }

    private static void parseLine(String line, Map<String, String> target) {
        String s = line.strip();
        if (s.isEmpty() || s.startsWith("#")) return;
        int eq = s.indexOf('=');
        if (eq > 0) target.put(s.substring(0, eq).trim(), s.substring(eq + 1).trim());
    }

    private static boolean isFalse(String value) {
        return value != null && value.trim().equalsIgnoreCase("false");
    }

    /**
     * Writes a tiny redirect page pointing (relatively) at {@code target}.
     *
     * <p>The {@code ?lang=} it appends is the language the READER has chosen
     * (URL parameter or stored choice), not the one that happens to be served:
     * a lecture that exists only in English must not throw a German interface
     * back to English on the way in – the interface language is independent of
     * the content language. Only when the reader has no preference does the
     * served language decide. Without JavaScript the meta refresh falls back to
     * exactly that.</p>
     */
    private void writeRedirect(Path file, String target, String lang) throws IOException {
        String withLang = target + "?lang=" + lang;          // e.g. introduction.html?lang=en
        String escLang = htmlAttr(withLang);
        String escCanonical = htmlAttr(target);              // clean URL for canonical
        String html = "<!doctype html>\n"
                + "<html lang=\"" + lang + "\">\n"
                + "<head>\n"
                + "<meta charset=\"utf-8\">\n"
                + "<meta name=\"robots\" content=\"noindex\">\n"
                + "<title>Redirecting…</title>\n"
                + "<link rel=\"canonical\" href=\"" + escCanonical + "\">\n"
                + "<meta http-equiv=\"refresh\" content=\"0; url=" + escLang + "\">\n"
                // Sprache des Lesers behalten, sonst die ausgelieferte; danach die
                // uebrigen Parameter (?view=slides, ?theme=dark, …) und #hash anhaengen.
                + "<script>(function(){var t=" + jsString(target) + ",d=" + jsString(lang) + ",l=\"\";\n"
                + "try{l=new URLSearchParams(location.search).get('lang')||localStorage.getItem('lang')||\"\";}catch(e){}\n"
                + "if(l!=='de'&&l!=='en')l=d;var u=t+'?lang='+l,s=location.search;if(s)u+='&'+s.slice(1);\n"
                + "location.replace(u+location.hash);})();</script>\n"
                + "</head>\n"
                + "<body>\n"
                + "<p>Redirecting to <a href=\"" + escLang + "\">the lecture</a>…</p>\n"
                + "</body>\n"
                + "</html>\n";
        Files.createDirectories(file.getParent());
        Files.writeString(file, html, StandardCharsets.UTF_8);
        written++;
    }

    private static String htmlAttr(String s) {
        return s.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;");
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
