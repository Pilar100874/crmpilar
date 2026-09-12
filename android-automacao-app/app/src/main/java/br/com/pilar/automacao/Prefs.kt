package br.com.pilar.automacao

import android.content.Context
import android.content.SharedPreferences

/** Guarda o endereço do sistema e o ambiente que o aparelho deve abrir. */
object Prefs {
    private const val ARQUIVO = "pilar_automacao"
    const val PADRAO_URL = BuildConfig.APP_BASE_URL

    private fun sp(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(ARQUIVO, Context.MODE_PRIVATE)

    fun baseUrl(ctx: Context): String =
        sp(ctx).getString("base_url", PADRAO_URL)?.trim()?.trimEnd('/').orEmpty()
            .ifBlank { PADRAO_URL }

    fun ambiente(ctx: Context): String = sp(ctx).getString("ambiente", "")?.trim().orEmpty()

    fun rolagem(ctx: Context): Boolean = sp(ctx).getBoolean("rolagem", true)

    fun configurado(ctx: Context): Boolean = sp(ctx).getBoolean("configurado", false)

    fun salvar(ctx: Context, baseUrl: String, ambiente: String, rolagem: Boolean) {
        sp(ctx).edit()
            .putString("base_url", baseUrl.trim().trimEnd('/'))
            .putString("ambiente", ambiente.trim())
            .putBoolean("rolagem", rolagem)
            .putBoolean("configurado", true)
            .apply()
    }

    /**
     * Monta o endereço que o aplicativo abre.
     * Sem painel escolhido no aparelho, abre a entrada com usuário e senha e
     * mostra apenas o painel definido para a pessoa que entrou.
     */
    fun urlTela(ctx: Context, tipo: String): String {
        val base = baseUrl(ctx)
        val amb = ambiente(ctx)
        val barra = if (rolagem(ctx)) "1" else "0"
        return if (amb.isBlank())
            "$base/automacao/app?tipo=$tipo&barra=$barra&app=1"
        else
            "$base/automacao/tela?ambiente=$amb&tipo=$tipo&barra=$barra&app=1"
    }
}
