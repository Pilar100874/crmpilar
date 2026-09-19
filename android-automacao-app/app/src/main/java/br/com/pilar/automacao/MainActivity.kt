package br.com.pilar.automacao

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

/** Mostra o mesmo painel da web dentro do aplicativo, sem barras do navegador. */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var aviso: LinearLayout
    private lateinit var status: TextView
    private lateinit var btnTentar: Button

    private var sessaoInjetada = false
    private var falhou = false

    private val atualizacaoHandler = Handler(Looper.getMainLooper())
    private val verificarAtualizacao = object : Runnable {
        override fun run() {
            AtualizadorApp.processarComandoRemoto(this@MainActivity)
            atualizacaoHandler.postDelayed(this, 60_000L)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!Prefs.ativado(this) || !Prefs.sessaoSalva(this)) {
            startActivity(Intent(this, AtivacaoActivity::class.java))
            overridePendingTransition(0, 0)
            finish()
            return
        }

        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = findViewById(R.id.webPainel)
        web.visibility = View.INVISIBLE
        web.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        aviso = findViewById(R.id.painelAviso)
        status = findViewById(R.id.txtStatus)
        btnTentar = findViewById(R.id.btnTentarNovamente)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString PilarAutomacao"
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, req: WebResourceRequest): Boolean {
                val url = req.url.toString()
                if (url.startsWith(Prefs.baseUrl(this@MainActivity))) return false
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                return true
            }

            override fun onPageFinished(view: WebView, url: String?) {
                if (!sessaoInjetada) {
                    sessaoInjetada = true
                    view.evaluateJavascript(scriptSessao()) { abrirPainel() }
                    return
                }
                if (!falhou) {
                    // Pequena espera para o painel desenhar antes de revelar: evita ver a página carregando.
                    Handler(Looper.getMainLooper()).postDelayed({ if (!falhou) mostrarPainel() }, 450L)
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: android.webkit.WebResourceError,
            ) {
                if (request.isForMainFrame) mostrarErro("Não foi possível abrir o painel. Verifique a internet do aparelho.")
            }
        }

        btnTentar.setOnClickListener { recarregar() }
        findViewById<View>(R.id.areaOculta).setOnLongClickListener {
            abrirOpcoes()
            true
        }

        recarregar()
        atualizacaoHandler.post(verificarAtualizacao)
    }

    /** Opções escondidas do aplicativo (sem ocupar espaço na tela do painel). */
    private fun abrirOpcoes() {
        val versaoAtual = runCatching { packageManager.getPackageInfo(packageName, 0).versionName }.getOrNull().orEmpty()
        val opcoes = arrayOf(
            "Atualizar painel",
            if (versaoAtual.isEmpty()) "Atualizar aplicativo" else "Atualizar aplicativo · v$versaoAtual",
            "Sair",
        )
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Opções")
            .setItems(opcoes) { _, indice ->
                when (indice) {
                    0 -> recarregar()
                    1 -> AtualizadorApp.atualizar(this) { msg ->
                        android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show()
                    }
                    else -> {
                        Prefs.limparSessao(this)
                        startActivity(Intent(this, AtivacaoActivity::class.java))
                        finish()
                    }
                }
            }
            .setNegativeButton("Fechar", null)
            .show()
    }

    override fun onDestroy() {
        atualizacaoHandler.removeCallbacks(verificarAtualizacao)
        super.onDestroy()
    }

    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    private fun recarregar() {
        falhou = false
        sessaoInjetada = false
        web.visibility = View.INVISIBLE
        aviso.visibility = View.VISIBLE
        btnTentar.visibility = View.GONE
        status.text = "Carregando painel…"
        // Página leve da mesma origem: permite gravar a sessão sem exibir a abertura da web.
        web.loadUrl("${Prefs.baseUrl(this)}/robots.txt")
    }

    private fun abrirPainel() {
        web.loadUrl(Prefs.urlPainel(this))
    }

    private fun mostrarPainel() {
        web.visibility = View.VISIBLE
        aviso.visibility = View.GONE
        btnTentar.visibility = View.GONE
    }

    private fun mostrarErro(mensagem: String) {
        falhou = true
        web.visibility = View.INVISIBLE
        aviso.visibility = View.VISIBLE
        btnTentar.visibility = View.VISIBLE
        status.text = mensagem
    }

    /** Reaproveita a sessão já validada no aplicativo para o painel abrir direto. */
    private fun scriptSessao(): String {
        val ref = BuildConfig.SUPABASE_URL.removePrefix("https://").substringBefore(".")
        val chave = "sb-$ref-auth-token"
        val sessao = JSONObject()
            .put("access_token", Prefs.accessToken(this))
            .put("refresh_token", Prefs.refreshToken(this))
            .put("token_type", "bearer")
            .put("expires_in", 3600)
            // Usa a validade real quando ainda está no prazo: o painel abre sem precisar renovar.
            .put("expires_at", validadeSessao())
            .put("user", JSONObject().put("id", Prefs.userId(this)))
        return "try{localStorage.setItem(${JSONObject.quote(chave)}, ${JSONObject.quote(sessao.toString())});}catch(e){}"
    }

    /** Validade real da sessão; se já venceu, marca como vencida para o painel renovar sozinho. */
    private fun validadeSessao(): Long {
        val agora = System.currentTimeMillis() / 1000
        val salva = Prefs.expiresAt(this)
        return if (salva > agora + 60) salva else agora - 60
    }
}
