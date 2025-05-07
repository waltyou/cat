package com.cat.intellij.service

import com.cat.intellij.ide.IntelliJIDE
import com.cat.intellij.protocol.IdeProtocolClient
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer

/**
 * Main service for the Cat plugin.
 * This service manages the plugin's state and communication with the core.
 */
@Service
class CatPluginService : Disposable {
    private val logger = Logger.getInstance(CatPluginService::class.java)

    // The current project
    private var currentProject: Project? = null

    // The IDE implementation
    private var intelliJIDE: IntelliJIDE? = null

    // The protocol client for communication with the core
    private var protocolClient: IdeProtocolClient? = null

    /**
     * Initialize the plugin with a project.
     */
    fun initialize(project: Project) {
        currentProject = project
        intelliJIDE = IntelliJIDE(project)
        protocolClient = IdeProtocolClient(intelliJIDE!!)

        // Initialize the protocol client
        protocolClient?.initialize()

        // Register for disposal when the project is closed
        Disposer.register(project, this)

        logger.info("Cat plugin service initialized for project: ${project.name}")
    }

    /**
     * Get the IDE implementation.
     */
    fun getIde(): IntelliJIDE? {
        return intelliJIDE
    }

    /**
     * Get the protocol client.
     */
    fun getProtocolClient(): IdeProtocolClient? {
        return protocolClient
    }

    /**
     * Log an info message.
     */
    fun logInfo(message: String) {
        logger.info(message)
    }

    /**
     * Log a warning message.
     */
    fun logWarning(message: String) {
        logger.warn(message)
    }

    /**
     * Log an error message.
     */
    fun logError(message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            logger.error(message, throwable)
        } else {
            logger.error(message)
        }
    }

    /**
     * Ping the core service.
     */
    fun pingCore(message: String): String {
        return protocolClient?.pingCore(message) ?: "Core service not initialized"
    }

    /**
     * Process a message through the core service.
     */
    fun processMessage(message: String): String {
        return protocolClient?.processMessage(message) ?: "Core service not initialized"
    }

    /**
     * Get information about the core service.
     */
    fun getCoreInfo(): Map<String, String> {
        return protocolClient?.getCoreInfo() ?: mapOf(
            "version" to "unknown",
            "status" to "not initialized"
        )
    }

    /**
     * Dispose the service when the project is closed.
     */
    override fun dispose() {
        try {
            // Close the connection to the core service
            protocolClient?.close()

            // Clear references
            protocolClient = null
            intelliJIDE = null
            currentProject = null

            logger.info("Cat plugin service disposed")
        } catch (e: Exception) {
            logger.error("Error disposing Cat plugin service", e)
        }
    }
}
