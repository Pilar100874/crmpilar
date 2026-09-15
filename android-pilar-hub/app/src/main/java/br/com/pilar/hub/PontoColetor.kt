package br.com.pilar.hub

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Lê os relógios de ponto da rede local e envia as marcações ao servidor. */
object PontoColetor {

    fun sincronizar(ctx: Context) {
        val chave = Prefs.chave(ctx)
        if (chave.isBlank()) throw IllegalStateException("Aparelho sem chave da empresa.")

        val boot = Rede.funcao("ponto-coletor-bootstrap", JSONObject().put("chave", chave))
        val equipamentos = Rede.lista(boot, "equipamentos")
        val situacoes = mutableListOf<ColetorEstado.Item>()
        val atualizacoes = JSONArray()

        for (i in 0 until equipamentos.length()) {
            val eq = equipamentos.optJSONObject(i) ?: continue
            val id = eq.optString("id")
            val nome = eq.optString("nome").ifBlank { eq.optString("ip") }
            val ultimoNsr = Prefs.nsr(ctx, id)
            var situacao = "online"
            var erro: String? = null
            var batidas: List<ControlId.Batida> = emptyList()

            try {
                batidas = ControlId.lerBatidas(eq, ultimoNsr)
            } catch (e: Exception) {
                situacao = "offline"
                erro = e.message ?: "Sem resposta na rede local"
            }

            if (batidas.isNotEmpty()) {
                val registros = JSONArray()
                batidas.forEach { b ->
                    registros.put(
                        JSONObject()
                            .put("cpf", b.cpf)
                            .put("data_hora", b.dataHora)
                            .put("tipo", "auto")
                            .put("equipamento_id", id),
                    )
                }
                try {
                    val resposta = Rede.funcao(
                        "ponto-coletor-ingest",
                        JSONObject()
                            .put("empresa_id", eq.optString("empresa_id"))
                            .put("equipamento_id", id)
                            .put("chave_comunicacao", eq.optString("chave_comunicacao"))
                            .put("registros", registros),
                        mapOf("x-chave-comunicacao" to eq.optString("chave_comunicacao")),
                    )
                    ColetorEstado.marcacoesEnviadas += resposta.optInt("inseridos", 0)
                    Prefs.salvarNsr(ctx, id, batidas.maxOf { it.nsr })
                } catch (e: Exception) {
                    erro = e.message ?: "Falha ao enviar as marcações"
                }
            }

            atualizacoes.put(
                JSONObject()
                    .put("id", id)
                    .put("status", situacao)
                    .put("ultimo_erro", erro)
                    .put("ultima_sync", agoraIso()),
            )
            situacoes += ColetorEstado.Item(
                nome = nome,
                situacao = erro ?: if (batidas.isEmpty()) "Sem marcações novas" else "${batidas.size} marcações enviadas",
            )
        }

        ColetorEstado.relogios = situacoes
        if (atualizacoes.length() > 0) {
            runCatching {
                Rede.funcao(
                    "ponto-coletor-bootstrap",
                    JSONObject().put("chave", chave).put("status_updates", atualizacoes),
                )
            }
        }
    }

    fun agoraIso(): String =
        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }.format(java.util.Date())
}
