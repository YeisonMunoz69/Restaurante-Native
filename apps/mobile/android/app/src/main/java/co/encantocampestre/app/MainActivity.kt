package co.encantocampestre.app

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    receiveReceipt(intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    receiveReceipt(intent)
  }

  private fun receiveReceipt(incoming: Intent?) {
    if (incoming?.action != Intent.ACTION_SEND) return
    ReceiptShareFiles.receive(applicationContext, incoming)
    setIntent(Intent(Intent.ACTION_MAIN))
  }

  // Indico el componente JavaScript que React Native monta al iniciar la actividad.
  override fun getMainComponentName(): String = "HelloWorld"

  // Mantengo habilitada la Nueva Arquitectura con el delegado recomendado por React Native.
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
