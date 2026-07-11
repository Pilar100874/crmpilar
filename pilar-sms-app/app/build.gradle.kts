plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.com.pilar.sms"
    compileSdk = 34

    defaultConfig {
        applicationId = "br.com.pilar.sms"
        minSdk = 21
        targetSdk = 34
       versionCode = 17
       versionName = "1.4.9"
    }

    signingConfigs {
        create("pilar") {
            storeFile = file("pilar-release.keystore")
            storePassword = "pilarsms"
            keyAlias = "pilar"
            keyPassword = "pilarsms"
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true
            enableV4Signing = false
        }
        getByName("debug") {
            storeFile = file("pilar-release.keystore")
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
        debug {
            signingConfig = signingConfigs.getByName("pilar")
        }
        release {
            signingConfig = signingConfigs.getByName("pilar")
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { viewBinding = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    // Coroutines para o polling em background
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}
