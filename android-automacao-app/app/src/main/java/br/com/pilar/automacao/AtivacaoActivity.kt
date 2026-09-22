package br.com.pilar.automacao

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Entrada única: ativa o aparelho, autentica o usuário e abre o painel atribuído no cadastro. */
class AtivacaoActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Prefs.ativado(this) && Prefs.sessaoSalva(this)) {
            abrirPainel()
            return
        }

        setContentView(R.layout.activity_ativacao)

        val campoChave = findViewById<EditText>(R.id.campo_chave)
        campoChave.setText(Prefs.chave(this))
        val rotuloChave = findViewById<TextView>(R.id.txt_rotulo_chave)

        // Já ativado antes: a chave não é pedida outra vez.
        if (Prefs.ativado(this)) {
            campoChave.visibility = View.GONE
            rotuloChave.visibility = View.GONE
        }

        // Aparelho já ativado com sessão anterior: entra sozinho renovando a sessão.
        if (Prefs.ativado(this) && Prefs.refreshToken(this).isNotEmpty()) {
            val status0 = findViewById<TextView>(R.id.txt_status)
            status0.text = "Entrando..."
            CoroutineScope(Dispatchers.IO).launch {
                val renovada = runCatching {
                    val sessao = ApiClient.renovarSessao(Prefs.refreshToken(this@AtivacaoActivity), tipoTela())
                    val ambiente = if (tipoTela() == "tablet") sessao.ambienteTablet else sessao.ambienteCelular
                    if (ambiente.isBlank() || ambiente == "null") throw IllegalStateException("sem painel")
                    Pair(sessao, ambiente)
                }
                withContext(Dispatchers.Main) {
                    renovada.onSuccess { (sessao, ambiente) ->
                        Prefs.salvarSessao(
                            this@AtivacaoActivity,
                            sessao.accessToken,
                            sessao.refreshToken,
                            sessao.expiresAt,
                            sessao.userId,
                            ambiente,
                        )
                        abrirPainel()
                    }.onFailure {
                        status0.text = "Confirme seu e-mail e senha para continuar"
                    }
                }
            }
        }
        val campoEmail = findViewById<EditText>(R.id.campo_email)
        val campoSenha = findViewById<EditText>(R.id.campo_senha)
        val status = findViewById<TextView>(R.id.txt_status)
        val botao = findViewById<Button>(R.id.btn_ativar)

        botao.setOnClickListener {
            val chave = campoChave.text.toString().trim().uppercase()
                .ifBlank { Prefs.chave(this@AtivacaoActivity) }
            val email = campoEmail.text.toString().trim()
            val senha = campoSenha.text.toString()
            if (chave.isBlank() || email.isBlank() || senha.isBlank()) {
                status.text = "Informe a chave, o e-mail e a senha"
                return@setOnClickListener
            }
            botao.isEnabled = false
            status.text = "Validando acesso..."
            CoroutineScope(Dispatchers.IO).launch {
                val resultado = runCatching {
                    val sessao = ApiClient.autenticar(email, senha)
                    val ativacao = ApiClient.validarChave(chave)
                    if (sessao.estabelecimentoId != ativacao.empresaId) {
                        throw IllegalStateException("Este usuário pertence a outra empresa")
                    }
                    val ambiente = if (tipoTela() == "tablet") sessao.ambienteTablet else sessao.ambienteCelular
                    if (ambiente.isBlank() || ambiente == "null") {
                        throw IllegalStateException("Nenhum painel foi definido para este aparelho")
                    }
                    Pair(ativacao, Pair(sessao, ambiente))
                }
                withContext(Dispatchers.Main) {
                    resultado.onSuccess { (ativacao, sessaoComAmbiente) ->
                        val (sessao, ambiente) = sessaoComAmbiente
                        Prefs.salvarAtivacao(this@AtivacaoActivity, chave, ativacao.empresaId, ativacao.empresaNome, ativacao.dispositivoId)
                        Prefs.salvarSessao(this@AtivacaoActivity, sessao.accessToken, sessao.refreshToken, sessao.expiresAt, sessao.userId, ambiente)
                        abrirPainel()
                    }.onFailure { erro ->
                        status.text = erro.message ?: "Não foi possível entrar"
                        botao.isEnabled = true
                    }
                }
            }
        }
    }

    private fun tipoTela(): String {
        val grande = (resources.configuration.screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK) >=
            Configuration.SCREENLAYOUT_SIZE_LARGE
        return if (grande) "tablet" else "celular"
    }

    private fun abrirPainel() {
        startActivity(Intent(this, MainActivity::class.java))
        overridePendingTransition(0, 0)
        finish()
    }
}
