package br.com.pilar.hub

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Lê os relógios de ponto da rede local e envia as marcações ao servidor. */
object PontoColetor {

    /** Só marcamos um relógio como fora do ar depois de algumas falhas seguidas. */
    private const val FALHAS_PARA_OFFLINE = 3
    private val falhasSeguidas = mutableMapOf<String, Int>()

    fun sincronizar(ctx: Context) {
        val chave = Prefs.chave(ctx)
        if (chave.isBlank()) throw IllegalStateException("Aparelho sem chave da empresa.")
        val filial = Prefs.filialId(ctx).ifBlank { null }

        val boot = Rede.funcao(
            "ponto-coletor-bootstrap",
            JSONObject().put("chave", chave).put("filial_id", filial),
        )
        val equipamentos = Rede.lista(boot, "equipamentos")
        val situacoes = mutableListOf<ColetorEstado.Item>()
        val atualizacoes = JSONArray()

        for (i in 0 until equipamentos.length()) {
            val eq = equipamentos.optJSONObject(i) ?: continue
            val id = eq.optString("id")
            if (filial != null) {
                val doEquipamento = eq.optString("filial_id").ifBlank { eq.optString("unidade_id") }
                if (doEquipamento.isNotBlank() && doEquipamento != filial) continue
            }
            val nome = eq.optString("nome").ifBlank { eq.optString("ip") }
            val ultimoNsr = Prefs.nsr(ctx, id)
            var erro: String? = null
            var batidas: List<ControlId.Batida> = emptyList()
            var resultadoTeste: String? = null

            if (eq.optBoolean("solicitar_teste", false)) {
                resultadoTeste = ControlId.testarConexao(eq)
            }

            try {
                batidas = ControlId.lerBatidas(eq, ultimoNsr)
                falhasSeguidas[id] = 0
            } catch (e: Exception) {
                val falhas = (falhasSeguidas[id] ?: 0) + 1
                falhasSeguidas[id] = falhas
                if (falhas >= FALHAS_PARA_OFFLINE) {
                    erro = e.message ?: "Sem resposta na rede local"
                    ColetorEstado.erros++
                }
            }
            val falhando = (falhasSeguidas[id] ?: 0) >= FALHAS_PARA_OFFLINE
            val situacao = if (falhando) "offline" else "online"

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
                    ColetorEstado.erros++
                }
            }

            atualizacoes.put(
                JSONObject()
                    .put("id", id)
                    .put("status", situacao)
                    .put("ultimo_erro", erro)
                    .put("ultima_sync", agoraIso())
                    .put("filial_id", filial)
                    .put("resultado_teste", resultadoTeste),
            )
            situacoes += ColetorEstado.Item(
                nome = nome,
                situacao = resultadoTeste
                    ?: erro
                    ?: if (falhando) "Tentando reconectar…"
                    else if (batidas.isEmpty()) "Sem marcações novas"
                    else "${batidas.size} marcações enviadas",
            )
            if (erro != null) ColetorEstado.ultimoErro = "$nome: $erro"
        }

        ColetorEstado.relogios = situacoes
        if (atualizacoes.length() > 0) {
            runCatching {
                Rede.funcao(
                    "ponto-coletor-bootstrap",
                    JSONObject().put("chave", chave).put("filial_id", filial).put("status_updates", atualizacoes),
                )
            }
        }
    }

    fun agoraIso(): String =
        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }.format(java.util.Date())
}
