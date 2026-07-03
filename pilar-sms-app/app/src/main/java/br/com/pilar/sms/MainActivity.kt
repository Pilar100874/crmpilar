package br.com.pilar.sms

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import br.com.pilar.sms.databinding.ActivityMainBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding
    private val handler = Handler(Looper.getMainLooper())
    private val fmtTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault())

    private val refresher = object : Runnable {
        override fun run() {
            render()
            handler.postDelayed(this, 1500)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }
        b.btnStart.setOnClickListener {
            val token = getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
                .getString("device_token", "") ?: ""
            if (token.length < 16) {
                toast("Cadastre um token nas Configurações antes de conectar.")
                startActivity(Intent(this, SettingsActivity::class.java))
                return@setOnClickListener
            }
            requestPermissionsThenStart()
        }
        b.btnStop.setOnClickListener {
            stopService(Intent(this, SmsPollingService::class.java))
            toast("Pausado")
            render()
        }
        b.btnClearHistory.setOnClickListener {
            SmsPollingService.clearHistory()
            render()
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

    private fun render() {
        val svc = SmsPollingService
        // Status pill
        when (svc.connState) {
            SmsPollingService.ConnState.ACTIVE -> {
                b.dotStatus.setBackgroundResource(R.drawable.dot_success)
                b.tvStatus.text = "Ativo"
            }
            SmsPollingService.ConnState.CONNECTING -> {
                b.dotStatus.setBackgroundResource(R.drawable.dot_muted)
                b.tvStatus.text = "Conectando..."
            }
            SmsPollingService.ConnState.ERROR -> {
                b.dotStatus.setBackgroundResource(R.drawable.dot_danger)
                b.tvStatus.text = "Sem conexão"
            }
            else -> {
                b.dotStatus.setBackgroundResource(R.drawable.dot_muted)
                b.tvStatus.text = "Desconectado"
            }
        }

        // Uptime
        b.tvUptime.text = if (svc.connState == SmsPollingService.ConnState.STOPPED) {
            "Toque em Conectar para iniciar"
        } else {
            val secs = ((System.currentTimeMillis() - svc.startedAt) / 1000).coerceAtLeast(0)
            val h = secs / 3600; val m = (secs % 3600) / 60; val s = secs % 60
            "Ativo há " + when { h > 0 -> "${h}h ${m}min"; m > 0 -> "${m}min ${s}s"; else -> "${s}s" }
        }

        b.tvEnviados.text = svc.enviados.toString()
        b.tvFalhas.text = svc.falhas.toString()
        b.tvUltimoPing.text = if (svc.ultimoPing == 0L) "—" else fmtTime.format(Date(svc.ultimoPing))
        b.tvBateria.text = if (svc.bateria < 0) "—" else "${svc.bateria}%"

        renderHistory()
    }

    private fun renderHistory() {
        val events = synchronized(SmsPollingService.historyLock) {
            SmsPollingService.history.toList()
        }
        b.tvEmpty.visibility = if (events.isEmpty()) View.VISIBLE else View.GONE
        b.historyContainer.visibility = if (events.isEmpty()) View.GONE else View.VISIBLE
        b.historyContainer.removeAllViews()
        val inflater = LayoutInflater.from(this)
        for (ev in events) {
            val row = inflater.inflate(R.layout.row_event, b.historyContainer, false)
            val dot = row.findViewById<View>(R.id.rowDot)
            val phone = row.findViewById<TextView>(R.id.rowPhone)
            val sub = row.findViewById<TextView>(R.id.rowSub)
            val pill = row.findViewById<TextView>(R.id.rowPill)
            phone.text = ev.phone
            if (ev.success) {
                dot.setBackgroundResource(R.drawable.dot_success)
                pill.text = "ENVIADO"
                pill.setTextColor(ContextCompat.getColor(this, R.color.success))
                pill.setBackgroundResource(R.drawable.pill_success)
                sub.text = "Enviado às ${fmtTime.format(Date(ev.timeMs))}"
            } else {
                dot.setBackgroundResource(R.drawable.dot_danger)
                pill.text = "FALHA"
                pill.setTextColor(ContextCompat.getColor(this, R.color.danger))
                pill.setBackgroundResource(R.drawable.pill_danger)
                sub.text = "${fmtTime.format(Date(ev.timeMs))} · ${ev.error ?: "erro desconhecido"}"
            }
            b.historyContainer.addView(row)
            // divider
            if (ev !== events.last()) {
                val divider = View(this).apply {
                    layoutParams = android.widget.LinearLayout.LayoutParams(
                        android.widget.LinearLayout.LayoutParams.MATCH_PARENT, 1
                    ).apply { leftMargin = 32; rightMargin = 16 }
                    setBackgroundColor(Color.parseColor("#EEF1F5"))
                }
                b.historyContainer.addView(divider)
            }
        }
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
