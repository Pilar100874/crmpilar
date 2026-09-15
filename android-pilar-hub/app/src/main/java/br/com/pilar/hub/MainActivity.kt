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
import android.view.Gravity
import android.view.View
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
        val btnAtualizar = findViewById<android.widget.ImageButton>(R.id.btnAtualizarApp)
        val versao = runCatching { packageManager.getPackageInfo(packageName, 0).versionName }.getOrNull().orEmpty()
        if (versao.isNotEmpty()) btnAtualizar.contentDescription = "Atualizar aplicativo · v$versao"
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
        findViewById<android.widget.ImageButton>(R.id.btnLimpar).setOnClickListener {
            ColetorEstado.limparDiagnostico()
            mostrar()
        }
        findViewById<android.widget.ImageButton>(R.id.btnSair).setOnClickListener {
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Sair do aplicativo")
                .setMessage("O coletor será interrompido e será preciso informar a chave da empresa novamente para entrar.")
                .setPositiveButton("Sair") { _, _ ->
                    Prefs.salvarColetorAtivo(this, false)
                    ColetorService.parar(this)
                    Prefs.limpar(this)
                    startActivity(Intent(this, AtivacaoActivity::class.java))
                    finish()
                }
                .setNegativeButton("Cancelar", null)
                .show()
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
        val botao = findViewById<Button>(R.id.btnFilial)
        val erro = findViewById<TextView>(R.id.txtFilialErro)
        botao.isEnabled = false
        botao.text = "Buscando unidades…"
        erro.visibility = View.GONE
        Thread {
            val resultado = runCatching { ColetorFiliais.listar(this) }
            runOnUiThread {
                botao.isEnabled = true
                val filiais = resultado.getOrNull()
                if (filiais == null) {
                    mostrar()
                    erro.text = resultado.exceptionOrNull()?.message
                        ?.takeIf { it.isNotBlank() }
                        ?: "Não foi possível buscar as unidades. Toque em Trocar unidade para tentar novamente."
                    erro.visibility = View.VISIBLE
                    return@runOnUiThread
                }
                if (filiais.isEmpty()) {
                    mostrar()
                    erro.text = "Nenhuma unidade está cadastrada para esta empresa."
                    erro.visibility = View.VISIBLE
                    return@runOnUiThread
                }
                val nomes = filiais.map { it.nome }.toTypedArray()
                val atual = filiais.indexOfFirst { it.id == Prefs.filialId(this) }
                var selecionada = atual
                androidx.appcompat.app.AlertDialog.Builder(this)
                    .setTitle("Selecione a unidade")
                    .setSingleChoiceItems(nomes, atual) { _, indice -> selecionada = indice }
                    .setPositiveButton("Confirmar") { _, _ ->
                        if (selecionada !in filiais.indices) {
                            Toast.makeText(this, "Selecione uma unidade.", Toast.LENGTH_SHORT).show()
                            return@setPositiveButton
                        }
                        filiais[selecionada].let { Prefs.salvarFilial(this, it.id, it.nome) }
                        erro.visibility = View.GONE
                        ColetorService.sincronizarAgora(this)
                        mostrar()
                        Toast.makeText(this, "Unidade alterada com sucesso.", Toast.LENGTH_SHORT).show()
                    }
                    .setNegativeButton("Cancelar", null)
                    .show()
            }
        }.start()
    }

    private fun mostrar() {
        findViewById<Button>(R.id.btnLigarParar).text =
            if (ColetorEstado.rodando) "Parar coletor" else "Iniciar coletor"
        findViewById<TextView>(R.id.txtFilialNome).text =
            Prefs.filialNome(this).ifBlank { "Nenhuma unidade selecionada" }
        findViewById<Button>(R.id.btnFilial).text =
            if (Prefs.filialId(this).isBlank()) "Selecionar unidade" else "Trocar unidade"
        findViewById<Button>(R.id.btnPonto).text =
            if (Prefs.pontoAtivo(this)) "Ponto ligado" else "Ponto desligado"
        findViewById<Button>(R.id.btnAutomacao).text =
            if (Prefs.automacaoAtiva(this)) "Automação ligada" else "Automação desligada"
        val status = findViewById<TextView>(R.id.txtStatus)
        status.text = if (ColetorEstado.rodando) "Em funcionamento" else "Parado"
        status.setTextColor(getColor(if (ColetorEstado.rodando) R.color.iso_success else R.color.iso_danger))
        status.setBackgroundResource(if (ColetorEstado.rodando) R.drawable.iso_pill_online else R.drawable.iso_pill_warning)
        findViewById<TextView>(R.id.txtResumo).text = buildString {
            append(if (ColetorEstado.rodando) "Serviços ativos em segundo plano" else "A coleta está interrompida")
            if (ColetorEstado.ultimoErro.isNotBlank()) append("\nÚltimo aviso: ${ColetorEstado.ultimoErro}")
        }
        findViewById<TextView>(R.id.txtMarcacoes).text = ColetorEstado.marcacoesEnviadas.toString()
        findViewById<TextView>(R.id.txtComandos).text = ColetorEstado.comandosExecutados.toString()
        findViewById<TextView>(R.id.txtPontoStatus).text =
            if (Prefs.pontoAtivo(this)) "Ativo · sincronização a cada 15 segundos" else "Módulo desativado"
        findViewById<TextView>(R.id.txtAutomacaoStatus).text =
            if (Prefs.automacaoAtiva(this)) "Ativo · comandos em tempo real" else "Módulo desativado"
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
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setBackgroundResource(R.drawable.iso_row)
                setPadding(dp(14), dp(12), dp(12), dp(12))
                layoutParams = LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = dp(8) }
            }
            val info = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, -2, 1f)
            }
            info.addView(texto(item.nome, true))
            info.addView(texto(item.situacao, false))
            card.addView(info)
            val online = item.situacao.contains("online", true) || item.situacao.contains("conectado", true)
            card.addView(TextView(this).apply {
                text = if (online) "ONLINE" else "ATENÇÃO"
                textSize = 10f
                setTypeface(typeface, Typeface.BOLD)
                setTextColor(getColor(if (online) R.color.iso_success else R.color.iso_warning))
                setBackgroundResource(if (online) R.drawable.iso_pill_online else R.drawable.iso_pill_warning)
                setPadding(dp(10), dp(5), dp(10), dp(5))
            })
            destino.addView(card)
        }
    }

    private fun texto(valor: String, destaque: Boolean) = TextView(this).apply {
        text = valor
        textSize = if (destaque) 16f else 13f
        setTextColor(getColor(if (destaque) R.color.iso_text else R.color.iso_text_secondary))
        if (destaque) setTypeface(typeface, Typeface.BOLD)
    }

    private fun dp(valor: Int): Int = (valor * resources.displayMetrics.density).toInt()
}
