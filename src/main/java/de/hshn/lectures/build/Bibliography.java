package de.hshn.lectures.build;

import de.undercouch.citeproc.CSL;
import de.undercouch.citeproc.bibtex.BibTeXItemDataProvider;
import de.undercouch.citeproc.output.Citation;
import org.jbibtex.BibTeXDatabase;
import org.jbibtex.BibTeXEntry;
import org.jbibtex.BibTeXParser;
import org.jbibtex.Key;
import org.jbibtex.ParseException;
import org.jbibtex.Value;

import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Citations and bibliographies from BibTeX files.
 *
 * <p>A page names its {@code .bib} file(s) with {@code bibliography=} – in its
 * front matter or, for a whole lecture, in a {@code meta.properties}. In the
 * text, {@code [@key]} (or {@code [@a; @b]}) cites an entry, and a line holding
 * only {@code [BIB]} becomes the list of all entries cited on that page. A line
 * {@code [BIB file.bib]} instead lists <em>every</em> entry of that file, newest
 * first – for a publication list, which cites nothing. Both are formatted with
 * a CSL style ({@code citationStyle=}, default {@value #DEFAULT_STYLE}) in the
 * page's language, using citeproc-java.</p>
 *
 * <p>Runs on the Markdown body while {@link MetaMerge} stages a page, so JBake
 * only ever sees finished HTML: citations become links to their entry, the
 * bibliography an HTML block. Code – fenced blocks and inline code spans – is
 * left alone, so the syntax itself can be shown in a code example.</p>
 *
 * <p>File names in {@code bibliography} and a {@code citationStyle} ending in
 * {@code .csl} are looked up next to the page first and then in each parent
 * folder up to {@code content/}, so a lecture can keep one shared file.
 * Problems (missing file, unknown key, missing {@code [BIB]}) are reported on
 * the console; they never fail the build.</p>
 */
final class Bibliography {

    static final String DEFAULT_STYLE = "ieee";

    /** {@code [@key]} or {@code [@key1; @key2]}; keys as BibTeX allows them. */
    private static final Pattern CITE =
            Pattern.compile("\\[(@[\\w:.\\-/+]+(?:\\s*;\\s*@[\\w:.\\-/+]+)*)]");
    private static final Pattern KEY = Pattern.compile("@([\\w:.\\-/+]+)");
    /** Inline code span: a run of backticks up to the same run. */
    private static final Pattern CODE_SPAN = Pattern.compile("(`+).+?\\1");
    /** Opening or closing line of a fenced code block (indented 4+ it is code itself). */
    private static final Pattern FENCE = Pattern.compile("^ {0,3}(`{3,}|~{3,})");
    /** A line holding only [BIB]; indented 4+ it would be a code block. */
    private static final Pattern MARKER = Pattern.compile("(?m)^ {0,3}\\[BIB][ \\t]*$");
    /** A line holding only [BIB file.bib]: the whole file, newest first. */
    private static final Pattern FILE_MARKER =
            Pattern.compile("(?m)^ {0,3}\\[BIB[ \\t]+([^\\]\\s]+\\.bib)][ \\t]*$");
    private static final List<String> MONTHS = List.of("jan", "feb", "mar", "apr", "may", "jun",
            "jul", "aug", "sep", "oct", "nov", "dec");

    private final Path contentDir;

    Bibliography(Path contentDir) {
        this.contentDir = contentDir;
    }

    /**
     * Returns {@code body} with citations and the {@code [BIB]} marker replaced,
     * or unchanged when the page neither cites nor asks for a bibliography.
     */
    String process(String body, Map<String, String> meta, Path page) throws IOException {
        List<String[]> parts = split(body);
        Set<String> cited = new LinkedHashSet<>();
        Set<String> listed = new LinkedHashSet<>();
        boolean marker = false;
        for (String[] part : parts) {
            if (part[0] == null) continue;
            for (Matcher m = CITE.matcher(part[0]); m.find(); ) {
                cited.addAll(keys(m.group(1)));
            }
            marker |= hasMarker(part[0]);
            for (Matcher m = FILE_MARKER.matcher(part[0]); m.find(); ) {
                listed.add(m.group(1));
            }
        }
        if (cited.isEmpty() && !marker && listed.isEmpty()) {
            return body;
        }
        String name = contentDir.relativize(page).toString();
        String files = meta.getOrDefault("bibliography", "").trim();
        if (files.isEmpty() && (marker || !cited.isEmpty())) {
            warn(name, "cites or uses [BIB] but no 'bibliography=' is set");
            if (listed.isEmpty()) return body;
        }

        BibTeXItemDataProvider provider = new BibTeXItemDataProvider();
        Set<String> known = new LinkedHashSet<>();
        Map<Path, BibTeXDatabase> loaded = new HashMap<>();
        if (!files.isEmpty()) {
            for (String file : files.split(",")) {
                Path bib = lookup(page.getParent(), file.trim());
                if (bib == null) {
                    warn(name, "bibliography file not found: " + file.trim());
                    continue;
                }
                BibTeXDatabase db = parse(bib);
                loaded.put(bib, db);
                provider.addDatabase(db);
                db.getEntries().keySet().forEach(k -> known.add(k.getValue()));
            }
        }
        for (String key : cited) {
            if (!known.contains(key)) warn(name, "unknown citation key @" + key);
        }
        cited.retainAll(known);

        // [BIB file.bib]: every entry of that file, newest first. The file need not be
        // named in bibliography=; one already loaded is not parsed twice.
        Map<String, List<String>> fileKeys = new HashMap<>();
        for (String file : listed) {
            Path bib = lookup(page.getParent(), file);
            if (bib == null) {
                warn(name, "bibliography file not found: " + file);
                fileKeys.put(file, List.of());
                continue;
            }
            BibTeXDatabase db = loaded.get(bib);
            if (db == null) {
                db = parse(bib);
                loaded.put(bib, db);
                provider.addDatabase(db);
                db.getEntries().keySet().forEach(k -> known.add(k.getValue()));
            }
            fileKeys.put(file, newestFirst(db));
        }

        CSL csl = new CSL(provider, style(meta, page, name), locale(meta.get("lang")));
        csl.setOutputFormat("html");
        csl.setConvertLinks(true);
        // Order of first appearance -> numbering of numeric styles; listed files follow.
        Set<String> registered = new LinkedHashSet<>(cited);
        fileKeys.values().forEach(registered::addAll);
        csl.registerCitationItems(registered);

        StringBuilder out = new StringBuilder();
        boolean placed = false;
        for (String[] part : parts) {
            if (part[0] == null) {
                out.append(part[1]);
                continue;
            }
            String text = cite(part[0], csl, known);
            if (hasMarker(text)) {
                String list = placed ? "" : list(csl, cited);
                text = MARKER.matcher(text).replaceAll(Matcher.quoteReplacement(list));
                placed = true;
            }
            if (!listed.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                Matcher m = FILE_MARKER.matcher(text);
                while (m.find()) {
                    m.appendReplacement(sb, Matcher.quoteReplacement(
                            listAll(csl, fileKeys.getOrDefault(m.group(1), List.of()))));
                }
                m.appendTail(sb);
                text = sb.toString();
            }
            out.append(text);
        }
        if (!placed && !cited.isEmpty()) {
            warn(name, "cites entries but has no [BIB] line for the bibliography");
        }
        int total = registered.size();
        System.out.println("[bib] " + name + ": " + total + " entr" + (total == 1 ? "y" : "ies"));
        return out.toString();
    }

    /** The keys of {@code db} ordered by year and month, newest first; ties keep the file order. */
    private static List<String> newestFirst(BibTeXDatabase db) {
        List<String> keys = new ArrayList<>();
        Map<String, Integer> rank = new HashMap<>();
        for (Map.Entry<Key, BibTeXEntry> e : db.getEntries().entrySet()) {
            String key = e.getKey().getValue();
            keys.add(key);
            rank.put(key, year(e.getValue()) * 100 + month(e.getValue()));
        }
        keys.sort(Comparator.comparing((String k) -> rank.get(k)).reversed());
        return keys;
    }

    private static int year(BibTeXEntry entry) {
        Value v = entry.getField(BibTeXEntry.KEY_YEAR);
        if (v == null) return 0;
        Matcher m = Pattern.compile("\\d{4}").matcher(v.toUserString());
        return m.find() ? Integer.parseInt(m.group()) : 0;
    }

    private static int month(BibTeXEntry entry) {
        Value v = entry.getField(BibTeXEntry.KEY_MONTH);
        if (v == null) return 0;
        String s = v.toUserString().strip().toLowerCase();
        if (s.matches("\\d{1,2}")) return Integer.parseInt(s);
        int i = s.length() >= 3 ? MONTHS.indexOf(s.substring(0, 3)) : -1;
        return i < 0 ? 0 : i + 1;
    }

    /** All given entries as one HTML block in the given order, each with its anchor. */
    private static String listAll(CSL csl, List<String> keys) {
        if (keys.isEmpty()) return "";
        StringBuilder sb = new StringBuilder("<div class=\"bibliography csl-bib-body\">");
        for (String key : keys) {
            String[] one = csl.makeBibliography(item -> item.getId().equals(key)).getEntries();
            if (one.length != 1) continue;
            sb.append(one[0].strip().replaceFirst("<div class=\"csl-entry\">",
                    Matcher.quoteReplacement("<div class=\"csl-entry\" id=\"" + anchor(key) + "\">"))
                    .replaceAll("\\s*\\n\\s*", " "));
        }
        return sb.append("</div>").toString();
    }

    /** Replaces every citation in a code-free text part. */
    private static String cite(String text, CSL csl, Set<String> known) {
        Matcher m = CITE.matcher(text);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            List<String> keys = new ArrayList<>(keys(m.group(1)));
            keys.removeIf(k -> !known.contains(k));
            String html;
            if (keys.isEmpty()) {
                html = "<span class=\"citation citation-missing\">" + m.group() + "</span>";
            } else {
                List<Citation> made = csl.makeCitation(keys);
                // makeCitation also returns earlier citations it re-rendered; ours is the last.
                String label = made.get(made.size() - 1).getText();
                html = "<a class=\"citation\" href=\"#" + anchor(keys.get(0)) + "\">" + label + "</a>";
            }
            m.appendReplacement(sb, Matcher.quoteReplacement(html));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /** The bibliography as one HTML block; each entry gets an anchor for the citations. */
    private static String list(CSL csl, Set<String> cited) {
        if (cited.isEmpty()) return "";
        String[] entries = csl.makeBibliography().getEntries();
        // citeproc-java does not report which entry belongs to which key: render every
        // entry on its own and match the text (falls back to the order otherwise).
        Map<String, String> keyOf = new HashMap<>();
        for (String key : cited) {
            String[] one = csl.makeBibliography(item -> item.getId().equals(key)).getEntries();
            if (one.length == 1) keyOf.put(one[0].strip(), key);
        }
        List<String> order = new ArrayList<>(cited);
        StringBuilder sb = new StringBuilder("<div class=\"bibliography csl-bib-body\">");
        for (int i = 0; i < entries.length; i++) {
            String entry = entries[i].strip();
            String key = keyOf.getOrDefault(entry, i < order.size() ? order.get(i) : null);
            String id = key == null ? "" : " id=\"" + anchor(key) + "\"";
            // No blank lines: Markdown would end the HTML block there.
            sb.append(entry.replaceFirst("<div class=\"csl-entry\">",
                    Matcher.quoteReplacement("<div class=\"csl-entry\"" + id + ">"))
                    .replaceAll("\\s*\\n\\s*", " "));
        }
        return sb.append("</div>").toString();
    }

    /** The CSL style as XML: bundled by name, or a {@code .csl} file from the content tree. */
    private String style(Map<String, String> meta, Path page, String name) throws IOException {
        String style = meta.getOrDefault("citationStyle", DEFAULT_STYLE).trim();
        if (style.endsWith(".csl")) {
            Path file = lookup(page.getParent(), style);
            if (file != null) return TextIO.read(file);
            warn(name, "style file not found: " + style + " – using " + DEFAULT_STYLE);
            style = DEFAULT_STYLE;
        }
        String xml = bundled(style);
        if (xml == null) {
            warn(name, "unknown citation style '" + style + "' – using " + DEFAULT_STYLE);
            xml = bundled(DEFAULT_STYLE);
        }
        return xml;
    }

    private static String bundled(String style) throws IOException {
        try (InputStream in = Bibliography.class.getResourceAsStream("/csl/" + style + ".csl")) {
            return in == null ? null : new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String locale(String lang) {
        return "de".equals(lang) ? "de-DE" : "en-US";
    }

    /** Finds {@code file} next to the page or in a parent folder up to {@code content/}. */
    private Path lookup(Path dir, String file) {
        for (Path d = dir; d != null && d.startsWith(contentDir); d = d.getParent()) {
            Path candidate = d.resolve(file).normalize();
            if (Files.isRegularFile(candidate)) return candidate;
            if (d.equals(contentDir)) break;
        }
        return null;
    }

    private static BibTeXDatabase parse(Path bib) throws IOException {
        try {
            return new BibTeXParser().parse(new StringReader(TextIO.read(bib)));
        } catch (ParseException e) {
            throw new IOException("Cannot parse " + bib + ": " + e.getMessage(), e);
        }
    }

    private static List<String> keys(String group) {
        List<String> keys = new ArrayList<>();
        for (Matcher m = KEY.matcher(group); m.find(); ) keys.add(m.group(1));
        return keys;
    }

    private static boolean hasMarker(String text) {
        return MARKER.matcher(text).find();
    }

    private static String anchor(String key) {
        return "ref-" + key.replaceAll("[^\\w\\-]", "-");
    }

    /**
     * Splits Markdown into parts: {@code {text, null}} for prose and
     * {@code {null, code}} for fenced blocks and inline code spans, which stay verbatim.
     */
    private static List<String[]> split(String body) {
        List<String[]> parts = new ArrayList<>();
        StringBuilder prose = new StringBuilder();
        StringBuilder code = null;
        String fence = null;
        for (String line : body.split("(?<=\n)")) {
            Matcher f = FENCE.matcher(line);
            if (fence == null && f.find()) {
                flush(prose, parts);
                fence = f.group(1);
                code = new StringBuilder(line);
            } else if (fence != null) {
                code.append(line);
                if (f.find() && f.group(1).charAt(0) == fence.charAt(0)
                        && f.group(1).length() >= fence.length()
                        && line.strip().equals(f.group(1))) {
                    parts.add(new String[]{null, code.toString()});
                    fence = null;
                }
            } else {
                prose.append(line);
            }
        }
        if (fence != null) parts.add(new String[]{null, code.toString()});
        flush(prose, parts);
        return parts;
    }

    /** Adds the collected prose, with its inline code spans as separate verbatim parts. */
    private static void flush(StringBuilder prose, List<String[]> parts) {
        if (prose.length() == 0) return;
        Matcher m = CODE_SPAN.matcher(prose);
        int last = 0;
        while (m.find()) {
            parts.add(new String[]{prose.substring(last, m.start()), null});
            parts.add(new String[]{null, m.group()});
            last = m.end();
        }
        parts.add(new String[]{prose.substring(last), null});
        prose.setLength(0);
    }

    private static void warn(String page, String message) {
        System.out.println("[bib] WARNING " + page + ": " + message);
    }
}
