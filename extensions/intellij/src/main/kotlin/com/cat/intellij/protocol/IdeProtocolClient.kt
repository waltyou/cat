package com.cat.intellij.protocol

import com.cat.intellij.ide.IntelliJIDE
import com.intellij.openapi.diagnostic.Logger

/**
 * Protocol client for communication between the IDE and the core.
 * This class acts as a bridge between IntelliJ and the core functionality.
 */
class IdeProtocolClient(private val ide: IntelliJIDE) {
    private val logger = Logger.getInstance(IdeProtocolClient::class.java)
    
    // Core service instance
    private var coreService: Any? = null
    
    /**
     * Initialize the protocol client.
     */
    fun initialize() {
        try {
            // Load the Core class using reflection
            val coreClass = Class.forName("core.Core")
            
            // Create a messenger instance
            val messengerClass = Class.forName("core.protocol.messenger.InProcessMessenger")
            val messenger = messengerClass.getDeclaredConstructor().newInstance()
            
            // Create the Core instance
            coreService = coreClass.getDeclaredConstructor(
                Class.forName("core.protocol.messenger.IMessenger"),
                Class.forName("core.ide.IDE")
            ).newInstance(messenger, createIdeAdapter())
            
            logger.info("Core service initialized")
        } catch (e: Exception) {
            logger.error("Failed to initialize core service", e)
            coreService = null
        }
    }
    
    /**
     * Create an adapter that implements the IDE interface from the core.
     */
    private fun createIdeAdapter(): Any {
        // This is a simplified implementation
        // In a real plugin, you would create a proper adapter that implements the IDE interface
        
        // For now, we'll create a simple proxy object
        return object : Any() {
            fun getIdeInfo(): Map<String, String> {
                return ide.getIdeInfo()
            }
            
            fun getIdeSettings(): Map<String, Any?> {
                return ide.getIdeSettings()
            }
            
            fun readFile(filepath: String): String {
                return ide.readFile(filepath)
            }
            
            fun writeFile(path: String, contents: String) {
                ide.writeFile(path, contents)
            }
            
            fun showToast(type: String, message: String) {
                ide.showToast(type, message)
            }
            
            fun getOpenFiles(): List<String> {
                return ide.getOpenFiles()
            }
            
            fun getCurrentFile(): Map<String, String>? {
                return ide.getCurrentFile()
            }
            
            fun runCommand(command: String) {
                ide.runCommand(command)
            }
        }
    }
    
    /**
     * Ping the core service.
     */
    fun pingCore(message: String): String {
        if (coreService == null) {
            return "Core service not initialized"
        }
        
        try {
            // Invoke the ping method on the core service
            val invokeMethod = coreService!!.javaClass.getMethod("invoke", String::class.java, Any::class.java)
            return invokeMethod.invoke(coreService, "ping", message) as String
        } catch (e: Exception) {
            logger.error("Failed to ping core service", e)
            return "Error: ${e.message}"
        }
    }
    
    /**
     * Process a message through the core service.
     */
    fun processMessage(message: String): String {
        if (coreService == null) {
            return "Core service not initialized"
        }
        
        try {
            // Invoke the processMessage method on the core service
            val invokeMethod = coreService!!.javaClass.getMethod("invoke", String::class.java, Any::class.java)
            val response = invokeMethod.invoke(coreService, "processMessage", mapOf("message" to message))
            
            // Extract the response from the result
            @Suppress("UNCHECKED_CAST")
            val responseMap = response as Map<String, String>
            return responseMap["response"] ?: "No response"
        } catch (e: Exception) {
            logger.error("Failed to process message", e)
            return "Error: ${e.message}"
        }
    }
    
    /**
     * Get information about the core service.
     */
    fun getCoreInfo(): Map<String, String> {
        if (coreService == null) {
            return mapOf(
                "version" to "unknown",
                "status" to "not initialized"
            )
        }
        
        try {
            // Invoke the getCoreInfo method on the core service
            val invokeMethod = coreService!!.javaClass.getMethod("invoke", String::class.java, Any::class.java)
            val response = invokeMethod.invoke(coreService, "getCoreInfo", null)
            
            // Extract the response from the result
            @Suppress("UNCHECKED_CAST")
            return response as Map<String, String>
        } catch (e: Exception) {
            logger.error("Failed to get core info", e)
            return mapOf(
                "version" to "unknown",
                "status" to "error: ${e.message}"
            )
        }
    }
}
