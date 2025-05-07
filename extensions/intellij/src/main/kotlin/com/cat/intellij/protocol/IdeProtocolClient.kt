package com.cat.intellij.protocol

import com.cat.intellij.ide.IntelliJIDE
import com.intellij.openapi.diagnostic.Logger
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.Socket
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import org.json.JSONObject

/**
 * Protocol client for communication between the IDE and the core.
 * This class acts as a bridge between IntelliJ and the core functionality.
 * It communicates with the Node.js core service via TCP in development mode
 * or via IPC in production mode.
 */
class IdeProtocolClient(private val ide: IntelliJIDE) {
    private val logger = Logger.getInstance(IdeProtocolClient::class.java)

    // Communication mode: "tcp" or "ipc"
    private val mode = System.getenv("CAT_CORE_MODE") ?: "tcp"

    // TCP connection properties
    private val host = System.getenv("CAT_CORE_HOST") ?: "localhost"
    private val port = System.getenv("CAT_CORE_PORT")?.toIntOrNull() ?: 3000

    // Socket for TCP communication
    private var socket: Socket? = null
    private var writer: PrintWriter? = null
    private var reader: BufferedReader? = null

    // Map to store pending requests
    private val pendingRequests = ConcurrentHashMap<String, CompletableFuture<String>>()

    // Thread for reading responses
    private var readerThread: Thread? = null

    /**
     * Initialize the protocol client.
     */
    fun initialize() {
        try {
            when (mode) {
                "tcp" -> initializeTcpConnection()
                "ipc" -> initializeIpcConnection()
                else -> {
                    logger.error("Unsupported communication mode: $mode")
                    return
                }
            }

            // Register IDE capabilities with the core
            registerIdeCapabilities()

            logger.info("Core service initialized in $mode mode")
        } catch (e: Exception) {
            logger.error("Failed to initialize core service", e)
        }
    }

    /**
     * Initialize TCP connection to the core service.
     */
    private fun initializeTcpConnection() {
        try {
            // Connect to the core service
            socket = Socket(host, port)
            writer = PrintWriter(socket!!.getOutputStream(), true)
            reader = BufferedReader(InputStreamReader(socket!!.getInputStream()))

            // Start a thread to read responses
            readerThread = Thread {
                try {
                    while (!Thread.currentThread().isInterrupted && socket != null && socket!!.isConnected) {
                        val response = reader?.readLine()
                        if (response != null) {
                            handleResponse(response)
                        }
                    }
                } catch (e: Exception) {
                    logger.error("Error reading from socket", e)
                }
            }
            readerThread?.isDaemon = true
            readerThread?.start()

            logger.info("Connected to core service at $host:$port")
        } catch (e: Exception) {
            logger.error("Failed to connect to core service at $host:$port", e)
            throw e
        }
    }

    /**
     * Initialize IPC connection to the core service.
     */
    private fun initializeIpcConnection() {
        // In production, the core is built as a binary executable
        // and communicates with the extension via IPC
        // This is a placeholder for the IPC implementation
        logger.info("IPC connection not yet implemented")
        throw NotImplementedError("IPC connection not yet implemented")
    }

    /**
     * Register IDE capabilities with the core.
     */
    private fun registerIdeCapabilities() {
        // Send IDE information to the core
        val ideInfo = ide.getIdeInfo()
        val ideSettings = ide.getIdeSettings()

        val request = JSONObject()
        request.put("type", "registerIde")
        request.put("ideInfo", JSONObject(ideInfo))
        request.put("ideSettings", JSONObject(ideSettings))

        sendRequest(request.toString())
    }

    /**
     * Handle a response from the core service.
     */
    private fun handleResponse(responseStr: String) {
        try {
            val response = JSONObject(responseStr)
            val messageId = response.optString("messageId")
            val future = pendingRequests.remove(messageId)

            if (future != null) {
                future.complete(responseStr)
            } else {
                // Handle unsolicited messages (e.g., notifications)
                val type = response.optString("type")
                when (type) {
                    "log" -> {
                        val level = response.optJSONObject("data")?.optString("level") ?: "info"
                        val message = response.optJSONObject("data")?.optString("message") ?: ""
                        ide.showToast(level, message)
                    }
                    "statusUpdate" -> {
                        val status = response.optJSONObject("data")?.optString("status") ?: ""
                        logger.info("Core status updated: $status")
                    }
                    else -> {
                        logger.info("Received unsolicited message: $responseStr")
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("Error handling response: $responseStr", e)
        }
    }

    /**
     * Send a request to the core service and wait for a response.
     */
    private fun sendRequest(request: String, timeout: Long = 5000): String {
        val messageId = UUID.randomUUID().toString()
        val requestObj = JSONObject(request)
        requestObj.put("messageId", messageId)

        val future = CompletableFuture<String>()
        pendingRequests[messageId] = future

        writer?.println(requestObj.toString())

        try {
            return future.get(timeout, TimeUnit.MILLISECONDS)
        } catch (e: Exception) {
            pendingRequests.remove(messageId)
            logger.error("Error sending request: $request", e)
            throw e
        }
    }

    /**
     * Ping the core service.
     */
    fun pingCore(message: String): String {
        try {
            val request = JSONObject()
            request.put("type", "ping")
            request.put("content", message)

            val responseStr = sendRequest(request.toString())
            val response = JSONObject(responseStr)

            return if (response.has("content")) {
                response.getString("content")
            } else {
                "No response content"
            }
        } catch (e: Exception) {
            logger.error("Failed to ping core service", e)
            return "Error: ${e.message}"
        }
    }

    /**
     * Process a message through the core service.
     */
    fun processMessage(message: String): String {
        try {
            val request = JSONObject()
            request.put("type", "processMessage")

            val content = JSONObject()
            content.put("message", message)
            request.put("content", content)

            val responseStr = sendRequest(request.toString())
            val response = JSONObject(responseStr)

            return if (response.has("content")) {
                val contentObj = response.getJSONObject("content")
                contentObj.optString("response", "No response")
            } else {
                "No response content"
            }
        } catch (e: Exception) {
            logger.error("Failed to process message", e)
            return "Error: ${e.message}"
        }
    }

    /**
     * Get information about the core service.
     */
    fun getCoreInfo(): Map<String, String> {
        try {
            val request = JSONObject()
            request.put("type", "getCoreInfo")

            val responseStr = sendRequest(request.toString())
            val response = JSONObject(responseStr)

            return if (response.has("content")) {
                val content = response.getJSONObject("content")
                mapOf(
                    "version" to content.optString("version", "unknown"),
                    "status" to content.optString("status", "unknown")
                )
            } else {
                mapOf(
                    "version" to "unknown",
                    "status" to "no response"
                )
            }
        } catch (e: Exception) {
            logger.error("Failed to get core info", e)
            return mapOf(
                "version" to "unknown",
                "status" to "error: ${e.message}"
            )
        }
    }

    /**
     * Close the connection to the core service.
     */
    fun close() {
        try {
            readerThread?.interrupt()
            reader?.close()
            writer?.close()
            socket?.close()

            readerThread = null
            reader = null
            writer = null
            socket = null

            logger.info("Closed connection to core service")
        } catch (e: Exception) {
            logger.error("Error closing connection to core service", e)
        }
    }
}
