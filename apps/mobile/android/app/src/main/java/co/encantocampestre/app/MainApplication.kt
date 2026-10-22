package co.encantocampestre.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      useDevSupport = BuildConfig.DEBUG && BuildConfig.BACKEND_ENV == "local",
      packageList =
        PackageList(this).packages.apply {
          add(EncantoBuildPackage())
          // Registro aquí los paquetes nativos que React Native no pueda enlazar automáticamente.
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
