package br.com.pilar.hub

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Primeira tela: a pessoa informa a chave da empresa para liberar o aplicativo. */
class AtivacaoActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (Prefs.ativado(this)) {
            abrirSistema()
            return
        }

        setContentView(R.layout.activity_ativacao)

        val campoChave = findViewById<EditText>(R.id.campo_chave)
        val status = findViewById<TextView>(R.id.txt_status)
        val botao = findViewById<Button>(R.id.btn_ativar)

        botao.setOnClickListener {
            val chave = campoChave.text.toString().trim().uppercase()
            if (chave.isBlank()) {
                status.text = "Informe a chave da empresa"
                return@setOnClickListener
            }
            botao.isEnabled = false
            status.text = "Validando chave..."
            CoroutineScope(Dispatchers.IO).launch {
                val resultado = runCatching { ApiClient.validarChave(chave) }
                withContext(Dispatchers.Main) {
                    resultado.onSuccess { dados ->
                        Prefs.salvarAtivacao(this@AtivacaoActivity, chave, dados.empresaId, dados.empresaNome, dados.dispositivoId)
                        abrirSistema()
                    }.onFailure { erro ->
                        status.text = erro.message ?: "Falha ao validar a chave"
                        botao.isEnabled = true
                    }
                }
            }
        }
    }

    private fun abrirSistema() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
