package co.encantocampestre.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.IntentCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.IOException
import java.io.DataInputStream
import java.util.UUID
import java.util.concurrent.Executors

internal object ReceiptShareFiles {
    private const val MAX_BYTES = 10L * 1024 * 1024
    const val EVENT = "EncantoIncomingReceipt"
    val worker = Executors.newSingleThreadExecutor()
    @Volatile var notify: (() -> Unit)? = null

    private fun directory(context: Context) =
        File(context.noBackupFilesDir, "reservation-receipts").apply { mkdirs() }

    private fun preferences(context: Context) =
        context.getSharedPreferences("encanto_incoming_receipt", Context.MODE_PRIVATE)

    fun receive(context: Context, intent: Intent) {
        worker.execute {
            val storage = preferences(context)
            try {
                val uri = IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
                    ?: intent.clipData?.takeIf { it.itemCount == 1 }?.getItemAt(0)?.uri
                    ?: throw IOException("Missing image")
                if (uri.scheme != "content" || intent.type?.startsWith("image/") != true) {
                    throw IOException("Unsupported share")
                }
                val file = copy(context, uri)
                val previous = pending(context, false)
                val claimed = storage.getString("claimed", null)
                if (!storage.edit().putString("pending", file.name).remove("error").remove("claimed").commit()) {
                    file.delete()
                    throw IOException("Cannot store share")
                }
                if (previous != null && previous.name != claimed) previous.delete()
            } catch (_: Exception) {
                storage.edit().putBoolean("error", true).commit()
            }
            notify?.invoke()
        }
    }

    fun pending(context: Context, forAccount: Boolean): File? {
        val storage = preferences(context)
        val name = storage.getString("pending", null) ?: return null
        val file = File(directory(context), name).takeIf(File::isFile) ?: return null
        if (forAccount) storage.edit().putString("claimed", name).commit()
        return file
    }

    fun acknowledge(context: Context, name: String) {
        val storage = preferences(context)
        if (storage.getString("pending", null) == name) storage.edit().remove("pending").remove("claimed").commit()
    }

    fun takeError(context: Context): Boolean {
        val storage = preferences(context)
        val error = storage.getBoolean("error", false)
        storage.edit().remove("error").commit()
        return error
    }

    fun remove(context: Context, name: String) {
        if (Regex("[a-f0-9-]{36}\\.(png|jpg|webp)").matches(name)) {
            File(directory(context), name).delete()
            acknowledge(context, name)
        }
    }

    fun copy(context: Context, uri: Uri): File {
        val temporary = File.createTempFile("receipt-", ".tmp", directory(context))
        try {
            if (uri.scheme == "file") {
                val file = File(uri.path ?: "").canonicalFile
                if (!file.path.startsWith(context.cacheDir.canonicalPath + File.separator)) throw IOException("Not a picker file")
            } else if (uri.scheme != "content") {
                throw IOException("Unsupported URI")
            }
            val stream = context.contentResolver.openInputStream(uri) ?: throw IOException("Image unavailable")
            stream.use { input ->
                temporary.outputStream().use { output ->
                    val buffer = ByteArray(32 * 1024)
                    var size = 0L
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        size += count
                        if (size > MAX_BYTES) throw IOException("Image too large")
                        output.write(buffer, 0, count)
                    }
                }
            }
            val header = ByteArray(12)
            DataInputStream(temporary.inputStream()).use { it.readFully(header) }
            val extension = when {
                header.copyOf(8).contentEquals(byteArrayOf(-119, 80, 78, 71, 13, 10, 26, 10)) -> "png"
                header[0] == (-1).toByte() && header[1] == (-40).toByte() && header[2] == (-1).toByte() -> "jpg"
                String(header, 0, 4, Charsets.US_ASCII) == "RIFF" &&
                    String(header, 8, 4, Charsets.US_ASCII) == "WEBP" -> "webp"
                else -> throw IOException("Unsupported image")
            }
            val finalFile = File(directory(context), "${UUID.randomUUID()}.$extension")
            if (!temporary.renameTo(finalFile)) throw IOException("Cannot save image")
            return finalFile
        } finally {
            temporary.delete()
        }
    }
}

class ReceiptShareModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName() = "EncantoReceiptShare"
    override fun initialize() {
        super.initialize()
        ReceiptShareFiles.notify = {
            if (context.hasActiveReactInstance()) context.emitDeviceEvent(ReceiptShareFiles.EVENT)
        }
    }
    override fun invalidate() {
        ReceiptShareFiles.notify = null
        super.invalidate()
    }

    private fun descriptor(file: File) = Arguments.createMap().apply {
        putString("fileName", file.name)
        putString("uri", Uri.fromFile(file).toString())
        putString("type", if (file.extension == "jpg") "image/jpeg" else "image/${file.extension}")
    }

    @ReactMethod fun peek(forAccount: Boolean, promise: Promise) {
        ReceiptShareFiles.worker.execute {
            val result = Arguments.createMap()
            ReceiptShareFiles.pending(context, forAccount)?.let { result.putMap("receipt", descriptor(it)) }
            result.putBoolean("error", ReceiptShareFiles.takeError(context))
            promise.resolve(result)
        }
    }
    @ReactMethod fun acknowledge(name: String, promise: Promise) {
        ReceiptShareFiles.worker.execute {
            ReceiptShareFiles.acknowledge(context, name)
            promise.resolve(null)
        }
    }
    @ReactMethod fun save(uri: String, promise: Promise) {
        ReceiptShareFiles.worker.execute {
            try {
                promise.resolve(descriptor(ReceiptShareFiles.copy(context, Uri.parse(uri))))
            } catch (_: Exception) {
                promise.reject("RECEIPT_SAVE_FAILED", "Cannot save receipt")
            }
        }
    }
    @ReactMethod fun remove(name: String, promise: Promise) {
        ReceiptShareFiles.worker.execute {
            ReceiptShareFiles.remove(context, name)
            promise.resolve(null)
        }
    }
}
