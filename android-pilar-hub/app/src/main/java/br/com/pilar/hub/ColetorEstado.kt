package br.com.pilar.hub

/** Situação atual do coletor, mostrada na tela do aplicativo. */
object ColetorEstado {
    data class Item(val nome: String, val situacao: String)

    @Volatile var rodando: Boolean = false
    @Volatile var ultimaSync: String = ""
    @Volatile var marcacoesEnviadas: Int = 0
    @Volatile var comandosExecutados: Int = 0
    @Volatile var ultimoErro: String = ""
    @Volatile var relogios: List<Item> = emptyList()
    @Volatile var dispositivos: List<Item> = emptyList()

    fun resumo(): String = buildString {
        append(if (rodando) "Coletor ligado" else "Coletor parado")
        if (ultimaSync.isNotBlank()) append(" · última sincronização às $ultimaSync")
        append(" · $marcacoesEnviadas marcações · $comandosExecutados comandos")
    }
}
