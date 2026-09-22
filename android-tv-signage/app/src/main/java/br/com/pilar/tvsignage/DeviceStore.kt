package br.com.pilar.tvsignage

import android.content.Context
import android.content.SharedPreferences

object DeviceStore {
    private const val PREFS = "pilar_tv_signage"
    private const val K_TOKEN = "session_jwt"
    private const val K_DEVICE_ID = "device_id"
    private const val K_ESTABELECIMENTO_ID = "estabelecimento_id"
    private const val K_EXIT_PASSWORD = "exit_password"
    private const val K_PAIR_CODIGO = "pair_codigo"
    private const val K_PAIR_TOKEN = "pair_token"
    private const val DEFAULT_EXIT_PASSWORD = "pilar2468"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun saveSession(ctx: Context, jwt: String, deviceId: String, estabelecimentoId: String? = null) {
        prefs(ctx).edit()
            .putString(K_TOKEN, jwt)
            .putString(K_DEVICE_ID, deviceId)
            .putString(K_ESTABELECIMENTO_ID, estabelecimentoId)
            .apply()
    }

    // Guarda as credenciais de pareamento para renovar a sessão sozinho
    // (evita pedir token novamente quando o JWT expira com a TV desligada).
    fun saveCredentials(ctx: Context, codigo: String) {
        prefs(ctx).edit().putString(K_PAIR_CODIGO, codigo).apply()
    }

    fun pairCodigo(ctx: Context): String? = prefs(ctx).getString(K_PAIR_CODIGO, null)
    fun pairToken(ctx: Context): String? = prefs(ctx).getString(K_PAIR_TOKEN, null)

    fun token(ctx: Context): String? = prefs(ctx).getString(K_TOKEN, null)
    fun deviceId(ctx: Context): String? = prefs(ctx).getString(K_DEVICE_ID, null)
    fun estabelecimentoId(ctx: Context): String? = prefs(ctx).getString(K_ESTABELECIMENTO_ID, null)

    fun exitPassword(ctx: Context): String =
        prefs(ctx).getString(K_EXIT_PASSWORD, DEFAULT_EXIT_PASSWORD) ?: DEFAULT_EXIT_PASSWORD

    fun setExitPassword(ctx: Context, pwd: String) {
        prefs(ctx).edit().putString(K_EXIT_PASSWORD, pwd).apply()
    }

    fun clear(ctx: Context) {
        // Preserva a senha de saída e o código já usado: o aparelho volta a conectar sozinho
        // sem pedir o código de novo.
        val pwd = exitPassword(ctx)
        val codigo = pairCodigo(ctx)
        prefs(ctx).edit().clear()
            .putString(K_EXIT_PASSWORD, pwd)
            .putString(K_PAIR_CODIGO, codigo)
            .apply()
    }

    /** Remove tudo, inclusive o código guardado (usado só quando se quer trocar de aparelho). */
    fun clearTudo(ctx: Context) {
        val pwd = exitPassword(ctx)
        prefs(ctx).edit().clear().putString(K_EXIT_PASSWORD, pwd).apply()
    }


    fun isPaired(ctx: Context): Boolean = !token(ctx).isNullOrEmpty()
}
