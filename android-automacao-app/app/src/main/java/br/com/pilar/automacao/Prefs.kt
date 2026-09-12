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

    fun limpar(ctx: Context) {
        sp(ctx).edit().clear().apply()
    }

    /**
     * Endereço que o aplicativo abre: entrada com usuário e senha e, em seguida,
     * apenas o painel definido para a pessoa que entrou, dentro da empresa da chave.
     */
    fun urlTela(ctx: Context, tipo: String): String {
        val base = baseUrl(ctx)
        val empresa = empresaId(ctx)
        return "$base/automacao/app?tipo=$tipo&app=1&barra=0&emp=$empresa"
    }
}
