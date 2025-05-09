package com.cat.intellij.factories

import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.callback.CefCallback
import org.cef.handler.CefResourceHandler
import org.cef.handler.CefResourceHandlerAdapter
import org.cef.callback.CefSchemeHandlerFactory
import org.cef.misc.IntRef
import org.cef.misc.StringRef
import org.cef.network.CefRequest
import org.cef.network.CefResponse
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import java.nio.charset.StandardCharsets

/**
 * Custom scheme handler factory for the Cat plugin.
 * This factory creates handlers for the "http://cat" scheme.
 */
class CustomSchemeHandlerFactory : CefSchemeHandlerFactory {
    override fun create(
        browser: CefBrowser?,
        frame: CefFrame?,
        schemeName: String?,
        request: CefRequest?
    ): CefResourceHandler {
        return object : CefResourceHandlerAdapter() {
            private var inputStream: InputStream? = null
            private val html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Cat</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; }
                    </style>
                </head>
                <body>
                    <h1>Cat Plugin</h1>
                    <p>This is a custom scheme handler for the Cat plugin.</p>
                </body>
                </html>
            """.trimIndent()

            @Throws(IOException::class)
            override fun processRequest(request: CefRequest?, callback: CefCallback?): Boolean {
                callback?.Continue()
                return true
            }

            @Throws(IOException::class)
            override fun getResponseHeaders(
                response: CefResponse?,
                responseLength: IntRef?,
                redirectUrl: StringRef?
            ) {
                response?.mimeType = "text/html"
                response?.status = 200
                val bytes = html.toByteArray(StandardCharsets.UTF_8)
                responseLength?.set(bytes.size)
                inputStream = ByteArrayInputStream(bytes)
            }

            @Throws(IOException::class)
            override fun readResponse(
                dataOut: ByteArray?,
                bytesToRead: Int,
                bytesRead: IntRef?,
                callback: CefCallback?
            ): Boolean {
                if (dataOut == null || bytesToRead <= 0 || inputStream == null) {
                    return false
                }

                val availableBytes = inputStream!!.available()
                if (availableBytes == 0) {
                    bytesRead?.set(0)
                    inputStream?.close()
                    inputStream = null
                    return false
                }

                val maxBytesToRead = Math.min(bytesToRead, availableBytes)
                val bytesReadCount = inputStream!!.read(dataOut, 0, maxBytesToRead)
                bytesRead?.set(bytesReadCount)
                return true
            }

            override fun cancel() {
                try {
                    inputStream?.close()
                } catch (e: IOException) {
                    // Ignore
                } finally {
                    inputStream = null
                }
            }
        }
    }
}
