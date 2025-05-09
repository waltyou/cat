package com.cat.intellij.service

import com.cat.intellij.ide.IntelliJIDE
import com.cat.intellij.protocol.CoreMessenger
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer

/**
 * Main service for the Cat plugin.
 * This service manages the plugin's state and communication with the core.
 */
@Service(Service.Level.PROJECT)
class CatPluginService : Disposable {
    private val logger = Logger.getInstance(CatPluginService::class.java)

    // The current project
    private var currentProject: Project? = null

    // The IDE implementation
    private var intelliJIDE: IntelliJIDE? = null

    // The messenger for communication with the core
    var coreMessenger: CoreMessenger? = null
        private set

    // Callbacks to be executed when the core messenger is initialized
    private val onInitializedCallbacks = mutableListOf<() -> Unit>()

    /**
     * Initialize the plugin with a project.
     */
    fun initialize(project: Project) {
        currentProject = project
        intelliJIDE = IntelliJIDE(project)
        coreMessenger = CoreMessenger(intelliJIDE)

        // Initialize the core messenger
        coreMessenger?.initialize()

        // Register for disposal when the project is closed
        Disposer.register(project, this)

        // Execute any callbacks that were registered before initialization
        onInitializedCallbacks.forEach { it() }
        onInitializedCallbacks.clear()

        logger.info("Cat plugin service initialized for project: ${project.name}")
    }

    /**
     * Register a callback to be executed when the core messenger is initialized.
     */
    fun onProtocolClientInitialized(callback: () -> Unit) {
        if (coreMessenger != null) {
            // If the core messenger is already initialized, execute the callback immediately
            callback()
        } else {
            // Otherwise, add it to the list of callbacks to be executed when the core messenger is initialized
            onInitializedCallbacks.add(callback)
        }
    }

    /**
     * Get the IDE implementation.
     */
    fun getIde(): IntelliJIDE? {
        return intelliJIDE
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
        return coreMessenger?.pingCore(message) ?: "Core service not initialized"
    }

    /**
     * Process a message through the core service.
     */
    fun processMessage(message: String): String {
        return coreMessenger?.processMessage(message) ?: "Core service not initialized"
    }

    /**
     * Get information about the core service.
     */
    fun getCoreInfo(): Map<String, String> {
        return coreMessenger?.getCoreInfo() ?: mapOf(
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
            coreMessenger?.close()

            // Clear references
            coreMessenger = null
            intelliJIDE = null
            currentProject = null

            logger.info("Cat plugin service disposed")
        } catch (e: Exception) {
            logger.error("Error disposing Cat plugin service", e)
        }
    }
}
