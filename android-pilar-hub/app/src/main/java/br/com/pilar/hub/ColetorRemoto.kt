package br.com.pilar.hub

import android.content.Context
import org.json.JSONObject

/** Avisa o sistema que este coletor está no ar e atende comandos vindos do painel. */
object ColetorRemoto {

    fun bater(ctx: Context) {
        val chave = Prefs.chave(ctx)
        if (chave.isBlank()) return
        val resposta = Rede.funcao(
            "coletor-dispositivo",
            JSONObject()
                .put("chave", chave)
                .put("acao", "heartbeat")
                .put("device_key", Prefs.deviceKey(ctx))
                .put("hostname", android.os.Build.MODEL)
                .put("plataforma", "Android ${android.os.Build.VERSION.RELEASE}")
                .put("versao", BuildConfig.VERSION_NAME)
                .put("unidade_id", Prefs.filialId(ctx).ifBlank { null })
                .put("unidade_nome", Prefs.filialNome(ctx).ifBlank { Prefs.empresaNome(ctx) }),
        )
        val comando = resposta.optString("comando")
        if (comando.isBlank() || comando == "null") return

        var status = "concluido"
        var resultado = "Comando recebido."
        if (comando == "atualizar_versao") {
            AtualizadorApp.atualizar(ctx) { }
            resultado = "Atualização do aplicativo iniciada no aparelho."
        } else {
            status = "erro"
            resultado = "Comando não reconhecido pelo aplicativo coletor."
        }
        runCatching {
            Rede.funcao(
                "coletor-dispositivo",
                JSONObject()
                    .put("chave", chave)
                    .put("acao", "ack")
                    .put("device_key", Prefs.deviceKey(ctx))
                    .put("status", status)
                    .put("resultado", resultado),
            )
        }
    }
}
