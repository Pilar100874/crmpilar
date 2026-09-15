package br.com.pilar.hub

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/** Tela única do Pilar Coletor: situação, relógios de ponto e dispositivos de automação. */
class MainActivity : AppCompatActivity() {

    private val aoAtualizar = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) = mostrar()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!Prefs.ativado(this)) {
            startActivity(Intent(this, AtivacaoActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_main)
        findViewById<TextView>(R.id.txtEmpresa).text =
            Prefs.empresaNome(this).ifBlank { "Empresa ativada" }

        pedirNotificacoes()
        if (Prefs.coletorAtivo(this)) ColetorService.iniciar(this)

        findViewById<Button>(R.id.btnLigarParar).setOnClickListener {
            if (ColetorEstado.rodando) {
                Prefs.salvarColetorAtivo(this, false)
                ColetorService.parar(this)
            } else {
                ColetorService.iniciar(this)
            }
            mostrar()
        }
        findViewById<Button>(R.id.btnSincronizar).setOnClickListener {
            ColetorService.sincronizarAgora(this)
            Toast.makeText(this, "Sincronizando…", Toast.LENGTH_SHORT).show()
        }
        val btnAtualizar = findViewById<Button>(R.id.btnAtualizarApp)
        val versao = runCatching { packageManager.getPackageInfo(packageName, 0).versionName }.getOrNull().orEmpty()
        if (versao.isNotEmpty()) btnAtualizar.text = "Atualizar aplicativo · v$versao"
        btnAtualizar.setOnClickListener {
            btnAtualizar.isEnabled = false
            AtualizadorApp.atualizar(this) { msg ->
                Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
                if (!msg.endsWith("…")) btnAtualizar.isEnabled = true
            }
        }
        findViewById<Button>(R.id.btnFilial).setOnClickListener { escolherUnidade() }
        findViewById<Button>(R.id.btnPonto).setOnClickListener {
            Prefs.salvarPontoAtivo(this, !Prefs.pontoAtivo(this))
            ColetorService.sincronizarAgora(this)
            mostrar()
        }
        findViewById<Button>(R.id.btnAutomacao).setOnClickListener {
            Prefs.salvarAutomacaoAtiva(this, !Prefs.automacaoAtiva(this))
            ColetorService.sincronizarAgora(this)
            mostrar()
        }
        findViewById<Button>(R.id.btnLimpar).setOnClickListener {
            ColetorEstado.limparDiagnostico()
            mostrar()
        }
        findViewById<Button>(R.id.btnSair).setOnClickListener {
            Prefs.salvarColetorAtivo(this, false)
            ColetorService.parar(this)
            Prefs.limparSessao(this)
            startActivity(Intent(this, AtivacaoActivity::class.java))
            finish()
        }
        mostrar()
    }

    override fun onResume() {
        super.onResume()
        ContextCompat.registerReceiver(
            this,
            aoAtualizar,
            IntentFilter(ColetorService.ATUALIZOU),
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        AtualizadorApp.processarComandoRemoto(this)
        if (Prefs.atualizacaoPendente(this)) {
            Prefs.salvarAtualizacaoPendente(this, false)
            AtualizadorApp.atualizar(this) { msg -> Toast.makeText(this, msg, Toast.LENGTH_SHORT).show() }
        }
        mostrar()
    }

    override fun onPause() {
        runCatching { unregisterReceiver(aoAtualizar) }
        super.onPause()
    }

    private fun pedirNotificacoes() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
    }

    /** Deixa escolher qual unidade (filial) este aparelho atende. */
    private fun escolherUnidade() {
        Toast.makeText(this, "Buscando unidades…", Toast.LENGTH_SHORT).show()
        Thread {
            val resultado = runCatching { ColetorFiliais.listar(this) }
            runOnUiThread {
                val filiais = resultado.getOrNull()
                if (filiais == null) {
                    Toast.makeText(this, "Não foi possível buscar as unidades agora.", Toast.LENGTH_LONG).show()
                    return@runOnUiThread
                }
                val nomes = (listOf("Todas as unidades") + filiais.map { it.nome }).toTypedArray()
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("Unidade atendida")
                    .setItems(nomes) { _, indice ->
                        if (indice == 0) Prefs.salvarFilial(this, "", "")
                        else filiais[indice - 1].let { Prefs.salvarFilial(this, it.id, it.nome) }
                        ColetorService.sincronizarAgora(this)
                        mostrar()
                    }
                    .setNegativeButton("Cancelar", null)
                    .show()
            }
        }.start()
    }

    private fun mostrar() {
        findViewById<Button>(R.id.btnLigarParar).text =
            if (ColetorEstado.rodando) "Parar coletor" else "Iniciar coletor"
        findViewById<Button>(R.id.btnFilial).text =
            "Unidade: " + Prefs.filialNome(this).ifBlank { "todas" }
        findViewById<Button>(R.id.btnPonto).text =
            if (Prefs.pontoAtivo(this)) "Ponto ligado" else "Ponto desligado"
        findViewById<Button>(R.id.btnAutomacao).text =
            if (Prefs.automacaoAtiva(this)) "Automação ligada" else "Automação desligada"
        val status = findViewById<TextView>(R.id.txtStatus)
        status.text = buildString {
            append(ColetorEstado.resumo())
            if (ColetorEstado.ultimoErro.isNotBlank()) append("\nÚltimo aviso: ${ColetorEstado.ultimoErro}")
        }
        preencher(findViewById(R.id.listaRelogios), ColetorEstado.relogios, "Nenhum relógio cadastrado para esta empresa.")
        preencher(findViewById(R.id.listaDispositivos), ColetorEstado.dispositivos, "Nenhum dispositivo de automação atribuído a este coletor.")
    }

    private fun preencher(destino: LinearLayout, itens: List<ColetorEstado.Item>, vazio: String) {
        destino.removeAllViews()
        if (itens.isEmpty()) {
            destino.addView(texto(vazio, false))
            return
        }
        for (item in itens) {
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundResource(R.drawable.bg_card)
                setPadding(dp(16), dp(12), dp(16), dp(12))
                layoutParams = LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) }
            }
            card.addView(texto(item.nome, true))
            card.addView(texto(item.situacao, false))
            destino.addView(card)
        }
    }

    private fun texto(valor: String, destaque: Boolean) = TextView(this).apply {
        text = valor
        textSize = if (destaque) 16f else 13f
        setTextColor(getColor(if (destaque) R.color.text_primary else R.color.text_muted))
        if (destaque) setTypeface(typeface, Typeface.BOLD)
    }

    private fun dp(valor: Int): Int = (valor * resources.displayMetrics.density).toInt()
}
