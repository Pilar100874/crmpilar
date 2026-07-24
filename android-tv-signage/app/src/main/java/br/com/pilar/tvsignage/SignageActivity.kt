package br.com.pilar.tvsignage

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.text.InputType
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
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

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!DeviceStore.isPaired(this)) {
            startActivity(Intent(this, PairingActivity::class.java))
            finish()
            return
        }

        b = ActivitySignageBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Mantém a tela sempre ligada, ignora bloqueio e liga a tela se estiver apagada
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                or WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                or WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
        applyImmersive()

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
            "PilarTv::signage"
        ).also { it.acquire() }

        val w = b.webview.settings
        w.javaScriptEnabled = true
        w.domStorageEnabled = true
        w.mediaPlaybackRequiresUserGesture = false
        w.cacheMode = WebSettings.LOAD_DEFAULT
        w.userAgentString = w.userAgentString + " PilarTvSignage/1.0"
        b.webview.webViewClient = WebViewClient()

        // Hotspot invisível (canto superior esquerdo): long-press para pedir senha e sair
        b.exitHotspot.setOnLongClickListener {
            promptExitPassword()
            true
        }

        loadConfig()
        startHeartbeat()
        startCommandsPolling()
    }

    private fun applyImmersive() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) applyImmersive()
    }

    override fun onResume() {
        super.onResume()
        applyImmersive()
        startKioskMode()
    }

    /** Ativa modo kiosk (screen pinning). No primeiro uso o Android pede confirmação. */
    private fun startKioskMode() {
        try {
            val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val isInLockTask = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                am.lockTaskModeState != ActivityManager.LOCK_TASK_MODE_NONE
            } else {
                @Suppress("DEPRECATION") am.isInLockTaskMode
            }
            if (!isInLockTask) {
                startLockTask()
            }
        } catch (_: Exception) {}
    }

    private fun stopKioskMode() {
        try { stopLockTask() } catch (_: Exception) {}
    }

    // Bloqueia botão voltar e teclas de mídia — usuário só sai pelo hotspot com senha
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_BACK,
            KeyEvent.KEYCODE_MENU,
            KeyEvent.KEYCODE_HOME,
            KeyEvent.KEYCODE_APP_SWITCH -> true
            else -> super.onKeyDown(keyCode, event)
        }
    }

    override fun onBackPressed() {
        // ignora — bloqueio de kiosk
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        // Se o usuário tentar sair (home), reabre a activity
        val i = Intent(this, SignageActivity::class.java)
        i.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        startActivity(i)
    }

    private fun promptExitPassword() {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 8)
        }
        val input = EditText(this).apply {
            hint = "Senha"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        container.addView(input)

        AlertDialog.Builder(this)
            .setTitle("Sair do modo kiosk")
            .setMessage("Digite a senha para desbloquear e sair.")
            .setView(container)
            .setPositiveButton("Sair") { d, _ ->
                val pwd = input.text.toString()
                if (pwd == DeviceStore.exitPassword(this)) {
                    stopKioskMode()
                    d.dismiss()
                    Toast.makeText(this, "Kiosk desbloqueado", Toast.LENGTH_SHORT).show()
                    finish()
                } else {
                    Toast.makeText(this, "Senha incorreta", Toast.LENGTH_SHORT).show()
                }
            }
            .setNeutralButton("Alterar senha") { _, _ ->
                val pwd = input.text.toString()
                if (pwd == DeviceStore.exitPassword(this)) {
                    promptChangePassword()
                } else {
                    Toast.makeText(this, "Senha atual incorreta", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun promptChangePassword() {
        val input = EditText(this).apply {
            hint = "Nova senha"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        AlertDialog.Builder(this)
            .setTitle("Nova senha de saída")
            .setView(input)
            .setPositiveButton("Salvar") { _, _ ->
                val nv = input.text.toString().trim()
                if (nv.length < 4) {
                    Toast.makeText(this, "Mínimo 4 caracteres", Toast.LENGTH_SHORT).show()
                } else {
                    DeviceStore.setExitPassword(this, nv)
                    Toast.makeText(this, "Senha atualizada", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
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
                // 401/403 = token inválido; 404 = dispositivo foi excluído no painel
                if (code == 401 || code == 403 || code == 404) {
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
        stopKioskMode()
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
