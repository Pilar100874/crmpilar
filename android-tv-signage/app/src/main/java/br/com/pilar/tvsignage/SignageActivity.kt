package br.com.pilar.tvsignage

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import br.com.pilar.tvsignage.databinding.ActivitySignageBinding
import java.net.URLEncoder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class SignageActivity : AppCompatActivity() {
    private lateinit var b: ActivitySignageBinding
    private val ui = Handler(Looper.getMainLooper())
    private var heartbeatJob: Job? = null
    private var commandsJob: Job? = null
    private var configJob: Job? = null
    private var wakeLock: PowerManager.WakeLock? = null

    // Playlist state
    private var playlistItems: List<JSONObject> = emptyList()
    private var playlistIndex = 0
    private val playlistRunnable = object : Runnable {
        override fun run() {
            if (playlistItems.isEmpty()) return
            val item = playlistItems[playlistIndex % playlistItems.size]
            val dash = item.optJSONObject("dashboard") ?: return
            loadDashboard(dash)
            val dur = item.optInt("duracao_segundos", 30).coerceAtLeast(5)
            playlistIndex++
            ui.postDelayed(this, dur * 1000L)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!DeviceStore.isPaired(this)) {
            startActivity(Intent(this, PairingActivity::class.java))
            finish()
            return
        }

        b = ActivitySignageBinding.inflate(layoutInflater)
        setContentView(b.root)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PilarTv::signage").also { it.acquire() }

        val w = b.webview.settings
        w.javaScriptEnabled = true
        w.domStorageEnabled = true
        w.mediaPlaybackRequiresUserGesture = false
        w.cacheMode = WebSettings.LOAD_DEFAULT
        w.userAgentString = w.userAgentString + " PilarTvSignage/1.0"
        b.webview.webViewClient = WebViewClient()

        loadConfig()
        startHeartbeat()
        startCommandsPolling()
    }

    private fun token() = DeviceStore.token(this).orEmpty()

    private fun addQueryParams(baseUrl: String): String {
        val separator = if (baseUrl.contains("?")) "&" else "?"
        val params = listOf(
            "tv=1",
            "device=" + URLEncoder.encode(DeviceStore.deviceId(this).orEmpty(), "UTF-8"),
            "tv_token=" + URLEncoder.encode(token(), "UTF-8"),
            "estabelecimento_id=" + URLEncoder.encode(DeviceStore.estabelecimentoId(this).orEmpty(), "UTF-8")
        ).joinToString("&")
        return baseUrl + separator + params
    }

    private fun loadConfig() {
        configJob = CoroutineScope(Dispatchers.IO).launch {
            try {
                val (code, resp) = ApiClient.get("tv-device-config", token())
                if (code == 401 || code == 403) {
                    withContext(Dispatchers.Main) { handleUnauthorized() }
                    return@launch
                }
                if (code !in 200..299) return@launch
                val json = JSONObject(resp)
                withContext(Dispatchers.Main) {
                    applyConfig(json)
                }
            } catch (_: Exception) {}
        }
    }

    private fun applyConfig(json: JSONObject) {
        ui.removeCallbacks(playlistRunnable)
        val playlist = json.optJSONObject("playlist")
        if (playlist != null && playlist.optJSONArray("items") != null) {
            val arr: JSONArray = playlist.getJSONArray("items")
            val list = mutableListOf<JSONObject>()
            for (i in 0 until arr.length()) list.add(arr.getJSONObject(i))
            playlistItems = list
            playlistIndex = 0
            if (playlistItems.isNotEmpty()) {
                ui.post(playlistRunnable)
                return
            }
        }
        val dash = json.optJSONObject("dashboard")
        if (dash != null) loadDashboard(dash) else showStandby("Nenhum dashboard atribuído")
    }

    private fun loadDashboard(dash: JSONObject) {
        val tipo = dash.optString("tipo")
        val url = when (tipo) {
            "url_externa" -> dash.optString("url")
            "tela_interna" -> addQueryParams(BuildConfig.APP_BASE_URL + dash.optString("rota_interna"))
            else -> null
        }
        if (url.isNullOrEmpty()) { showStandby("Dashboard inválido"); return }
        b.txtStandby.visibility = View.GONE
        b.webview.visibility = View.VISIBLE
        b.webview.loadUrl(url)
    }

    private fun showStandby(msg: String) {
        b.webview.visibility = View.GONE
        b.txtStandby.visibility = View.VISIBLE
        b.txtStandby.text = msg
    }

    private fun startHeartbeat() {
        heartbeatJob = CoroutineScope(Dispatchers.IO).launch {
            while (true) {
                try {
                    val body = JSONObject().apply {
                        put("status", "online")
                        put("versao", BuildConfig::class.java.getField("VERSION_NAME").get(null)?.toString() ?: "1.0.0")
                        put("uptime", android.os.SystemClock.elapsedRealtime() / 1000)
                        put("resolucao", "${resources.displayMetrics.widthPixels}x${resources.displayMetrics.heightPixels}")
                    }.toString()
                    val (code, _) = ApiClient.post("tv-device-heartbeat", body, token())
                    if (code == 401) { withContext(Dispatchers.Main) { handleUnauthorized() }; return@launch }
                } catch (_: Exception) {}
                kotlinx.coroutines.delay(30_000)
            }
        }
    }

    private fun startCommandsPolling() {
        commandsJob = CoroutineScope(Dispatchers.IO).launch {
            while (true) {
                try {
                    val (code, resp) = ApiClient.get("tv-device-commands", token())
                    if (code in 200..299) {
                        val cmds = JSONObject(resp).optJSONArray("commands") ?: JSONArray()
                        for (i in 0 until cmds.length()) processCommand(cmds.getJSONObject(i))
                    } else if (code == 401) {
                        withContext(Dispatchers.Main) { handleUnauthorized() }; return@launch
                    }
                } catch (_: Exception) {}
                kotlinx.coroutines.delay(10_000)
            }
        }
    }

    private suspend fun processCommand(cmd: JSONObject) {
        val id = cmd.optString("id")
        val tipo = cmd.optString("tipo")
        var status = "confirmado"
        try {
            when (tipo) {
                "atualizar_dashboard", "atualizar_url", "atualizar_config", "sincronizar" -> {
                    withContext(Dispatchers.Main) { loadConfig() }
                }
                "reiniciar_app" -> withContext(Dispatchers.Main) {
                    val i = Intent(this@SignageActivity, SignageActivity::class.java)
                    i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
                    startActivity(i); finish()
                }
                "limpar_cache" -> withContext(Dispatchers.Main) {
                    b.webview.clearCache(true); b.webview.clearHistory(); loadConfig()
                }
                "bloquear" -> withContext(Dispatchers.Main) { showStandby("Dispositivo bloqueado") }
                "desbloquear" -> withContext(Dispatchers.Main) { loadConfig() }
                "alterar_refresh" -> withContext(Dispatchers.Main) { b.webview.reload() }
                else -> status = "confirmado"
            }
        } catch (e: Exception) { status = "erro" }
        val body = JSONObject().put("command_id", id).put("status", status).toString()
        ApiClient.post("tv-device-command-confirm", body, token())
    }

    private fun handleUnauthorized() {
        DeviceStore.clear(this)
        startActivity(Intent(this, PairingActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        heartbeatJob?.cancel(); commandsJob?.cancel(); configJob?.cancel()
        ui.removeCallbacks(playlistRunnable)
        try { wakeLock?.release() } catch (_: Exception) {}
    }
}
