package br.com.pilar.hub

/** Situação atual do coletor, mostrada na tela do aplicativo. */
object ColetorEstado {
    data class Item(val nome: String, val situacao: String)

    @Volatile var rodando: Boolean = false
    @Volatile var ultimaSync: String = ""
    @Volatile var automacaoUltimaSync: String = ""
    @Volatile var marcacoesEnviadas: Int = 0
    @Volatile var comandosExecutados: Int = 0
    @Volatile var erros: Int = 0
    @Volatile var ultimoErro: String = ""
    @Volatile var relogios: List<Item> = emptyList()
    @Volatile var dispositivos: List<Item> = emptyList()

    fun limparDiagnostico() {
        erros = 0
        ultimoErro = ""
    }

    fun resumo(): String = buildString {
        append(if (rodando) "Coletor ligado" else "Coletor parado")
        if (ultimaSync.isNotBlank()) append(" · ponto às $ultimaSync")
        if (automacaoUltimaSync.isNotBlank()) append(" · automação às $automacaoUltimaSync")
        append("\n$marcacoesEnviadas marcações · $comandosExecutados comandos · $erros avisos")
    }
}
