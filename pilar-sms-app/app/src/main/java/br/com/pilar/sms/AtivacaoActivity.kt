package br.com.pilar.sms

import android.content.Context
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

class AtivacaoActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
        if (prefs.getString("device_token", "").orEmpty().length >= 16 &&
            !prefs.getString("activation_key", "").isNullOrBlank()) {
            abrirSistema()
            return
        }
        setContentView(R.layout.activity_ativacao)
        val chaveInput = findViewById<EditText>(R.id.campo_chave)
        val status = findViewById<TextView>(R.id.txt_status)
        val button = findViewById<Button>(R.id.btn_ativar)
        button.setOnClickListener {
            val chave = chaveInput.text.toString().trim().uppercase()
            if (chave.isBlank()) {
                status.text = "Informe a chave da empresa"
                return@setOnClickListener
            }
            button.isEnabled = false
            status.text = "Validando chave..."
            CoroutineScope(Dispatchers.IO).launch {
                val result = runCatching { ApiClient.validarChave(chave) }
                withContext(Dispatchers.Main) {
                    result.onSuccess { data ->
                        // Não altera preferências operacionais: SIM, retentativas e demais ajustes são preservados.
                        prefs.edit()
                            .putString("activation_key", chave)
                            .putString("device_token", data.deviceToken)
                            .putString("estabelecimento_id", data.empresaId)
                            .putString("empresa_nome", data.empresaNome)
                            .putString("dispositivo_id", data.dispositivoId)
                            .apply()
                        abrirSistema()
                    }.onFailure { error ->
                        status.text = error.message ?: "Falha ao validar a chave"
                        button.isEnabled = true
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
