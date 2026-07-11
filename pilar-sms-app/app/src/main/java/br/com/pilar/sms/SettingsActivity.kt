package br.com.pilar.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.telephony.SubscriptionManager
import android.view.ViewGroup
import android.widget.RadioButton
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
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

        // Retentativas
        val retries = prefs.getInt("max_retries", 3).coerceIn(0, 10)
        b.etRetries.setText(retries.toString())
        b.btnSaveRetries.setOnClickListener {
            val n = b.etRetries.text?.toString()?.trim()?.toIntOrNull()
            if (n == null || n < 0 || n > 10) {
                Toast.makeText(this, "Informe um número entre 0 e 10.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.edit().putInt("max_retries", n).apply()
            Toast.makeText(this, "Retentativas salvas: $n", Toast.LENGTH_SHORT).show()
        }

        populateSims(prefs)
    }


    private fun populateSims(prefs: android.content.SharedPreferences) {
        b.simGroup.removeAllViews()

        val currentPref = prefs.getInt("preferred_sim_index", -1)

        // Opção Automático (sempre presente)
        addRadio(-1, "Automático (usar chip padrão do sistema)", currentPref == -1, prefs)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
            != PackageManager.PERMISSION_GRANTED) {
            b.tvSimHint.text = "Conceda a permissão de telefone para listar os chips (SIMs)."
            return
        }

        val subs = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                SubscriptionManager.from(this).activeSubscriptionInfoList.orEmpty()
            } else emptyList()
        } catch (_: SecurityException) { emptyList() }

        if (subs.isEmpty()) {
            b.tvSimHint.text = "Nenhum chip ativo detectado."
            return
        }

        val defaultSubId = SubscriptionManager.getDefaultSmsSubscriptionId()
        subs.forEachIndexed { idx, info ->
            val carrier = (info.carrierName ?: "SIM").toString()
            val slot = if (info.simSlotIndex >= 0) "slot ${info.simSlotIndex + 1}" else ""
            val isDefault = info.subscriptionId == defaultSubId
            val label = buildString {
                append("Chip ${idx + 1}: $carrier")
                if (slot.isNotEmpty()) append("  •  $slot")
                if (isDefault) append("  •  padrão")
            }
            addRadio(idx, label, currentPref == idx, prefs)
        }
        b.tvSimHint.text = "A escolha vale para a fila do CRM e para envios de teste."
    }

    private fun addRadio(index: Int, label: String, checked: Boolean, prefs: android.content.SharedPreferences) {
        val rb = RadioButton(this).apply {
            text = label
            isChecked = checked
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                prefs.edit().putInt("preferred_sim_index", index).apply()
                // desmarca os demais
                for (i in 0 until b.simGroup.childCount) {
                    val child = b.simGroup.getChildAt(i)
                    if (child is RadioButton && child !== this) child.isChecked = false
                }
                Toast.makeText(this@SettingsActivity, "Chip selecionado", Toast.LENGTH_SHORT).show()
            }
        }
        b.simGroup.addView(rb)
    }
}
