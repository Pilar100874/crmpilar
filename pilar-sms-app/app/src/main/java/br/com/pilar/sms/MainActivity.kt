package br.com.pilar.sms

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import br.com.pilar.sms.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding
    private val handler = Handler(Looper.getMainLooper())
    private val refresher = object : Runnable {
        override fun run() {
            b.tvStatus.text = SmsPollingService.status
            b.tvStats.text = "Enviados: ${SmsPollingService.enviados}  ·  Falhas: ${SmsPollingService.falhas}  ·  Último ping: ${SmsPollingService.ultimoPing}"
            handler.postDelayed(this, 2000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        val prefs = getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
        b.etToken.setText(prefs.getString("device_token", ""))

        b.btnStart.setOnClickListener {
            val token = b.etToken.text.toString().trim()
            if (token.length < 16) { toast("Token inválido. Cole o token gerado no CRM."); return@setOnClickListener }
            prefs.edit().putString("device_token", token).apply()
            requestPermissionsThenStart()
        }
        b.btnStop.setOnClickListener {
            stopService(Intent(this, SmsPollingService::class.java))
            b.tvStatus.text = "parado"
            toast("Parado")
        }
    }

    override fun onResume() {
        super.onResume()
        handler.post(refresher)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(refresher)
    }

    private fun requestPermissionsThenStart() {
        val perms = mutableListOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms += Manifest.permission.POST_NOTIFICATIONS
        }
        val missing = perms.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 42)
        } else startPolling()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 42 && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) startPolling()
        else toast("Permissões negadas")
    }

    private fun startPolling() {
        val svc = Intent(this, SmsPollingService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc) else startService(svc)
        toast("Conectado ao CRM")
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
