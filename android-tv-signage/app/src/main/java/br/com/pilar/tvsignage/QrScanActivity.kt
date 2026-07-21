package br.com.pilar.tvsignage

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import br.com.pilar.tvsignage.databinding.ActivityQrScanBinding
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

/**
 * Lê o QR Code de pareamento exibido no painel Pilar (TV Signage → Dispositivos → Novo).
 * O payload esperado é um JSON: { "codigo": "...", "token": "...", "api_url": "..." }.
 * Retorna via Intent.putExtra("codigo" | "token") para a PairingActivity, que faz o auth automaticamente.
 */
class QrScanActivity : AppCompatActivity() {
    private lateinit var b: ActivityQrScanBinding
    private val executor = Executors.newSingleThreadExecutor()
    private var handled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityQrScanBinding.inflate(layoutInflater)
        setContentView(b.root)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 42)
        } else {
            startCamera()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 42) {
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
                startCamera()
            } else {
                Toast.makeText(this, R.string.qr_permission_denied, Toast.LENGTH_LONG).show()
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }
    }

    private fun startCamera() {
        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener({
            try {
                val provider = providerFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(b.previewView.surfaceProvider)
                }

                val options = BarcodeScannerOptions.Builder()
                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                    .build()
                val scanner = BarcodeScanning.getClient(options)

                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                analysis.setAnalyzer(executor) { proxy -> processFrame(proxy, scanner) }

                provider.unbindAll()
                provider.bindToLifecycle(
                    this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis
                )
            } catch (e: Exception) {
                Log.e("QrScan", "camera error", e)
                Toast.makeText(this, R.string.qr_no_camera, Toast.LENGTH_LONG).show()
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    @androidx.camera.core.ExperimentalGetImage
    private fun processFrame(proxy: ImageProxy, scanner: com.google.mlkit.vision.barcode.BarcodeScanner) {
        val media = proxy.image
        if (media == null || handled) { proxy.close(); return }
        val image = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (bc in barcodes) {
                    val raw = bc.rawValue ?: continue
                    if (tryDeliver(raw)) { handled = true; break }
                }
            }
            .addOnCompleteListener { proxy.close() }
    }

    private fun tryDeliver(raw: String): Boolean {
        return try {
            val json = org.json.JSONObject(raw)
            val codigo = json.optString("codigo").trim()
            val token = json.optString("token").trim()
            if (codigo.isEmpty() || token.isEmpty()) return false
            val data = Intent().apply {
                putExtra("codigo", codigo)
                putExtra("token", token)
                putExtra("api_url", json.optString("api_url"))
            }
            runOnUiThread {
                setResult(Activity.RESULT_OK, data)
                finish()
            }
            true
        } catch (_: Exception) { false }
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdown()
    }
}
