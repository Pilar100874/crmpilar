package br.com.pilar.hub

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import android.view.MotionEvent
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

        configurarSaidaPorToque()
    }

    // ===================== Saída oculta por toque (celular) =====================
    // No celular não há tecla Voltar física para segurar: segurar o dedo na tela
    // por 5s fecha o app (igual à saída oculta do Pilar Remotas na TV).

    @android.annotation.SuppressLint("ClickableViewAccessibility")
    private fun configurarSaidaPorToque() {
        findViewById<android.view.View>(android.R.id.content).setOnTouchListener { _, ev ->
            when (ev.actionMasked) {
                MotionEvent.ACTION_DOWN -> iniciarSaidaOculta()
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> cancelarSaidaOculta()
            }
            false
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

    // ===================== Saída oculta (segurar VOLTAR/ESC por 5s) =====================
    // Igual ao Pilar Remotas (Android TV): segurar a tecla Voltar fecha a tela do app.
    // O serviço em segundo plano (gateway SMS) continua rodando.

    private val ui = Handler(Looper.getMainLooper())
    private var saidaInicio = 0L
    private val saidaRunnable = Runnable {
        saidaInicio = 0L
        finishAndRemoveTask()
    }

    private fun ehTeclaSaida(keyCode: Int) = keyCode == KeyEvent.KEYCODE_BACK ||
        keyCode == KeyEvent.KEYCODE_ESCAPE ||
        keyCode == KeyEvent.KEYCODE_DEL

    private fun iniciarSaidaOculta() {
        if (saidaInicio != 0L) return
        saidaInicio = SystemClock.elapsedRealtime()
        Toast.makeText(this, "Segure para sair…", Toast.LENGTH_SHORT).show()
        ui.postDelayed(saidaRunnable, 5000L)
    }

    private fun cancelarSaidaOculta() {
        saidaInicio = 0L
        ui.removeCallbacks(saidaRunnable)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (ehTeclaSaida(keyCode)) {
            iniciarSaidaOculta()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (ehTeclaSaida(keyCode)) {
            // Alguns controles emitem key up entre repetições: tolera pequenas quebras
            ui.postDelayed({
                if (saidaInicio != 0L && SystemClock.elapsedRealtime() - saidaInicio < 5000L) {
                    cancelarSaidaOculta()
                }
            }, 400L)
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // ignora toque simples — saída somente segurando VOLTAR por 5s
    }
}
