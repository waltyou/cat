package com.cat.intellij.toolwindow

import com.cat.intellij.service.CatPluginService
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import org.cef.CefApp
import org.cef.CefClient
import org.cef.CefSettings
import org.cef.browser.CefBrowser
import org.cef.handler.CefLifeSpanHandlerAdapter
import java.awt.BorderLayout
import javax.swing.JPanel

/**
 * Factory for creating the Cat tool window.
 */
class CatToolWindowFactory : ToolWindowFactory {
    
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val catToolWindowContent = CatToolWindowContent(project)
        val content = ContentFactory.getInstance().createContent(
            catToolWindowContent.getContent(),
            "Cat",
            false
        )
        toolWindow.contentManager.addContent(content)
    }
    
    /**
     * Content for the Cat tool window.
     */
    private class CatToolWindowContent(private val project: Project) {
        private val panel = JPanel(BorderLayout())
        private var browser: CefBrowser? = null
        private var client: CefClient? = null
        
        init {
            initializeBrowser()
        }
        
        /**
         * Get the content panel.
         */
        fun getContent(): JPanel {
            return panel
        }
        
        /**
         * Initialize the browser.
         */
        private fun initializeBrowser() {
            try {
                // Initialize CEF with a simple settings object
                val settings = CefSettings()
                settings.windowlessRenderingEnabled = false
                
                val cefApp = CefApp.getInstance(settings)
                client = cefApp.createClient()
                
                // Add a life span handler to handle browser events
                client?.addLifeSpanHandler(object : CefLifeSpanHandlerAdapter() {
                    override fun onAfterCreated(browser: CefBrowser?) {
                        super.onAfterCreated(browser)
                        // Initialize JavaScript bindings after the browser is created
                        initializeJavaScriptBindings(browser)
                    }
                })
                
                // Create the browser
                browser = client?.createBrowser(getGuiUrl(), false, false)
                
                // Add the browser to the panel
                browser?.uiComponent?.let { panel.add(it, BorderLayout.CENTER) }
                
                // Set the IDE type in localStorage
                browser?.executeJavaScript(
                    "localStorage.setItem('ideType', 'jetbrains');",
                    browser?.url ?: "",
                    0
                )
                
                // Log initialization
                service<CatPluginService>().logInfo("Browser initialized for Cat tool window")
            } catch (e: Exception) {
                service<CatPluginService>().logError("Failed to initialize browser", e)
                
                // Show an error message in the panel
                val errorPanel = JPanel(BorderLayout())
                val errorLabel = javax.swing.JLabel("Failed to initialize browser: ${e.message}")
                errorPanel.add(errorLabel, BorderLayout.CENTER)
                panel.add(errorPanel, BorderLayout.CENTER)
            }
        }
        
        /**
         * Initialize JavaScript bindings.
         */
        private fun initializeJavaScriptBindings(browser: CefBrowser?) {
            if (browser == null) return
            
            // Create a JavaScript handler
            val handler = CatJavaScriptHandler(project)
            
            // Register the handler with the browser
            browser.executeJavaScript(
                """
                window.catIde = {
                    pingCore: function(message) {
                        return ${handler.javaClass.name}.pingCore(message);
                    },
                    processMessage: function(message) {
                        return ${handler.javaClass.name}.processMessage(message);
                    },
                    getCoreInfo: function() {
                        return ${handler.javaClass.name}.getCoreInfo();
                    }
                };
                """.trimIndent(),
                browser.url,
                0
            )
        }
        
        /**
         * Get the URL for the GUI.
         */
        private fun getGuiUrl(): String {
            // Check if a custom URL is provided via environment variable
            val customUrl = System.getenv("CAT_GUI_URL")
            if (!customUrl.isNullOrBlank()) {
                return customUrl
            }
            
            // Otherwise, use the bundled GUI
            return "file:///gui/dist/index.html"
        }
    }
}
