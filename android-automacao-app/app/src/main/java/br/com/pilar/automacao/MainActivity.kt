package br.com.pilar.automacao

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {
    private val atualizacaoHandler = Handler(Looper.getMainLooper())
    private val verificarAtualizacao = object : Runnable {
        override fun run() {
            AtualizadorApp.processarComandoRemoto(this@MainActivity)
            atualizacaoHandler.postDelayed(this, 60_000L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!Prefs.ativado(this)) {
            startActivity(Intent(this, AtivacaoActivity::class.java))
            finish()
            return
        }
        if (!Prefs.sessaoSalva(this)) {
            startActivity(Intent(this, AtivacaoActivity::class.java))
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
            startActivity(Intent(this, AtivacaoActivity::class.java)); finish()
        }
        carregar()
        atualizacaoHandler.post(verificarAtualizacao)
    }

    override fun onDestroy() {
        atualizacaoHandler.removeCallbacks(verificarAtualizacao)
        super.onDestroy()
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
}
