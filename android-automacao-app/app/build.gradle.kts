plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val baseVersionCode = 1
val ciVersionCode = System.getenv("AUTO_VERSION_CODE")?.toIntOrNull() ?: baseVersionCode
val ciVersionName = System.getenv("AUTO_VERSION_NAME")?.takeIf { it.isNotBlank() } ?: "1.0.0"

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
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("com.google.android.material:material:1.11.0")
}
