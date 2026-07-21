package br.com.pilar.tvsignage

import android.content.Context
import android.content.SharedPreferences

object DeviceStore {
    private const val PREFS = "pilar_tv_signage"
    private const val K_TOKEN = "session_jwt"
    private const val K_DEVICE_ID = "device_id"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveSession(ctx: Context, jwt: String, deviceId: String) {
        prefs(ctx).edit().putString(K_TOKEN, jwt).putString(K_DEVICE_ID, deviceId).apply()
    }

    fun token(ctx: Context): String? = prefs(ctx).getString(K_TOKEN, null)
    fun deviceId(ctx: Context): String? = prefs(ctx).getString(K_DEVICE_ID, null)

    fun clear(ctx: Context) {
        prefs(ctx).edit().clear().apply()
    }

    fun isPaired(ctx: Context): Boolean = !token(ctx).isNullOrEmpty()
}
