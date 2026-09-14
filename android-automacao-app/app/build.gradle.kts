plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val baseVersionCode = 2
val ciVersionCode = System.getenv("AUTO_VERSION_CODE")?.toIntOrNull() ?: baseVersionCode
val ciVersionName = System.getenv("AUTO_VERSION_NAME")?.takeIf { it.isNotBlank() } ?: "1.8.0"

android {
    namespace = "br.com.pilar.automacao"
    compileSdk = 34

    defaultConfig {
        applicationId = "br.com.pilar.automacao"
        minSdk = 24
        targetSdk = 34
        versionCode = ciVersionCode
        versionName = ciVersionName

        buildConfigField("String", "APP_BASE_URL", "\"https://crmpilar.lovable.app\"")
        buildConfigField("String", "SUPABASE_URL", "\"https://ioxugupvxlcdweldocmq.supabase.co\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc\"")
    }

    signingConfigs {
        create("pilar") {
            storeFile = rootProject.file("../pilar-sms-app/app/pilar-release.keystore")
            storePassword = "pilarsms"
            keyAlias = "pilar"
            keyPassword = "pilarsms"
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true
            enableV4Signing = false
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("pilar")
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
