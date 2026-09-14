package br.com.pilar.hub

import android.content.Context
import android.graphics.Typeface
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject

/** Renderizador Android do ambiente definido no CRM, sem WebView. */
object PainelNativo {
    private val controles = setOf("luz", "tomada", "portao", "icone", "cena", "ambiente", "imagemluz", "bubble")

    fun preencher(
        contexto: Context,
        painel: ApiClient.Painel,
        destino: LinearLayout,
        aoComandar: (JSONObject, String, (Boolean, String) -> Unit) -> Unit,
    ) {
        destino.removeAllViews()
        for (i in 0 until painel.blocos.length()) {
            val bloco = painel.blocos.optJSONObject(i) ?: continue
            val tipo = bloco.optString("tipo")
            val nome = bloco.optString("nome").ifBlank { "Controle" }
            val card = LinearLayout(contexto).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(contexto, 18), dp(contexto, 16), dp(contexto, 18), dp(contexto, 16))
                setBackgroundResource(R.drawable.bg_card)
                layoutParams = LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(contexto, 12) }
            }
            card.addView(TextView(contexto).apply {
                text = nome
                textSize = 17f
                setTextColor(contexto.getColor(R.color.text_primary))
                setTypeface(typeface, Typeface.BOLD)
            })
            val config = bloco.optJSONObject("config") ?: JSONObject()
            when {
                controles.contains(tipo) && bloco.optString("device_id").isNotBlank() -> {
                    val status = TextView(contexto).apply {
                        text = if (tipo == "portao") "Pronto para acionar" else "Consultando estado…"
                        setTextColor(contexto.getColor(R.color.text_muted)); textSize = 13f
                    }
                    val botao = Button(contexto).apply {
                        text = if (tipo == "portao") "Abrir" else "Ligar / desligar"
                        isAllCaps = false
                        setTextColor(contexto.getColor(android.R.color.white))
                        setBackgroundResource(R.drawable.btn_primary)
                    }
                    card.addView(status)
                    card.addView(botao, LinearLayout.LayoutParams(-1, dp(contexto, 52)).apply { topMargin = dp(contexto, 12) })
                    botao.setOnClickListener {
                        botao.isEnabled = false
                        val acao = if (tipo == "portao") "pulso" else "alternar"
                        aoComandar(bloco, acao) { ok, mensagem ->
                            status.text = mensagem
                            botao.isEnabled = true
                            if (ok && tipo != "portao") botao.text = "Alternar novamente"
                        }
                    }
                }
                tipo == "texto" -> card.addView(conteudo(contexto, config.optString("texto").ifBlank { nome }))
                tipo == "sensor" -> card.addView(conteudo(contexto, "Estado acompanhado pelo equipamento"))
                tipo == "clima" -> card.addView(conteudo(contexto, "Data e hora do aparelho"))
                else -> card.addView(conteudo(contexto, descricao(tipo, config)))
            }
            destino.addView(card)
        }
        if (painel.blocos.length() == 0) destino.addView(conteudo(contexto, "Este ambiente ainda não possui controles visíveis."))
    }

    private fun conteudo(ctx: Context, valor: String) = TextView(ctx).apply {
        text = valor
        textSize = 14f
        gravity = Gravity.START
        setTextColor(ctx.getColor(R.color.text_muted))
        setPadding(0, dp(ctx, 8), 0, 0)
    }

    private fun descricao(tipo: String, config: JSONObject): String = when (tipo) {
        "imagem" -> config.optString("legenda").ifBlank { "Imagem do ambiente" }
        "forma" -> "Elemento visual"
        "grafico" -> "Indicador do ambiente"
        "moeda" -> "Cotação configurada"
        "abas" -> "Ambientes vinculados"
        "expansivel" -> "Grupo de controles"
        "web" -> "Conteúdo externo configurado"
        "mapa", "rastreamento" -> "Localização configurada"
        "interfone", "portaria", "pilarfone" -> "Atalho configurado"
        else -> "Elemento $tipo"
    }

    private fun dp(ctx: Context, valor: Int): Int = (valor * ctx.resources.displayMetrics.density).toInt()
}