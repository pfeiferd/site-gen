package de.hshn.lectures.build;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Finds the fenced code blocks of one language in a Markdown text, the way the
 * Markdown parser sees them – so that the build tools and the page template
 * count the same blocks.
 *
 * <p>A fence is a line of at least three backticks or tildes (up to three
 * spaces of indentation allowed), closed by a line of at least as many of the
 * same character. Anything inside a fence is content, including lines that look
 * like fences of a <em>different</em> or <em>shorter</em> kind. That matters for
 * tutorials: a <code>````</code> block that <em>shows</em> a <code>```tikz</code>
 * example is one plain block, not a TikZ figure – a naive regular expression
 * would render the example and shift the numbering of every block after it.</p>
 */
final class FencedBlocks {

    private static final Pattern FENCE = Pattern.compile("^ {0,3}(`{3,}|~{3,})(.*)$");

    private FencedBlocks() {
    }

    /**
     * @param markdown the Markdown source.
     * @param language the language tag of the wanted blocks, e.g. {@code tikz}.
     * @return the bodies of all top-level fenced blocks tagged with exactly
     *         that language (first word of the info string), in document order.
     */
    static List<String> bodies(String markdown, String language) {
        List<String> bodies = new ArrayList<>();
        String[] lines = markdown.split("\\r?\\n", -1);
        char fenceChar = 0;
        int fenceLen = 0;
        boolean wanted = false;
        StringBuilder body = null;
        for (int i = frontMatterEnd(lines); i < lines.length; i++) {
            String line = lines[i];
            Matcher m = FENCE.matcher(line);
            if (fenceChar == 0) {
                if (m.matches()) {
                    String fence = m.group(1);
                    String info = m.group(2).strip();
                    // Ein Backtick-Zaun darf in der Info-Zeile keine Backticks tragen.
                    if (fence.charAt(0) == '`' && info.indexOf('`') >= 0) {
                        continue;
                    }
                    fenceChar = fence.charAt(0);
                    fenceLen = fence.length();
                    String tag = info.isEmpty() ? "" : info.split("[\\s{,]")[0];
                    wanted = tag.equals(language);
                    body = wanted ? new StringBuilder() : null;
                }
            } else if (m.matches() && m.group(1).charAt(0) == fenceChar
                    && m.group(1).length() >= fenceLen && m.group(2).isBlank()) {
                if (wanted) {
                    bodies.add(body.toString());
                }
                fenceChar = 0;
                wanted = false;
                body = null;
            } else if (wanted) {
                body.append(line).append('\n');
            }
        }
        return bodies;
    }

    /**
     * Index of the first line after JBake's front matter – {@code key=value}
     * lines closed by a line of tildes – or 0 when there is none. The tildes
     * would otherwise open a fence that never closes.
     */
    private static int frontMatterEnd(String[] lines) {
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (line.matches("~{6,}\\s*")) {
                return i + 1;
            }
            if (!line.isBlank() && line.indexOf('=') < 0) {
                return 0;
            }
        }
        return 0;
    }
}
