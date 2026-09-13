package br.com.pilar.automacao

import android.annotation.SuppressLint
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!Prefs.ativado(this)) {
            startActivity(Intent(this, AtivacaoActivity::class.java))
            finish()
            return
        }
        if (!Prefs.sessaoSalva(this)) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_main)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        web = findViewById(R.id.web)
        refresh = findViewById(R.id.refresh)

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportZoom(false)
            builtInZoomControls = false
        }
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                refresh.isRefreshing = false
            }
        }
        refresh.setOnRefreshListener { web.reload() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // O painel fica isolado: Voltar não abre páginas anteriores do sistema.
            }
        })

        carregar()
    }

    override fun onResume() {
        super.onResume()
        if (!Prefs.ativado(this)) return
        carregar()
        esconderBarras()
    }

    private fun tipoTela(): String {
        val grande = (resources.configuration.screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK) >=
            Configuration.SCREENLAYOUT_SIZE_LARGE
        return if (grande) "tablet" else "celular"
    }

    private fun carregar() {
        val url = Prefs.urlTela(this, tipoTela())
        if (web.url != null) return
        val storageKey = "sb-ioxugupvxlcdweldocmq-auth-token"
        val session = JSONObject()
            .put("access_token", Prefs.accessToken(this))
            .put("refresh_token", Prefs.refreshToken(this))
            .put("expires_at", Prefs.expiresAt(this))
            .put("expires_in", 3600)
            .put("token_type", "bearer")
            .put("user", JSONObject().put("id", Prefs.userId(this)))
        val html = """
            <!doctype html><html><body><script>
            localStorage.setItem(${JSONObject.quote(storageKey)}, ${JSONObject.quote(session.toString())});
            location.replace(${JSONObject.quote(url)});
            </script></body></html>
        """.trimIndent()
        web.loadDataWithBaseURL(Prefs.baseUrl(this), html, "text/html", "UTF-8", null)
    }

    private fun esconderBarras() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
        }
        web.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    }
}
