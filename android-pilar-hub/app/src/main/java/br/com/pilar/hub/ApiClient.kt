package br.com.pilar.hub

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

object ApiClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val JSON = "application/json; charset=utf-8".toMediaType()

    fun post(path: String, jsonBody: String, extraHeaders: Map<String, String> = emptyMap()): String {
        val builder = Request.Builder()
            .url("${BuildConfig.SUPABASE_URL}/functions/v1/$path")
            .addHeader("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
            .addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .addHeader("Content-Type", "application/json")
        for ((k, v) in extraHeaders) builder.addHeader(k, v)
        val req = builder.post(jsonBody.toRequestBody(JSON)).build()
        client.newCall(req).execute().use { r ->
            return r.body?.string().orEmpty()
        }
    }
}
