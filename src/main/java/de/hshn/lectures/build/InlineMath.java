package de.hshn.lectures.build;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shields inline LaTeX ({@code $...$} and single-line {@code $$...$$}) from the
 * Markdown parser so that MathJax receives it unchanged.
 *
 * <p>Flexmark does not know about math delimiters. It therefore applies its
 * ordinary inline rules inside a formula: {@code _} and {@code *} open emphasis
 * ({@code $(\mu_i)_j$ ... $f_{k}$} becomes {@code <em>}), and a backslash before
 * ASCII punctuation is a Markdown escape, so {@code \{ K, Z \}} reaches the
 * browser as {@code { K, Z }} and the braces vanish from the rendered formula.
 * MathJax does not process math that contains HTML tags at all, which leaves the
 * literal {@code $...$} on the page.</p>
 *
 * <p>The fix is a pure escaping pass over the Markdown source: inside every
 * formula a backslash before ASCII punctuation is doubled ({@code \{} →
 * {@code \\{}), and the Markdown-active characters {@code _ * ` ~ [ ] < > ! |}
 * get a backslash in front. Flexmark resolves these escapes back to the plain
 * characters, so the HTML text is exactly the original formula. Anything
 * Flexmark leaves alone anyway is skipped: fenced code blocks and HTML blocks
 * (e.g. a {@code <div class="pseudocode">} with formulas inside — escaping there
 * would show up literally). Formulas spanning several lines are not touched;
 * they cannot survive HARDWRAPS in any case.</p>
 */
final class InlineMath {

    /** A single-line formula: {@code $$...$$} or {@code $...$}, neither delimiter escaped. */
    private static final Pattern SPAN = Pattern.compile(
            "(?<![\\\\$])(\\$\\$|\\$)(?!\\$)([^$\\n]+?)(?<![\\\\$])\\1(?!\\$)");

    private static final Pattern FENCE = Pattern.compile("^ {0,3}(`{3,}|~{3,})(.*)$");

    /**
     * CommonMark HTML block start conditions 1, 2 and 6 (type 6 = block-level
     * tag). Any indentation is accepted: inside a list item the block is indented
     * by the item's content offset, and a deeper-indented line outside a list is
     * an indented code block – verbatim either way, so escaping must not happen.
     */
    private static final Pattern HTML_BLOCK_START = Pattern.compile(
            "^\\s*(<(script|pre|style|textarea)(\\s|>|$)|<!--|</?("
            + "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup"
            + "|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame"
            + "|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem"
            + "|nav|noframes|ol|optgroup|option|p|param|section|source|summary|table|tbody|td"
            + "|tfoot|th|thead|title|tr|track|ul)(\\s|/?>|$))", Pattern.CASE_INSENSITIVE);

    /** Start condition 7: a line that is nothing but one complete HTML tag. */
    private static final Pattern HTML_BLOCK_TAG_LINE = Pattern.compile(
            "^\\s*(<[A-Za-z][A-Za-z0-9-]*(\\s+[^<>]*)?/?>|</[A-Za-z][A-Za-z0-9-]*\\s*>)\\s*$");

    private static final String ESCAPE_BARE = "_*`~[]<>!|";

    private InlineMath() {
    }

    /**
     * @param markdown the page body (after front matter).
     * @return the body with every single-line formula escaped for Flexmark.
     */
    static String protect(String markdown) {
        String[] lines = markdown.split("\n", -1);
        StringBuilder out = new StringBuilder(markdown.length() + 64);
        char fenceChar = 0;
        int fenceLen = 0;
        String htmlBlockEnd = null;      // non-null while inside an HTML block
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            boolean skip;
            if (fenceChar != 0) {
                Matcher m = FENCE.matcher(line);
                if (m.matches() && m.group(1).charAt(0) == fenceChar
                        && m.group(1).length() >= fenceLen && m.group(2).isBlank()) {
                    fenceChar = 0;
                }
                skip = true;
            } else if (htmlBlockEnd != null) {
                skip = true;
                if (htmlBlockEnd.isEmpty() ? line.isBlank() : line.contains(htmlBlockEnd)) {
                    htmlBlockEnd = null;
                }
            } else {
                Matcher m = FENCE.matcher(line);
                if (m.matches() && !(m.group(1).charAt(0) == '`' && m.group(2).indexOf('`') >= 0)) {
                    fenceChar = m.group(1).charAt(0);
                    fenceLen = m.group(1).length();
                    skip = true;
                } else {
                    htmlBlockEnd = htmlBlockEnd(line);
                    skip = htmlBlockEnd != null;
                }
            }
            out.append(skip ? line : escapeLine(line));
            if (i < lines.length - 1) {
                out.append('\n');
            }
        }
        return out.toString();
    }

    /**
     * @return the text that ends an HTML block started by {@code line} (empty
     *         string = a blank line), or null when the line starts none.
     */
    private static String htmlBlockEnd(String line) {
        Matcher m = HTML_BLOCK_START.matcher(line);
        if (m.find()) {
            String tag = m.group(2);
            if (tag != null) {
                return "</" + tag.toLowerCase();
            }
            return m.group(1).startsWith("<!--") ? "-->" : "";
        }
        return HTML_BLOCK_TAG_LINE.matcher(line).matches() ? "" : null;
    }

    private static String escapeLine(String line) {
        if (line.indexOf('$') < 0) {
            return line;
        }
        Matcher m = SPAN.matcher(line);
        StringBuilder sb = new StringBuilder(line.length() + 16);
        int last = 0;
        while (m.find()) {
            sb.append(line, last, m.start());
            sb.append(m.group(1)).append(escapeFormula(m.group(2))).append(m.group(1));
            last = m.end();
        }
        sb.append(line, last, line.length());
        return sb.toString();
    }

    private static String escapeFormula(String tex) {
        StringBuilder sb = new StringBuilder(tex.length() + 8);
        for (int i = 0; i < tex.length(); i++) {
            char c = tex.charAt(i);
            if (c == '\\' && i + 1 < tex.length() && isAsciiPunct(tex.charAt(i + 1))) {
                sb.append("\\\\").append(tex.charAt(i + 1));   // \{ -> \\{  (Flexmark: \{)
                i++;
            } else if (ESCAPE_BARE.indexOf(c) >= 0) {
                sb.append('\\').append(c);                      // _  -> \_   (Flexmark: _)
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private static boolean isAsciiPunct(char c) {
        return (c >= '!' && c <= '/') || (c >= ':' && c <= '@')
                || (c >= '[' && c <= '`') || (c >= '{' && c <= '~');
    }
}
