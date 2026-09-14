package br.com.pilar.automacao

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
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

        if (Prefs.sessaoSalva(this)) {
            abrirPainel()
            return
        }

        setContentView(R.layout.activity_ativacao)

        val campoChave = findViewById<EditText>(R.id.campo_chave)
        campoChave.setText(Prefs.chave(this))
        val campoEmail = findViewById<EditText>(R.id.campo_email)
        val campoSenha = findViewById<EditText>(R.id.campo_senha)
        val status = findViewById<TextView>(R.id.txt_status)
        val botao = findViewById<Button>(R.id.btn_ativar)

        botao.setOnClickListener {
            val chave = campoChave.text.toString().trim().uppercase()
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
                    val ativacao = ApiClient.validarChave(chave)
                    val sessao = ApiClient.autenticar(email, senha)
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
        finish()
    }
}
