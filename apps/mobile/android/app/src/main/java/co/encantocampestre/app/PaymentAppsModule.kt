package co.encantocampestre.app

import android.content.ActivityNotFoundException
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Consulto únicamente las apps sugeridas, en el orden en que se muestran en el pago.
class PaymentAppsModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val apps = linkedMapOf(
        "com.nequi.MobileApp" to "Nequi",
        "com.davivienda.daviplataapp" to "DaviPlata",
        "co.com.bancolombia.personas.superapp" to "Mi Bancolombia",
        "com.davivienda.daviviendaapp" to "Davivienda",
        "com.bancodebogota.bancamovil" to "Banco de Bogotá",
        "co.com.bbva.mb" to "BBVA Colombia",
        "com.bcs.retail" to "Banco Caja Social",
    )

    override fun getName() = "EncantoPaymentApps"

    @ReactMethod
    fun available(promise: Promise) {
        val packageManager = reactApplicationContext.packageManager
        val available = Arguments.createArray()
        for ((packageName, name) in apps) {
            if (packageManager.getLaunchIntentForPackage(packageName) == null) continue
            available.pushMap(Arguments.createMap().apply {
                putString("packageName", packageName)
                putString("name", name)
            })
        }
        promise.resolve(available)
    }

    // Abro la pantalla inicial de la app bancaria. La operación continúa allí.
    @ReactMethod
    fun open(packageName: String, promise: Promise) {
        val intent = if (packageName in apps) {
            reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
        } else null
        if (intent == null) {
            promise.reject("PAYMENT_APP_UNAVAILABLE", "Payment app unavailable")
            return
        }
        try {
            reactApplicationContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            promise.resolve(null)
        } catch (error: ActivityNotFoundException) {
            promise.reject("PAYMENT_APP_UNAVAILABLE", error)
        } catch (error: SecurityException) {
            promise.reject("PAYMENT_APP_UNAVAILABLE", error)
        }
    }
}
