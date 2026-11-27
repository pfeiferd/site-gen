package de.hshn.lectures.build;

/**
 * Splits a Markdown file into front matter ({@code key=value} lines) and body.
 * Two notations are accepted:
 *
 * <ol>
 *   <li><b>JBake style</b> – the {@code key=value} lines come first, a line
 *       {@code ~~~~~~} ends them:
 *       <pre>
 * title=Transaktionen
 * navorder=06
 * ~~~~~~
 * # Transaktionen</pre></li>
 *   <li><b>HTML comment</b> – the {@code key=value} lines sit in a comment that
 *       opens the file. Markdown viewers and editor plugins hide the comment, so
 *       the file stays plain, well-rendered Markdown:
 *       <pre>
 * &lt;!--
 * title=Transaktionen
 * navorder=06
 * --&gt;
 * # Transaktionen</pre></li>
 * </ol>
 *
 * <p>The comment counts as front matter only if it is the first non-blank
 * content of the file, its opening and closing markers stand on lines of their
 * own and every non-blank line in between is a {@code key=value} pair or a
 * {@code #} comment. Any other leading HTML comment belongs to the body. The
 * comment notation is checked first, so a body may contain {@code ~~~~~~}
 * lines without being cut.</p>
 */
final class FrontMatter {

    /** Front-matter / body separator of the JBake notation. */
    static final String SEP = "~~~~~~";

    private static final String OPEN = "<!--";
    private static final String CLOSE = "-->";

    private FrontMatter() {
    }

    /** Returns {@code [frontMatterText, bodyText]}; the front matter is empty if there is none. */
    static String[] split(String raw) {
        String text = raw.startsWith("﻿") ? raw.substring(1) : raw;   // byte order mark
        String[] lines = text.split("\n", -1);

        String[] comment = splitComment(lines);
        if (comment != null) {
            return comment;
        }
        for (int i = 0; i < lines.length; i++) {
            if (lines[i].strip().equals(SEP)) {
                return new String[]{join(lines, 0, i, true), join(lines, i + 1, lines.length, false)};
            }
        }
        return new String[]{"", text};
    }

    private static String[] splitComment(String[] lines) {
        int open = 0;
        while (open < lines.length && lines[open].isBlank()) open++;
        if (open == lines.length || !lines[open].strip().equals(OPEN)) {
            return null;
        }
        for (int i = open + 1; i < lines.length; i++) {
            String s = lines[i].strip();
            if (s.equals(CLOSE)) {
                return new String[]{join(lines, open + 1, i, true), join(lines, i + 1, lines.length, false)};
            }
            if (!s.isEmpty() && !s.startsWith("#") && s.indexOf('=') <= 0) {
                return null;   // an ordinary HTML comment, not front matter
            }
        }
        return null;           // never closed
    }

    private static String join(String[] lines, int from, int to, boolean trailingNewline) {
        StringBuilder sb = new StringBuilder();
        for (int i = from; i < to; i++) {
            sb.append(lines[i]);
            if (trailingNewline || i < to - 1) sb.append('\n');
        }
        return sb.toString();
    }
}
