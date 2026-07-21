package br.com.pilar.tvsignage

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import br.com.pilar.tvsignage.databinding.ActivityPairingBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

class PairingActivity : AppCompatActivity() {
    private lateinit var b: ActivityPairingBinding

    private val scanLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val codigo = result.data?.getStringExtra("codigo")?.trim()?.uppercase().orEmpty()
            val token = result.data?.getStringExtra("token")?.trim().orEmpty()
            if (codigo.isNotEmpty() && token.isNotEmpty()) {
                b.inputCodigo.setText(codigo)
                b.inputToken.setText(token)
                b.txtStatus.text = "QR Code lido — conectando..."
                pair(codigo, token)
            } else {
                Toast.makeText(this, R.string.qr_invalid, Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (DeviceStore.isPaired(this)) {
            startActivity(Intent(this, SignageActivity::class.java))
            finish()
            return
        }

        b = ActivityPairingBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Esconde botão de scanner se o dispositivo não tiver câmera (típico da maioria das TVs)
        val hasCamera = packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)
        b.btnScanQr.visibility = if (hasCamera) android.view.View.VISIBLE else android.view.View.GONE

        b.btnScanQr.setOnClickListener {
            scanLauncher.launch(Intent(this, QrScanActivity::class.java))
        }

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
        b.btnScanQr.isEnabled = false
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
                        val estabelecimentoId = json.optString("estabelecimento_id", null)
                        DeviceStore.saveSession(this@PairingActivity, jwt, deviceId, estabelecimentoId)
                        startActivity(Intent(this@PairingActivity, SignageActivity::class.java))
                        finish()
                    } else {
                        b.txtStatus.text = "Erro: $resp"
                        b.btnPair.isEnabled = true
                        b.btnScanQr.isEnabled = true
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    b.txtStatus.text = "Falha: ${e.message}"
                    b.btnPair.isEnabled = true
                    b.btnScanQr.isEnabled = true
                }
            }
        }
    }
}
