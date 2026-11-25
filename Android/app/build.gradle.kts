plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// One version for the whole project: the VERSION file at the repository root.
val projectVersion = rootProject.file("../VERSION").readText().trim()
val versionParts = projectVersion.split(".").map { it.toInt() }
val androidVersionCode = versionParts[0] * 10_000 + versionParts[1] * 100 + versionParts[2]

android {
    namespace = "com.hungryhopper.app"
    compileSdk = 36

    sourceSets {
        getByName("main") {
            assets.srcDir("build/generated/web-assets")
        }
    }

    defaultConfig {
        applicationId = "com.hungryhopper.app"
        minSdk = 24
        targetSdk = 36
        versionCode = androidVersionCode
        versionName = projectVersion

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
}

// Builds the web app (../web, React + Vite) into one self-contained HTML file and bundles it
// as the app's index.html. Skip with -PskipWebBuild to reuse an existing build in ../web/dist.
val buildWeb by tasks.registering(Exec::class) {
    workingDir = rootProject.file("../web")
    commandLine("sh", "-c", "npm ci && npm run build")
    onlyIf { !project.hasProperty("skipWebBuild") }
}

val copyWeb by tasks.registering(Copy::class) {
    dependsOn(buildWeb)
    from(fileTree(rootProject.file("../web")) { include("dist/hungry_hopper-v*.html") }) { rename { "index.html" } }
    into(layout.buildDirectory.dir("generated/web-assets"))
}

tasks.named("preBuild") { dependsOn(copyWeb) }

dependencies {

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation("androidx.webkit:webkit:1.11.0")
    implementation(libs.material)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
