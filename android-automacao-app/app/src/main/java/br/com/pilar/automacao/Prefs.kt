package br.com.pilar.automacao

import android.content.Context
import android.content.SharedPreferences

/** Guarda a chave da empresa e o endereço do sistema usados pelo aparelho. */
object Prefs {
    private const val ARQUIVO = "pilar_automacao"
    const val PADRAO_URL = BuildConfig.APP_BASE_URL

    private fun sp(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)

    fun baseUrl(ctx: Context): String =
        sp(ctx).getString("base_url", PADRAO_URL)?.trim()?.trimEnd('/').orEmpty()
            .ifBlank { PADRAO_URL }

    fun chave(ctx: Context): String = sp(ctx).getString("chave", "")?.trim().orEmpty()

    fun empresaId(ctx: Context): String = sp(ctx).getString("empresa_id", "")?.trim().orEmpty()

    fun empresaNome(ctx: Context): String = sp(ctx).getString("empresa_nome", "")?.trim().orEmpty()

    fun ativado(ctx: Context): Boolean = chave(ctx).isNotEmpty() && empresaId(ctx).isNotEmpty()

    fun sessaoSalva(ctx: Context): Boolean =
        accessToken(ctx).isNotEmpty() && refreshToken(ctx).isNotEmpty() && ambiente(ctx).isNotEmpty()

    fun accessToken(ctx: Context): String = sp(ctx).getString("access_token", "")?.trim().orEmpty()

    fun refreshToken(ctx: Context): String = sp(ctx).getString("refresh_token", "")?.trim().orEmpty()

    fun expiresAt(ctx: Context): Long = sp(ctx).getLong("expires_at", 0L)

    fun userId(ctx: Context): String = sp(ctx).getString("user_id", "")?.trim().orEmpty()

    fun ambiente(ctx: Context): String = sp(ctx).getString("ambiente", "")?.trim().orEmpty()

    fun salvarAtivacao(
        ctx: Context,
        baseUrl: String,
        chave: String,
        empresaId: String,
        empresaNome: String,
    ) {
        sp(ctx).edit()
            .putString("base_url", baseUrl.trim().trimEnd('/'))
            .putString("chave", chave.trim().uppercase())
            .putString("empresa_id", empresaId.trim())
            .putString("empresa_nome", empresaNome.trim())
            .apply()
    }

    fun salvarSessao(
        ctx: Context,
        accessToken: String,
        refreshToken: String,
        expiresAt: Long,
        userId: String,
        ambiente: String,
    ) {
        sp(ctx).edit()
            .putString("access_token", accessToken)
            .putString("refresh_token", refreshToken)
            .putLong("expires_at", expiresAt)
            .putString("user_id", userId)
            .putString("ambiente", ambiente)
            .apply()
    }

    fun limparSessao(ctx: Context) {
        sp(ctx).edit()
            .remove("access_token")
            .remove("refresh_token")
            .remove("expires_at")
            .remove("user_id")
            .remove("ambiente")
            .apply()
    }

    fun limpar(ctx: Context) {
        sp(ctx).edit().clear().apply()
    }

    fun urlTela(ctx: Context, tipo: String): String {
        val base = baseUrl(ctx)
        return "$base/automacao/tela?ambiente=${ambiente(ctx)}&tipo=$tipo&app=1&barra=0"
    }
}
