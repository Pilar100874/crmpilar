package br.com.pilar.automacao

import android.annotation.SuppressLint
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageButton
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import android.Manifest
import android.content.pm.PackageManager

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private lateinit var refresh: SwipeRefreshLayout

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
        web.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }
        }

        refresh.setOnRefreshListener { web.reload() }

        findViewById<ImageButton>(R.id.btn_config).setOnClickListener { abrirConfig() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else finish()
            }
        })

        pedirPermissoes()

        if (!Prefs.configurado(this)) abrirConfig() else carregar()
    }

    override fun onResume() {
        super.onResume()
        if (Prefs.configurado(this)) carregar()
        esconderBarras()
    }

    private fun pedirPermissoes() {
        val faltando = listOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
            .filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (faltando.isNotEmpty()) requestPermissions(faltando.toTypedArray(), 10)
    }

    private fun abrirConfig() {
        startActivity(Intent(this, ConfiguracaoActivity::class.java))
    }

    private fun tipoTela(): String {
        val grande = (resources.configuration.screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK) >=
            Configuration.SCREENLAYOUT_SIZE_LARGE
        return if (grande) "tablet" else "celular"
    }

    private fun carregar() {
        val url = Prefs.urlTela(this, tipoTela())
        if (web.url != url) web.loadUrl(url)
    }

    private fun esconderBarras() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(true)
        }
        web.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    }
}
