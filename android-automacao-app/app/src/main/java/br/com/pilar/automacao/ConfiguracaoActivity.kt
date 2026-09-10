package br.com.pilar.automacao

import android.os.Bundle
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class ConfiguracaoActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_config)

        val campoUrl = findViewById<EditText>(R.id.campo_url)
        val campoAmbiente = findViewById<EditText>(R.id.campo_ambiente)
        val campoRolagem = findViewById<CheckBox>(R.id.campo_rolagem)

        campoUrl.setText(Prefs.baseUrl(this))
        campoAmbiente.setText(Prefs.ambiente(this))
        campoRolagem.isChecked = Prefs.rolagem(this)

        findViewById<Button>(R.id.btn_salvar).setOnClickListener {
            val url = campoUrl.text.toString().trim()
            if (url.isBlank()) {
                Toast.makeText(this, "Informe o endereço do sistema", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            Prefs.salvar(this, url, campoAmbiente.text.toString(), campoRolagem.isChecked)
            Toast.makeText(this, "Configuração salva", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
}
