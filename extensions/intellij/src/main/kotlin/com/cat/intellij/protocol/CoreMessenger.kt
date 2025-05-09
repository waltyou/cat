package com.cat.intellij.protocol

import com.cat.intellij.ide.IntelliJIDE
import com.google.gson.JsonElement
import com.intellij.openapi.diagnostic.Logger
import java.io.BufferedReader
import java.io.FileNotFoundException
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.Socket
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import org.json.JSONObject

/**
 * Messenger for communication with the core service.
 * This class handles all communication with the core service via TCP or IPC.
 */
class CoreMessenger(private val ide: IntelliJIDE? = null) {
    private val logger = Logger.getInstance(CoreMessenger::class.java)

    // Communication mode: "tcp" or "ipc"
    private val mode = System.getenv("CAT_CORE_MODE") ?: "tcp"

    // Socket for TCP communication
    private var socket: Socket? = null
    private var writer: PrintWriter? = null
    private var reader: BufferedReader? = null

    // Map to store pending requests
    private val pendingRequests = ConcurrentHashMap<String, CompletableFuture<String>>()

    // Thread for reading responses
    private var readerThread: Thread? = null

    // Flag to indicate if the messenger is initialized
    private var isInitialized = false

    /**
     * Initialize the messenger.
     */
    fun initialize() {
        if (isInitialized) return

        try {
            when (mode) {
                "tcp" -> initializeTcpConnection()
                "ipc" -> initializeIpcConnection()
                else -> {
                    logger.error("Unsupported communication mode: $mode")
                    return
                }
            }

            // Register IDE capabilities with the core if IDE is provided
            if (ide != null) {
                registerIdeCapabilities()
            }

            isInitialized = true
            logger.info("Core service initialized in $mode mode")
        } catch (e: Exception) {
            logger.error("Failed to initialize core service", e)
        }
    }

    /**
     * Initialize TCP connection to the core service.
     */
    private fun initializeTcpConnection() {
        val host = System.getenv("CAT_CORE_HOST") ?: "127.0.0.1"
        val port = System.getenv("CAT_CORE_PORT")?.toIntOrNull() ?: 9876
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
        try {
            // Find the binary executable
            val binaryPath = findBinaryExecutable()
            logger.info("Found binary executable at: $binaryPath")

            // Start the binary process
            val processBuilder = ProcessBuilder(binaryPath.toString())
            processBuilder.environment()["CAT_CORE_MODE"] = "ipc"

            // Redirect error stream to output stream to capture all output
            processBuilder.redirectErrorStream(true)

            // Start the process
            val process = processBuilder.start()

            // Create reader and writer for IPC communication
            writer = PrintWriter(process.outputStream, true)
            reader = BufferedReader(InputStreamReader(process.inputStream))

            // Start a thread to read responses
            readerThread = Thread {
                try {
                    while (!Thread.currentThread().isInterrupted && reader != null) {
                        val response = reader?.readLine()
                        if (response != null) {
                            handleResponse(response)
                        }
                    }
                } catch (e: Exception) {
                    logger.error("Error reading from binary process", e)
                } finally {
                    // Clean up when the thread exits
                    try {
                        process.destroy()
                    } catch (e: Exception) {
                        logger.error("Error destroying binary process", e)
                    }
                }
            }
            readerThread?.isDaemon = true
            readerThread?.start()

            // Add shutdown hook to clean up the process when the IDE exits
            Runtime.getRuntime().addShutdownHook(Thread {
                try {
                    process.destroy()
                } catch (e: Exception) {
                    // Ignore errors during shutdown
                }
            })

            logger.info("Connected to core service via IPC")
        } catch (e: Exception) {
            logger.error("Failed to initialize IPC connection", e)
            throw e
        }
    }

    /**
     * Find the binary executable file.
     * This method looks for the binary in different locations:
     * 1. In development mode: in the binary/bin directory relative to the project root
     * 2. In production mode: in the plugin's directory
     */
    private fun findBinaryExecutable(): java.nio.file.Path {
        // Determine the OS and architecture
        val os = System.getProperty("os.name").lowercase()
        val arch = System.getProperty("os.arch").lowercase()

        // Map OS and architecture to binary name format
        val platform = when {
            os.contains("win") -> "win32"
            os.contains("mac") || os.contains("darwin") -> "darwin"
            os.contains("linux") -> "linux"
            else -> throw IllegalStateException("Unsupported OS: $os")
        }

        val architecture = when {
            arch.contains("amd64") || arch.contains("x86_64") -> "x64"
            arch.contains("aarch64") || arch.contains("arm64") -> "arm64"
            else -> throw IllegalStateException("Unsupported architecture: $arch")
        }

        // Binary file name
        val binaryFileName = if (os.contains("win")) {
            "cat-core-$platform-$architecture.exe"
        } else {
            "cat-core-$platform-$architecture"
        }

        // Try to find the binary in development mode
        val devBinaryPath = java.nio.file.Paths.get("binary", "bin", binaryFileName)
        if (java.nio.file.Files.exists(devBinaryPath)) {
            return devBinaryPath.toAbsolutePath()
        }

        // Try to find the binary in the plugin's directory
        if (ide != null) {
            val pluginPath = ide.javaClass.protectionDomain.codeSource.location.toURI()
            val pluginDir = java.nio.file.Paths.get(pluginPath).parent
            val prodBinaryPath = pluginDir.resolve("bin").resolve(binaryFileName)

            if (java.nio.file.Files.exists(prodBinaryPath)) {
                return prodBinaryPath.toAbsolutePath()
            }
        }

        // If binary not found, throw an exception
        throw FileNotFoundException("Binary executable not found: $binaryFileName")
    }

    /**
     * Register IDE capabilities with the core.
     */
    private fun registerIdeCapabilities() {
        if (ide == null) return

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
                        ide?.showToast(level, message)
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
     * Send a request to the core service.
     */
    fun request(
        messageType: String,
        data: JsonElement?,
        messageId: String?,
        callback: (Any?) -> Unit
    ) {
        try {
            if (!isInitialized) {
                initialize()
            }

            val request = JSONObject()
            request.put("type", messageType)

            if (data != null) {
                // Convert JsonElement to JSONObject or String
                if (data.isJsonPrimitive) {
                    request.put("content", data.asString)
                } else if (data.isJsonObject) {
                    request.put("content", JSONObject(data.toString()))
                }
            }

            // If messageId is provided, use it
            if (messageId != null) {
                request.put("messageId", messageId)
            }

            // Send the request asynchronously
            Thread {
                try {
                    val responseStr = sendRequest(request.toString())
                    val response = JSONObject(responseStr)

                    if (response.has("content")) {
                        val content = response.get("content")
                        callback(content)
                    } else {
                        callback(null)
                    }
                } catch (e: Exception) {
                    logger.error("Error in request", e)
                    callback(mapOf("error" to e.message))
                }
            }.start()
        } catch (e: Exception) {
            logger.error("Failed to send request", e)
            callback(mapOf("error" to e.message))
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
            // Interrupt the reader thread
            readerThread?.interrupt()

            // Close the reader and writer
            reader?.close()
            writer?.close()

            // Close the socket if using TCP
            socket?.close()

            // Reset all references
            readerThread = null
            reader = null
            writer = null
            socket = null
            isInitialized = false

            logger.info("Closed connection to core service")
        } catch (e: Exception) {
            logger.error("Error closing connection to core service", e)
        }
    }
}
