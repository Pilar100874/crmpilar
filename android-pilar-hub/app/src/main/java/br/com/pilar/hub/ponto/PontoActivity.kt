package br.com.pilar.hub.ponto

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.util.Base64
import android.util.Size
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import br.com.pilar.hub.ApiClient
import br.com.pilar.hub.PilarHubService
import br.com.pilar.hub.R
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer

class PontoActivity : AppCompatActivity() {

    private var imageCapture: ImageCapture? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ponto)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 10)
        } else startCamera()

        findViewById<Button>(R.id.btnBater).setOnClickListener { bater() }
    }

    private fun startCamera() {
        val providerFut = ProcessCameraProvider.getInstance(this)
        providerFut.addListener({
            val provider = providerFut.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(findViewById<PreviewView>(R.id.preview).surfaceProvider)
            }
            imageCapture = ImageCapture.Builder().setTargetResolution(Size(640, 480)).build()
            provider.unbindAll()
            provider.bindToLifecycle(this, CameraSelector.DEFAULT_FRONT_CAMERA, preview, imageCapture)
        }, ContextCompat.getMainExecutor(this))
    }

    @SuppressLint("MissingPermission")
    private fun bater() {
        val pin = findViewById<EditText>(R.id.pin).text.toString().trim()
        val status = findViewById<TextView>(R.id.status)
        if (pin.isBlank()) { Toast.makeText(this,"Informe o PIN",Toast.LENGTH_SHORT).show(); return }
        status.text = "Capturando..."

        imageCapture?.takePicture(ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    val b64 = image.toBase64Jpeg()
                    image.close()
                    LocationServices.getFusedLocationProviderClient(this@PontoActivity)
                        .lastLocation.addOnSuccessListener { loc ->
                            enviar(pin, b64, loc?.latitude, loc?.longitude, status)
                        }.addOnFailureListener { enviar(pin, b64, null, null, status) }
                }
                override fun onError(e: ImageCaptureException) {
                    enviar(pin, null, null, null, status)
                }
            })
    }

    private fun enviar(pin: String, foto: String?, lat: Double?, lng: Double?, status: TextView) {
        val prefs = getSharedPreferences("pilar_hub", MODE_PRIVATE)
        val token = prefs.getString("device_token", "") ?: ""
        CoroutineScope(Dispatchers.IO).launch {
            val body = JSONObject().apply {
                put("device_token", token); put("pin", pin)
                if (foto != null && PilarHubService.cameraAtiva) put("foto_base64", foto)
                if (lat != null) put("lat", lat)
                if (lng != null) put("lng", lng)
                put("timestamp", System.currentTimeMillis())
            }
            try {
                ApiClient.post("pilar-hub-ponto", body.toString())
                withContext(Dispatchers.Main) {
                    status.text = "Registrado ✓"
                    findViewById<EditText>(R.id.pin).text.clear()
                }
            } catch (e: Exception) {
                // Sem internet: enfileira para reenvio no próximo heartbeat
                PontoQueue.enqueue(this@PontoActivity, body)
                withContext(Dispatchers.Main) {
                    status.text = "Salvo offline (${PontoQueue.pendentes(this@PontoActivity)} na fila)"
                    findViewById<EditText>(R.id.pin).text.clear()
                }
            }
        }
    }
}

private fun ImageProxy.toBase64Jpeg(): String {
    val buffer: ByteBuffer = planes[0].buffer
    val bytes = ByteArray(buffer.remaining()); buffer.get(bytes)
    val bmp = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    val out = ByteArrayOutputStream()
    bmp.compress(Bitmap.CompressFormat.JPEG, 70, out)
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
}
