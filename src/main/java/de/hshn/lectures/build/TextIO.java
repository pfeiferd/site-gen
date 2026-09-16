package de.hshn.lectures.build;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Reads text files (content and config, e.g. {@code meta.properties}) tolerantly:
 * strict UTF-8 first so proper UTF-8 files decode correctly, with a fallback to
 * ISO-8859-1 for files an editor saved in a legacy single-byte encoding. This way
 * names with umlauts (ä, ö, ü, …) never crash the build and render correctly.
 */
final class TextIO {

    private TextIO() {
    }

    static String read(Path file) throws IOException {
        byte[] bytes = Files.readAllBytes(file);
        CharsetDecoder utf8 = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try {
            return utf8.decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException notUtf8) {
            // ISO-8859-1 maps every byte 1:1 and never fails; covers Latin-1 files.
            return new String(bytes, StandardCharsets.ISO_8859_1);
        }
    }
}
