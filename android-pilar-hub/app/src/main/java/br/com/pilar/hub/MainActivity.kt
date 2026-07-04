package br.com.pilar.hub

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    // Somente permissões necessárias ao gateway SMS.
    private val PERMS = arrayOf(
        Manifest.permission.SEND_SMS,
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.POST_NOTIFICATIONS
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val prefs = getSharedPreferences("pilar_hub", MODE_PRIVATE)
        val tokenInput = findViewById<EditText>(R.id.tokenInput)
        val status = findViewById<TextView>(R.id.status)
        tokenInput.setText(prefs.getString("device_token", ""))

        findViewById<Button>(R.id.btnSave).setOnClickListener {
            val token = tokenInput.text.toString().trim()
            if (token.isBlank()) {
                Toast.makeText(this, "Informe o token", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.edit().putString("device_token", token).apply()
            requestPermsAndStart()
            status.text = "Pilar Hub iniciado. Ver notificação."
        }
    }

    private fun requestPermsAndStart() {
        val missing = PERMS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 1)
        }
        val svc = Intent(this, PilarHubService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc) else startService(svc)
    }

    override fun onRequestPermissionsResult(rc: Int, p: Array<out String>, r: IntArray) {
        super.onRequestPermissionsResult(rc, p, r)
    }
}
