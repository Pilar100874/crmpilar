package br.com.pilar.tvsignage

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity

/**
 * Activity principal / ponto de entrada do app (LAUNCHER, LEANBACK_LAUNCHER e — na variante
 * kiosk — também HOME). Ela apenas mantém a tela ligada, aplica tela cheia e roteia para a
 * tela de pareamento ou para o signage. Nenhum serviço de mídia é iniciado aqui.
 */
class MainActivity : AppCompatActivity() {

    private val ui = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                or WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                or WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )
        applyImmersive()
        setContentView(R.layout.activity_boot)

        val fromBoot = intent?.getBooleanExtra(EXTRA_FROM_BOOT, false) == true
        android.util.Log.i(
            "PilarMainActivity",
            "onCreate fromBoot=$fromBoot | bootAction=${intent?.getStringExtra(BootReceiver.EXTRA_BOOT_ACTION)} " +
                "| tentativa=${intent?.getIntExtra(BootReceiver.EXTRA_BOOT_ATTEMPT, 0)} " +
                "| uptime=${android.os.SystemClock.elapsedRealtime()}ms | pareado=${DeviceStore.isPaired(this)}"
        )

        // Pequeno atraso: em TV Box (RK3528) o Wi-Fi ainda pode estar subindo logo após o boot.
        val delay = if (fromBoot) 3000L else 0L
        ui.postDelayed({ route() }, delay)
    }


    private fun route() {
        val next = if (DeviceStore.isPaired(this)) SignageActivity::class.java else PairingActivity::class.java
        val i = Intent(this, next)
        i.addFlags(
            Intent.FLAG_ACTIVITY_CLEAR_TOP
                or Intent.FLAG_ACTIVITY_SINGLE_TOP
        )
        startActivity(i)
        overridePendingTransition(0, 0)
        finish()
    }

    private fun applyImmersive() {
        @Suppress("DEPRECATION")
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

    override fun onDestroy() {
        super.onDestroy()
        ui.removeCallbacksAndMessages(null)
    }

    companion object {
        const val EXTRA_FROM_BOOT = "from_boot"
    }
}
