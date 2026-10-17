package co.encantocampestre.app

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  // Indico el componente JavaScript que React Native monta al iniciar la actividad.
  override fun getMainComponentName(): String = "HelloWorld"

  // Mantengo habilitada la Nueva Arquitectura con el delegado recomendado por React Native.
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
