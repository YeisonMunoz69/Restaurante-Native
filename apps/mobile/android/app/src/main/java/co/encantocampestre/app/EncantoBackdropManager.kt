package co.encantocampestre.app

import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.view.View
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

class EncantoBackdropManager : SimpleViewManager<View>() {
    private data class Overlay(val activityContent: View, val dialogRoot: View)

    private val overlays = linkedMapOf<View, Overlay>()
    private var blurred = emptySet<View>()

    override fun getName() = "EncantoBackdrop"

    override fun createViewInstance(context: ThemedReactContext): View =
        object : View(context) {
            override fun onAttachedToWindow() {
                super.onAttachedToWindow()
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
                val content = context.currentActivity?.findViewById<View>(android.R.id.content) ?: return
                // Desenfoco el contenido anterior aunque el equipo deshabilite el blur entre ventanas.
                if (rootView !== content.rootView) {
                    overlays[this] = Overlay(content, rootView)
                    updateBlur()
                }
            }

            override fun onDetachedFromWindow() {
                if (overlays.remove(this) != null) updateBlur()
                super.onDetachedFromWindow()
            }
        }

    private fun updateBlur() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return

        // Si apilo dos diálogos, solo la ventana superior queda nítida.
        val next = overlays.values.groupBy(Overlay::activityContent).flatMap { (content, dialogs) ->
            listOf(content) + dialogs.dropLast(1).map(Overlay::dialogRoot)
        }.toSet()

        (blurred - next).forEach { it.setRenderEffect(null) }
        (next - blurred).forEach { view ->
            val radius = 18f * view.resources.displayMetrics.density
            view.setRenderEffect(RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP))
        }
        blurred = next
    }
}
