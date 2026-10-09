package br.com.pilar.hub.voz

import android.util.Base64
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.abs

/** Conversões de áudio: G.711 µ-law (PCMU) ⇄ PCM 16 bits e WAV. */
object Audio {
    fun ulawParaPcm(u: Byte): Short {
        val v = u.toInt().inv() and 0xFF
        val sinal = v and 0x80; val exp = (v shr 4) and 7; val man = v and 0x0F
        var amostra = ((man shl 3) + 0x84) shl exp
        amostra -= 0x84
        return (if (sinal != 0) -amostra else amostra).toShort()
    }

    fun pcmParaUlaw(s: Short): Byte {
        var p = s.toInt()
        val sinal = if (p < 0) 0x80 else 0
        if (p < 0) p = -p
        if (p > 32635) p = 32635
        p += 0x84
        var exp = 7; var m = 0x4000
        while (exp > 0 && (p and m) == 0) { exp--; m = m shr 1 }
        val man = (p shr (exp + 3)) and 0x0F
        return ((sinal or (exp shl 4) or man).inv() and 0xFF).toByte()
    }

    fun energia(pcm: ShortArray): Int = if (pcm.isEmpty()) 0 else pcm.sumOf { abs(it.toInt()) } / pcm.size

    fun wav8k(pcm: ShortArray): ByteArray {
        val dados = ByteBuffer.allocate(pcm.size * 2).order(ByteOrder.LITTLE_ENDIAN)
        pcm.forEach { dados.putShort(it) }
        val b = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
        b.put("RIFF".toByteArray()); b.putInt(36 + pcm.size * 2); b.put("WAVE".toByteArray())
        b.put("fmt ".toByteArray()); b.putInt(16); b.putShort(1); b.putShort(1); b.putInt(8000); b.putInt(16000)
        b.putShort(2); b.putShort(16); b.put("data".toByteArray()); b.putInt(pcm.size * 2)
        return ByteArrayOutputStream().apply { write(b.array()); write(dados.array()) }.toByteArray()
    }

    /** Lê um WAV PCM 16 bits (qualquer taxa/canais) e devolve PCM mono 8 kHz. */
    fun wavPara8k(b64: String): ShortArray {
        val bytes = Base64.decode(b64, Base64.DEFAULT)
        val bb = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
        var taxa = 24000; var canais = 1; var pos = 12; var ini = 44; var tam = bytes.size - 44
        while (pos + 8 <= bytes.size) {
            val id = String(bytes, pos, 4); val t = bb.getInt(pos + 4)
            if (id == "fmt ") { canais = bb.getShort(pos + 10).toInt(); taxa = bb.getInt(pos + 12) }
            if (id == "data") { ini = pos + 8; tam = minOf(if (t <= 0) bytes.size - ini else t, bytes.size - ini); break }
            pos += 8 + t
        }
        val n = tam / 2 / canais
        val mono = ShortArray(n) { i -> bb.getShort(ini + i * 2 * canais) }
        if (taxa == 8000) return mono
        val saida = (n.toLong() * 8000 / taxa).toInt()
        return ShortArray(saida) { i -> mono[minOf(n - 1, (i.toLong() * taxa / 8000).toInt())] }
    }

    fun paraBase64(b: ByteArray): String = Base64.encodeToString(b, Base64.NO_WRAP)
}
