package br.com.pilar.hub

import android.content.Context
import org.json.JSONObject

/** Lista as unidades (filiais) da empresa para escolher qual este aparelho atende. */
object ColetorFiliais {

    data class Filial(val id: String, val nome: String)

    fun listar(ctx: Context): List<Filial> {
        val chave = Prefs.chave(ctx)
        if (chave.isBlank()) throw IllegalStateException("Aparelho sem chave da empresa.")
        val resposta = Rede.funcao("ponto-coletor-filiais", JSONObject().put("chave", chave))
        val lista = Rede.lista(resposta, "filiais")
        return (0 until lista.length()).mapNotNull { i ->
            val f = lista.optJSONObject(i) ?: return@mapNotNull null
            val id = f.optString("id")
            if (id.isBlank()) return@mapNotNull null
            val cidade = f.optString("cidade")
            val uf = f.optString("uf")
            val complemento = listOf(cidade, uf).filter { it.isNotBlank() }.joinToString("/")
            Filial(id, f.optString("nome").ifBlank { "Unidade" } + if (complemento.isNotBlank()) " — $complemento" else "")
        }
    }
}
