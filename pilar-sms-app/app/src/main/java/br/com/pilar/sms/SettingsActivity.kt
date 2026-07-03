package br.com.pilar.sms

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import br.com.pilar.sms.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var b: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(b.root)

        val prefs = getSharedPreferences("pilar_sms", Context.MODE_PRIVATE)
        b.etToken.setText(prefs.getString("device_token", ""))

        b.tvServer.text = SmsPollingService.SUPABASE_URL
        b.tvVersion.text = try {
            val pi = packageManager.getPackageInfo(packageName, 0)
            "v${pi.versionName}"
        } catch (_: Exception) { "—" }

        b.btnBack.setOnClickListener { finish() }
        b.btnSaveToken.setOnClickListener {
            val token = b.etToken.text.toString().trim()
            if (token.length < 16) {
                Toast.makeText(this, "Token inválido. Gere um no CRM.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.edit().putString("device_token", token).apply()
            Toast.makeText(this, "Token salvo", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
}
