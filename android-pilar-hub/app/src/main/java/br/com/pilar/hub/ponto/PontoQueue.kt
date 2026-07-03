package br.com.pilar.hub.ponto

import android.content.Context
import br.com.pilar.hub.ApiClient
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Fila offline de batidas de ponto.
 * Persiste em JSON no diretório do app. Ao ficar online, o PilarHubService
 * chama flush() no heartbeat e reenvia todas as batidas pendentes.
 */
object PontoQueue {
    private const val FILE = "ponto_queue.json"

    @Synchronized
    fun enqueue(ctx: Context, payload: JSONObject) {
        val arr = read(ctx)
        arr.put(payload)
        write(ctx, arr)
    }

    @Synchronized
    fun flush(ctx: Context) {
        val arr = read(ctx)
        if (arr.length() == 0) return
        val restantes = JSONArray()
        for (i in 0 until arr.length()) {
            val item = arr.getJSONObject(i)
            try {
                ApiClient.post("pilar-hub-ponto", item.toString())
            } catch (e: Exception) {
                // sem internet ainda: mantém na fila
                restantes.put(item)
            }
        }
        write(ctx, restantes)
    }

    fun pendentes(ctx: Context): Int = read(ctx).length()

    private fun file(ctx: Context) = File(ctx.filesDir, FILE)

    private fun read(ctx: Context): JSONArray {
        val f = file(ctx)
        if (!f.exists()) return JSONArray()
        return try { JSONArray(f.readText()) } catch (_: Exception) { JSONArray() }
    }

    private fun write(ctx: Context, arr: JSONArray) {
        file(ctx).writeText(arr.toString())
    }
}
