package br.com.pilar.voz

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/** Tela única: ativação pela chave da empresa, dados da central e eventos. */
class MainActivity : AppCompatActivity() {
    private val pref by lazy { getSharedPreferences(VozService.PREF, MODE_PRIVATE) }
    private lateinit var eventos: TextView
    private val relogio = android.os.Handler(android.os.Looper.getMainLooper())
    private val tique = object : Runnable { override fun run() { mostrarMonitor(); relogio.postDelayed(this, 1000) } }

    private val receptor = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { mostrarEventos(); mostrarMonitor() }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        eventos = findViewById(R.id.txt_eventos)

        val ativacao = findViewById<LinearLayout>(R.id.bloco_ativacao)
        val config = findViewById<LinearLayout>(R.id.bloco_config)
        val status = findViewById<TextView>(R.id.txt_status)
        val campoChave = findViewById<EditText>(R.id.campo_chave)

        fun mostrar() {
            val ativo = !pref.getString("chave", "").isNullOrBlank()
            ativacao.visibility = if (ativo) View.GONE else View.VISIBLE
            config.visibility = if (ativo) View.VISIBLE else View.GONE
            findViewById<View>(R.id.bloco_monitor).visibility = if (ativo) View.VISIBLE else View.GONE
            findViewById<TextView>(R.id.txt_empresa).text = pref.getString("empresa", "")
        }

        findViewById<Button>(R.id.btn_ativar).setOnClickListener {
            val chave = campoChave.text.toString().trim().uppercase()
            if (chave.isBlank()) { status.text = "Informe a chave"; return@setOnClickListener }
            status.text = "Validando…"
            Thread {
                runCatching { Api.ativar(chave) }.onSuccess { r ->
                    pref.edit().putString("chave", chave).putString("empresa", r.optString("empresa")).apply()
                    runOnUiThread { status.text = ""; mostrar() }
                }.onFailure { e -> runOnUiThread { status.text = e.message } }
            }.start()
        }

        val campos = mapOf(R.id.campo_host to "host", R.id.campo_porta to "porta", R.id.campo_ramal to "ramal",
            R.id.campo_senha to "senha", R.id.campo_escuta to "codigo_escuta")
        campos.forEach { (id, k) -> pref.getString(k, null)?.let { findViewById<EditText>(id).setText(it) } }
        if (pref.getString("porta", null) == null) findViewById<EditText>(R.id.campo_porta).setText("5060")
        if (pref.getString("codigo_escuta", null) == null) findViewById<EditText>(R.id.campo_escuta).setText("*45")

        findViewById<Button>(R.id.btn_iniciar).setOnClickListener {
            val e = pref.edit(); campos.forEach { (id, k) -> e.putString(k, findViewById<EditText>(id).text.toString().trim()) }; e.apply()
            VozService.iniciar(this)
        }
        findViewById<Button>(R.id.btn_parar).setOnClickListener { VozService.parar(this) }
        findViewById<Button>(R.id.btn_sair).setOnClickListener {
            VozService.parar(this); pref.edit().remove("chave").remove("empresa").apply(); mostrar()
        }
        mostrar(); mostrarEventos()
    }

    override fun onStart() {
        super.onStart()
        ContextCompat.registerReceiver(this, receptor, IntentFilter(VozService.EVENTO), ContextCompat.RECEIVER_NOT_EXPORTED)
        relogio.post(tique)
    }

    override fun onStop() { relogio.removeCallbacks(tique); unregisterReceiver(receptor); super.onStop() }

    private fun mostrarEventos() = runOnUiThread {
        eventos.text = synchronized(VozService.EVENTOS) { VozService.EVENTOS.joinToString("\n") }.ifBlank { "Nenhum evento ainda." }
    }

    private fun mostrarMonitor() {
        val m = Monitor
        val cor = when (m.servico) { "Ativo" -> "🟢"; "Conectando" -> "🟡"; else -> "⚪" }
        findViewById<TextView>(R.id.mon_servico).text = "$cor Serviço: ${m.servico}"
        findViewById<TextView>(R.id.mon_central).text = "Central: ${m.central}"
        val modo = m.modo
        findViewById<TextView>(R.id.mon_ligacao).text = if (modo == null) "Nenhuma ligação no momento" else {
            val seg = (System.currentTimeMillis() - m.inicio) / 1000
            val nome = when (modo) { "receber" -> "Atendendo"; "ligar" -> "Ligando para"; else -> "Ajudando o ramal" }
            "📞 $nome ${m.destino} — %02d:%02d".format(seg / 60, seg % 60)
        }
        findViewById<TextView>(R.id.mon_cliente).text = if (m.falaCliente.isBlank()) "" else "Cliente: ${m.falaCliente}"
        findViewById<TextView>(R.id.mon_ia).text = if (m.falaIa.isBlank()) "" else "IA: ${m.falaIa}"
        findViewById<TextView>(R.id.mon_contadores).text =
            "Desde que abriu: ${m.atendidas} atendidas · ${m.feitas} feitas · ${m.assistidas} ajudas · ${m.transferidas} transferidas"
    }
}
