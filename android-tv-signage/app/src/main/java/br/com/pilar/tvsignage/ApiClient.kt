package br.com.pilar.tvsignage

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

    private fun baseHeaders(builder: Request.Builder, deviceToken: String? = null) {
        builder.addHeader("Authorization", "Bearer ${BuildConfig.SUPABASE_ANON_KEY}")
        builder.addHeader("apikey", BuildConfig.SUPABASE_ANON_KEY)
        builder.addHeader("Content-Type", "application/json")
        if (!deviceToken.isNullOrEmpty()) builder.addHeader("x-device-token", deviceToken)
    }

    fun post(path: String, jsonBody: String, deviceToken: String? = null): Pair<Int, String> {
        val b = Request.Builder().url("${BuildConfig.SUPABASE_URL}/functions/v1/$path")
        baseHeaders(b, deviceToken)
        val req = b.post(jsonBody.toRequestBody(JSON)).build()
        client.newCall(req).execute().use { r ->
            return r.code to (r.body?.string().orEmpty())
        }
    }

    fun get(path: String, deviceToken: String? = null): Pair<Int, String> {
        val b = Request.Builder().url("${BuildConfig.SUPABASE_URL}/functions/v1/$path")
        baseHeaders(b, deviceToken)
        val req = b.get().build()
        client.newCall(req).execute().use { r ->
            return r.code to (r.body?.string().orEmpty())
        }
    }
}
