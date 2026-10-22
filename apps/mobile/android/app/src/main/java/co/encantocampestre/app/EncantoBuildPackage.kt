package co.encantocampestre.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.uimanager.ViewManager

// Solo publico identificadores y entorno; jamás contraseñas de la API o Supabase.
class EncantoBuildModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "EncantoBuild"
    override fun getConstants(): Map<String, Any> = mapOf(
        "environment" to BuildConfig.BACKEND_ENV,
        "googleWebClientId" to BuildConfig.GOOGLE_WEB_CLIENT_ID
    )
}

class EncantoBuildPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(EncantoBuildModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
