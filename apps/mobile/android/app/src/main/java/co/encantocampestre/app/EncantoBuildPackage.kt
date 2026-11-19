package co.encantocampestre.app

import android.os.CancellationSignal
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.core.content.ContextCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

// Solo publico identificadores y entorno; jamás contraseñas de la API o Supabase.
class EncantoBuildModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "EncantoBuild"
    override fun getConstants(): Map<String, Any> = mapOf(
        "environment" to BuildConfig.BACKEND_ENV,
        "googleWebClientId" to BuildConfig.GOOGLE_WEB_CLIENT_ID,
        "webOrigin" to BuildConfig.WEB_ORIGIN
    )

    // Entrego el ID token a JavaScript para enviarlo a nuestra API sin guardarlo.
    @ReactMethod
    fun googleIdToken(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        val clientId = BuildConfig.GOOGLE_WEB_CLIENT_ID.trim()
        if (activity == null || clientId.isEmpty()) {
            promise.reject("GOOGLE_NOT_CONFIGURED", "Google Sign-In is unavailable")
            return
        }
        val option = GetSignInWithGoogleOption.Builder(clientId).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        activity.runOnUiThread {
            CredentialManager.create(activity).getCredentialAsync(
                activity,
                request,
                CancellationSignal(),
                ContextCompat.getMainExecutor(activity),
                object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                    override fun onResult(result: GetCredentialResponse) {
                        val credential = result.credential
                        if (credential !is CustomCredential ||
                            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                        ) {
                            promise.reject("GOOGLE_SIGN_IN_FAILED", "Unexpected credential")
                            return
                        }
                        try {
                            promise.resolve(GoogleIdTokenCredential.createFrom(credential.data).idToken)
                        } catch (_: Exception) {
                            promise.reject("GOOGLE_SIGN_IN_FAILED", "Invalid Google credential")
                        }
                    }

                    override fun onError(error: GetCredentialException) {
                        if (error is GetCredentialCancellationException) {
                            promise.resolve(null)
                        } else {
                            promise.reject("GOOGLE_SIGN_IN_FAILED", "Google account selection failed")
                        }
                    }
                },
            )
        }
    }
}

class EncantoBuildPackage : ReactPackage {
    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(EncantoBuildModule(context))
    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(EncantoBackdropManager())
}
