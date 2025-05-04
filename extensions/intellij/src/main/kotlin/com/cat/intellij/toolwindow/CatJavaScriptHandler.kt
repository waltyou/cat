package com.cat.intellij.toolwindow

import com.cat.intellij.service.CatPluginService
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project

/**
 * Handler for JavaScript calls from the browser.
 */
class CatJavaScriptHandler(private val project: Project) {
    
    /**
     * Ping the core service.
     */
    @Suppress("unused") // Used from JavaScript
    fun pingCore(message: String): String {
        val pluginService = service<CatPluginService>()
        return pluginService.pingCore(message)
    }
    
    /**
     * Process a message through the core service.
     */
    @Suppress("unused") // Used from JavaScript
    fun processMessage(message: String): String {
        val pluginService = service<CatPluginService>()
        return pluginService.processMessage(message)
    }
    
    /**
     * Get information about the core service.
     */
    @Suppress("unused") // Used from JavaScript
    fun getCoreInfo(): String {
        val pluginService = service<CatPluginService>()
        val coreInfo = pluginService.getCoreInfo()
        
        // Convert the map to a JSON string
        return """
            {
                "version": "${coreInfo["version"] ?: "unknown"}",
                "status": "${coreInfo["status"] ?: "unknown"}"
            }
        """.trimIndent()
    }
}
