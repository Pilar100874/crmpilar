package br.com.pilar.hub

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!Prefs.ativado(this)) {
            startActivity(Intent(this, AtivacaoActivity::class.java))
            finish()
            return
        }
        if (!Prefs.sessaoSalva(this)) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val btnAtualizar = findViewById<android.widget.Button>(R.id.btnAtualizarApp)
        val versaoAtual = try {
            packageManager.getPackageInfo(packageName, 0).versionName
        } catch (_: Exception) { "" }
        if (versaoAtual.isNotEmpty()) btnAtualizar.text = "Atualizar aplicativo · v$versaoAtual"
        btnAtualizar.setOnClickListener {
            btnAtualizar.isEnabled = false
            AtualizadorApp.atualizar(this) { msg ->
                android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show()
                if (!msg.endsWith("…")) btnAtualizar.isEnabled = true
            }
        }

        findViewById<android.widget.Button>(R.id.btnRecarregar).setOnClickListener { carregar() }
        findViewById<android.widget.Button>(R.id.btnSair).setOnClickListener {
            Prefs.limparSessao(this)
            startActivity(Intent(this, LoginActivity::class.java)); finish()
        }
        val lista = findViewById<LinearLayout>(R.id.listaBlocos)
        val ponto = findViewById<LinearLayout>(R.id.painelPonto)
        findViewById<Button>(R.id.btnAutomacao).setOnClickListener {
            lista.visibility = View.VISIBLE
            ponto.visibility = View.GONE
            findViewById<TextView>(R.id.txtTitulo).text = "Automação"
        }
        findViewById<Button>(R.id.btnPonto).setOnClickListener {
            lista.visibility = View.GONE
            ponto.visibility = View.VISIBLE
            findViewById<TextView>(R.id.txtTitulo).text = "Relógio de ponto"
            carregarFuncionario()
        }
        configurarPonto()
        carregar()
        AtualizadorApp.processarComandoRemoto(this)
    }

    private fun carregar() {
        val status = findViewById<TextView>(R.id.txtStatus)
        val lista = findViewById<LinearLayout>(R.id.listaBlocos)
        status.text = "Carregando ambiente…"
        CoroutineScope(Dispatchers.IO).launch {
            val resultado = runCatching { ApiClient.carregarPainel(Prefs.accessToken(this@MainActivity), Prefs.ambiente(this@MainActivity)) }
            withContext(Dispatchers.Main) {
                resultado.onSuccess { painel ->
                    findViewById<TextView>(R.id.txtTitulo).text = painel.ambiente.optString("nome", "Automação")
                    status.text = "Atualizado agora"
                    PainelNativo.preencher(this@MainActivity, painel, lista) { bloco, acao, retorno ->
                        CoroutineScope(Dispatchers.IO).launch {
                            val resposta = runCatching {
                                ApiClient.comando(Prefs.accessToken(this@MainActivity), bloco.getString("device_id"), bloco.optInt("canal", 0), acao)
                            }
                            withContext(Dispatchers.Main) {
                                resposta.onSuccess { retorno(it.optBoolean("ok"), it.optString("mensagem").ifBlank { if (it.optBoolean("ok")) "Comando enviado" else "Falha no comando" }) }
                                    .onFailure { retorno(false, it.message ?: "Falha no comando") }
                            }
                        }
                    }
                }.onFailure { status.text = it.message ?: "Não foi possível carregar o ambiente" }
            }
        }
    }

    private var funcionarioId: String? = null

    private fun carregarFuncionario() {
        val texto = findViewById<TextView>(R.id.txtFuncionario)
        texto.text = "Carregando funcionário…"
        CoroutineScope(Dispatchers.IO).launch {
            val resultado = runCatching { ApiClient.funcionarioAtual(Prefs.accessToken(this@MainActivity), Prefs.userId(this@MainActivity)) }
            withContext(Dispatchers.Main) {
                resultado.onSuccess { funcionario ->
                    funcionarioId = funcionario?.optString("id")?.takeIf { it.isNotBlank() }
                    texto.text = funcionario?.optString("nome")?.takeIf { it.isNotBlank() }
                        ?: "Seu usuário não está vinculado a um funcionário ativo"
                    habilitarPonto(funcionarioId != null)
                }.onFailure {
                    texto.text = it.message ?: "Não foi possível carregar o funcionário"
                    habilitarPonto(false)
                }
            }
        }
    }

    private fun configurarPonto() {
        mapOf(
            R.id.btnEntrada to "entrada",
            R.id.btnInicioIntervalo to "inicio_intervalo",
            R.id.btnFimIntervalo to "fim_intervalo",
            R.id.btnSaida to "saida",
        ).forEach { (id, tipo) -> findViewById<Button>(id).setOnClickListener { registrarPonto(tipo) } }
    }

    private fun habilitarPonto(habilitado: Boolean) {
        listOf(R.id.btnEntrada, R.id.btnInicioIntervalo, R.id.btnFimIntervalo, R.id.btnSaida)
            .forEach { findViewById<Button>(it).isEnabled = habilitado }
    }

    private fun registrarPonto(tipo: String) {
        val id = funcionarioId ?: return
        val status = findViewById<TextView>(R.id.txtStatusPonto)
        habilitarPonto(false)
        status.text = "Registrando marcação…"
        CoroutineScope(Dispatchers.IO).launch {
            val resultado = runCatching { ApiClient.registrarPonto(Prefs.accessToken(this@MainActivity), id, tipo) }
            withContext(Dispatchers.Main) {
                resultado.onSuccess { status.text = "Marcação registrada com sucesso" }
                    .onFailure { status.text = it.message ?: "Não foi possível registrar a marcação" }
                habilitarPonto(true)
            }
        }
    }
}
