plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// versionCode/versionName sobem automaticamente a cada build no CI (env TV_VERSION_CODE / TV_VERSION_NAME).
val baseVersionCode = 19
val ciVersionCode = System.getenv("TV_VERSION_CODE")?.toIntOrNull() ?: baseVersionCode
val ciVersionName = System.getenv("TV_VERSION_NAME")?.takeIf { it.isNotBlank() } ?: "1.6.0"

android {
    namespace = "br.com.pilar.tvsignage"
    compileSdk = 34

    defaultConfig {
        applicationId = "br.com.pilar.tvsignage"
        minSdk = 24
        targetSdk = 34
        versionCode = ciVersionCode
        versionName = ciVersionName



        buildConfigField("String", "SUPABASE_URL", "\"https://ioxugupvxlcdweldocmq.supabase.co\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlveHVndXB2eGxjZHdlbGRvY21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTEwODUsImV4cCI6MjA3NjI4NzA4NX0.WKRpPgsfohk4BRyHthLmz23F2Iab-vPObkioUeFkzWc\"")
        buildConfigField("String", "APP_BASE_URL", "\"https://crmpilar.lovable.app\"")
    }

    flavorDimensions += "modo"
    productFlavors {
        create("normal") {
            dimension = "modo"
            // APK padrão: LAUNCHER + LEANBACK_LAUNCHER (não vira Home)
        }
        create("kiosk") {
            dimension = "modo"
            // APK kiosk: pode ser definido como Launcher/Home padrão do Android
            versionNameSuffix = "-kiosk"
            resValue("string", "app_name_kiosk", "Pilar Remotas Kiosk")
        }
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
    buildFeatures {
        buildConfig = true
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.leanback:leanback:1.0.0")
    implementation("com.google.android.material:material:1.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // CameraX + ML Kit (leitor de QR Code)
    implementation("androidx.camera:camera-core:1.3.1")
    implementation("androidx.camera:camera-camera2:1.3.1")
    implementation("androidx.camera:camera-lifecycle:1.3.1")
    implementation("androidx.camera:camera-view:1.3.1")
    implementation("com.google.mlkit:barcode-scanning:17.2.0")
}
