package com.kdomy.litebook.utils.jsBridge

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Base64
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.widget.Toast
import com.kdomy.litebook.R
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class DownloadBridge(private val context: Context) {
    @JavascriptInterface
    @Suppress("unused")
    fun downloadUrl(url: String, mimeType: String) {
        Thread {
            runCatching {
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    throw IOException("Invalid URL")
                }

                var currentUrl = url
                var connection: HttpURLConnection? = null

                for (hop in 0 until 5) {
                    connection = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                        connectTimeout = 30000
                        readTimeout = 30000
                        instanceFollowRedirects = false
                        setRequestProperty(
                            "User-Agent",
                            "Mozilla/5.0 (Linux; Android) AppleWebKit/537.36"
                        )
                        val cookie = CookieManager.getInstance().getCookie(currentUrl)
                        if (!cookie.isNullOrEmpty()) {
                            setRequestProperty("Cookie", cookie)
                        }
                    }
                    connection.connect()

                    if (connection.responseCode in 300..399) {
                        val location = connection.getHeaderField("Location")
                        connection.disconnect()
                        if (location.isNullOrEmpty()) throw IOException("Redirect without location")
                        currentUrl = location
                        continue
                    }

                    if (connection.responseCode !in 200..299) {
                        throw IOException("HTTP ${connection.responseCode}")
                    }

                    val contentType = connection.contentType
                    val finalMimeType =
                        if (contentType?.startsWith("video/") == true) contentType else mimeType
                    val ext = MimeTypeMap.getSingleton()
                        .getExtensionFromMimeType(finalMimeType) ?: "mp4"
                    val fileName = "${System.currentTimeMillis()}.$ext"

                    connection.inputStream.use { input ->
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            val contentValues = ContentValues().apply {
                                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                                put(MediaStore.Downloads.MIME_TYPE, finalMimeType)
                                put(
                                    MediaStore.Downloads.RELATIVE_PATH,
                                    Environment.DIRECTORY_DOWNLOADS
                                )
                                put(MediaStore.Downloads.IS_PENDING, 1)
                            }

                            val resolver = context.contentResolver
                            val uri = resolver.insert(
                                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                                contentValues
                            )

                            if (uri == null) throw IOException("Failed to create file")

                            resolver.openOutputStream(uri)?.use { outputStream ->
                                input.copyTo(outputStream)
                            }
                            contentValues.clear()
                            contentValues.put(MediaStore.Downloads.IS_PENDING, 0)
                            resolver.update(uri, contentValues, null, null)
                        } else {
                            val downloadsDir = Environment.getExternalStoragePublicDirectory(
                                Environment.DIRECTORY_DOWNLOADS
                            )
                            if (!downloadsDir.exists()) downloadsDir.mkdirs()
                            File(downloadsDir, fileName).outputStream().use { outputStream ->
                                input.copyTo(outputStream)
                            }
                        }
                    }

                    connection.disconnect()

                    Handler(Looper.getMainLooper()).post {
                        Toast.makeText(
                            context,
                            context.getString(R.string.saved_to_downloads),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                    return@runCatching
                }

                throw IOException("Too many redirects")
            }.onFailure {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(
                        context,
                        context.getString(R.string.failed_to_save_file),
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }.start()
    }

    @JavascriptInterface
    @Suppress("unused")
    fun downloadBase64File(base64Data: String, mimeType: String) {
        runCatching {
            if (!base64Data.contains(",")) {
                Toast.makeText(
                    context,
                    context.getString(R.string.download_failed_invalid_data),
                    Toast.LENGTH_SHORT
                ).show()
                return
            }

            val data = Base64.decode(base64Data.split(",")[1], Base64.DEFAULT)

            // Determine if it's an image or video
            val isImage = mimeType.startsWith("image/")
            val isVideo = mimeType.startsWith("video/")

            val (finalData, finalMimeType, extension) = when {
                isImage -> {
                    // Convert images to PNG for maximum compatibility
                    val bitmap = BitmapFactory.decodeByteArray(data, 0, data.size)
                    if (bitmap != null) {
                        val outputStream = ByteArrayOutputStream()
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                        Triple(outputStream.toByteArray(), "image/png", "png")
                    } else {
                        // If bitmap decoding fails, use original data
                        val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "bin"
                        Triple(data, mimeType, ext)
                    }
                }
                isVideo -> {
                    // Keep videos as-is
                    val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "mp4"
                    Triple(data, mimeType, ext)
                }
                else -> {
                    // Unknown type, keep as-is
                    val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "bin"
                    Triple(data, mimeType, ext)
                }
            }

            val fileName = "${System.currentTimeMillis()}.$extension"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, finalMimeType)
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }

                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)

                uri?.let {
                    resolver.openOutputStream(it)?.use { outputStream ->
                        outputStream.write(finalData)
                    }
                    contentValues.clear()
                    contentValues.put(MediaStore.Downloads.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)

                    Toast.makeText(
                        context,
                        context.getString(R.string.saved_to_downloads),
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val file = File(downloadsDir, fileName)

                FileOutputStream(file).use { it.write(finalData) }
                Toast.makeText(
                    context,
                    context.getString(R.string.saved_to_downloads),
                    Toast.LENGTH_SHORT
                ).show()
            }
        }.onFailure {
            Toast.makeText(
                context,
                context.getString(R.string.failed_to_save_file),
                Toast.LENGTH_SHORT
            ).show()
        }
    }
}