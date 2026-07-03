package br.com.pilar.sms

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import br.com.pilar.sms.databinding.ActivityMainBinding
import java.util.UUID

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        val prefs = getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
        b.etToken.setText(prefs.getString("token", UUID.randomUUID().toString().replace("-", "").take(24)))
        b.etPort.setText(prefs.getInt("port", 8080).toString())

        b.btnStart.setOnClickListener {
            val token = b.etToken.text.toString().trim()
            val port = b.etPort.text.toString().toIntOrNull() ?: 8080
            if (token.length < 8) { toast("Token muito curto (min 8)"); return@setOnClickListener }
            prefs.edit().putString("token", token).putInt("port", port).apply()
            requestPermissionsThenStart()
        }
        b.btnStop.setOnClickListener {
            stopService(Intent(this, SmsHttpService::class.java))
            b.tvStatus.text = "Servidor parado"
        }

        updateEndpoint()
    }

    private fun updateEndpoint() {
        val port = b.etPort.text.toString().toIntOrNull() ?: 8080
        val ip = SmsHttpService.localIp(this)
        b.tvEndpoint.text = "Endpoint: http://$ip:$port/send"
    }

    private fun requestPermissionsThenStart() {
        val perms = mutableListOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms += Manifest.permission.POST_NOTIFICATIONS
        }
        val missing = perms.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 42)
        } else startServer()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 42 && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) startServer()
        else toast("Permissões negadas")
    }

    private fun startServer() {
        val svc = Intent(this, SmsHttpService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc) else startService(svc)
        updateEndpoint()
        b.tvStatus.text = "Servidor ativo"
        toast("Servidor iniciado")
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
