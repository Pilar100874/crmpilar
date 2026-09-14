package br.com.pilar.hub

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

/** Entrada própria do Pilar Automação, sem abrir a tela geral do CRM. */
class LoginActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (!Prefs.ativado(this)) {
            startActivity(Intent(this, AtivacaoActivity::class.java))
            finish()
            return
        }
        if (Prefs.sessaoSalva(this)) {
            abrirPainel()
            return
        }

        setContentView(R.layout.activity_login)
        findViewById<TextView>(R.id.txt_empresa).text = Prefs.empresaNome(this)
        val email = findViewById<EditText>(R.id.campo_email)
        val senha = findViewById<EditText>(R.id.campo_senha)
        val status = findViewById<TextView>(R.id.txt_status_login)
        val entrar = findViewById<Button>(R.id.btn_entrar)
        findViewById<Button>(R.id.btn_trocar_empresa).setOnClickListener {
            Prefs.limpar(this)
            startActivity(Intent(this, AtivacaoActivity::class.java))
            finish()
        }

        entrar.setOnClickListener {
            val login = email.text.toString().trim()
            val password = senha.text.toString()
            if (login.isBlank() || password.isBlank()) {
                status.text = "Informe seu e-mail e senha"
                return@setOnClickListener
            }
            entrar.isEnabled = false
            status.text = "Entrando..."
            CoroutineScope(Dispatchers.IO).launch {
                val resultado = runCatching { ApiClient.autenticar(login, password) }
                withContext(Dispatchers.Main) {
                    resultado.onSuccess { sessao ->
                        if (sessao.estabelecimentoId != Prefs.empresaId(this@LoginActivity)) {
                            status.text = "Este usuário pertence a outra empresa"
                            entrar.isEnabled = true
                            return@onSuccess
                        }
                        val ambiente = if (tipoTela() == "tablet") sessao.ambienteTablet else sessao.ambienteCelular
                        if (ambiente.isBlank() || ambiente == "null") {
                            status.text = "Nenhum painel foi definido para este aparelho"
                            entrar.isEnabled = true
                            return@onSuccess
                        }
                        Prefs.salvarSessao(
                            this@LoginActivity,
                            sessao.accessToken,
                            sessao.refreshToken,
                            sessao.expiresAt,
                            sessao.userId,
                            ambiente,
                        )
                        abrirPainel()
                    }.onFailure { erro ->
                        status.text = erro.message ?: "Não foi possível entrar"
                        entrar.isEnabled = true
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