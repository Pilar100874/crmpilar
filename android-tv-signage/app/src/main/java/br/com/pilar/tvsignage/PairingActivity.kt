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
            val codigo = formatarCodigo(result.data?.getStringExtra("codigo").orEmpty())
            if (codigo.isNotEmpty()) {
                b.inputCodigo.setText(codigo)
                b.txtStatus.text = "QR Code lido — conectando..."
                pair(codigo)
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
            val codigo = formatarCodigo(b.inputCodigo.text.toString())
            if (!CODIGO_REGEX.matches(codigo)) {
                Toast.makeText(this, "Informe o código no formato XXXX-XXXX", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            b.inputCodigo.setText(codigo)
            pair(codigo)
        }

        // Versão instalada e atualização manual para a última versão publicada
        b.txtVersao.text = "Versão instalada: v${BuildConfig.VERSION_NAME}"
        b.btnAtualizarApp.setOnClickListener {
            b.btnAtualizarApp.isEnabled = false
            b.txtStatus.text = "Buscando atualização..."
            CoroutineScope(Dispatchers.IO).launch {
                when (val r = Updater.atualizar(applicationContext, false) { file ->
                    runOnUiThread { Updater.instalarArquivo(this@PairingActivity, file) }
                }) {
                    is Updater.Result.JaAtualizado -> withContext(Dispatchers.Main) {
                        b.txtStatus.text = "Já está na versão mais nova"
                        b.btnAtualizarApp.isEnabled = true
                    }
                    is Updater.Result.Instalando -> withContext(Dispatchers.Main) {
                        b.txtStatus.text = "Instalando nova versão..."
                    }
                    is Updater.Result.Erro -> withContext(Dispatchers.Main) {
                        b.txtStatus.text = "Falha ao atualizar: ${r.msg}"
                        b.btnAtualizarApp.isEnabled = true
                    }
                }
            }
        }
    }

    private fun pair(codigo: String) {
        b.btnPair.isEnabled = false
        b.btnScanQr.isEnabled = false
        b.txtStatus.text = "Conectando..."
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val body = JSONObject().put("codigo", codigo).toString()
                val (code, resp) = ApiClient.post("tv-device-auth", body)
                withContext(Dispatchers.Main) {
                    if (code in 200..299) {
                        val json = JSONObject(resp)
                        val jwt = json.getString("session_jwt")
                        val deviceId = json.getString("device_id")
                        val estabelecimentoId = json.optString("estabelecimento_id", null)
                        DeviceStore.saveSession(this@PairingActivity, jwt, deviceId, estabelecimentoId)
                        DeviceStore.saveCredentials(this@PairingActivity, codigo)
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

    private fun formatarCodigo(valor: String): String {
        val caracteres = valor.uppercase().filter { it.isLetterOrDigit() }.take(8)
        return if (caracteres.length > 4) caracteres.take(4) + "-" + caracteres.drop(4) else caracteres
    }

    companion object {
        private val CODIGO_REGEX = Regex("^[A-Z0-9]{4}-[A-Z0-9]{4}$")
    }
}
