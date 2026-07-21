package br.com.pilar.tvsignage

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import br.com.pilar.tvsignage.databinding.ActivityPairingBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

class PairingActivity : AppCompatActivity() {
    private lateinit var b: ActivityPairingBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (DeviceStore.isPaired(this)) {
            startActivity(Intent(this, SignageActivity::class.java))
            finish()
            return
        }

        b = ActivityPairingBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnPair.setOnClickListener {
            val codigo = b.inputCodigo.text.toString().trim().uppercase()
            val token = b.inputToken.text.toString().trim()
            if (codigo.isEmpty() || token.isEmpty()) {
                Toast.makeText(this, "Preencha código e token", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            pair(codigo, token)
        }
    }

    private fun pair(codigo: String, token: String) {
        b.btnPair.isEnabled = false
        b.txtStatus.text = "Conectando..."
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val body = JSONObject().put("codigo", codigo).put("token", token).toString()
                val (code, resp) = ApiClient.post("tv-device-auth", body)
                withContext(Dispatchers.Main) {
                    if (code in 200..299) {
                        val json = JSONObject(resp)
                        val jwt = json.getString("session_jwt")
                        val deviceId = json.getString("device_id")
                        DeviceStore.saveSession(this@PairingActivity, jwt, deviceId)
                        startActivity(Intent(this@PairingActivity, SignageActivity::class.java))
                        finish()
                    } else {
                        b.txtStatus.text = "Erro: $resp"
                        b.btnPair.isEnabled = true
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    b.txtStatus.text = "Falha: ${e.message}"
                    b.btnPair.isEnabled = true
                }
            }
        }
    }
}
