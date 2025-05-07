package com.cat.intellij.toolwindow

import com.cat.intellij.service.CatPluginService
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefClient
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.handler.CefLifeSpanHandlerAdapter
import java.awt.BorderLayout
import javax.swing.JPanel

/**
 * Browser component for the Cat tool window.
 * Uses JBCefBrowser to display web content.
 */
class CatBrowser(private val project: Project) {
    private val panel = JPanel(BorderLayout())
    private var browser: JBCefBrowser? = null
    private var client: JBCefClient? = null

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
            service<CatPluginService>().logInfo("Initializing browser for Cat tool window")

            // Create the JBCefBrowser
            browser = JBCefBrowser()
            client = browser?.jbCefClient

            // Add a life span handler to handle browser events
            service<CatPluginService>().logInfo("Adding life span handler")
            client?.cefClient?.addLifeSpanHandler(object : CefLifeSpanHandlerAdapter() {
                override fun onAfterCreated(browser: org.cef.browser.CefBrowser?) {
                    super.onAfterCreated(browser)
                    service<CatPluginService>().logInfo("Browser created, initializing JavaScript bindings")
                    // Initialize JavaScript bindings after the browser is created
                    initializeJavaScriptBindings(browser)
                }
            })

            // Get the GUI URL
            val guiUrl = getGuiUrl()
            service<CatPluginService>().logInfo("Using GUI URL: $guiUrl")

            // Load the URL
            browser?.loadURL(guiUrl)

            // Add the browser to the panel
            service<CatPluginService>().logInfo("Adding browser to panel")
            browser?.component?.let {
                panel.add(it, BorderLayout.CENTER)
                service<CatPluginService>().logInfo("Browser UI component added to panel")
            } ?: run {
                service<CatPluginService>().logError("Browser UI component is null")
                showErrorPanel("Failed to get browser UI component")
                return
            }

            // Set the IDE type in localStorage
            service<CatPluginService>().logInfo("Setting IDE type in localStorage")
            try {
                browser?.cefBrowser?.executeJavaScript(
                    "localStorage.setItem('ideType', 'jetbrains');",
                    browser?.cefBrowser?.url ?: "",
                    0
                )
                service<CatPluginService>().logInfo("IDE type set in localStorage")
            } catch (e: Exception) {
                service<CatPluginService>().logError("Failed to set IDE type in localStorage", e)
                // Continue anyway, this is not critical
            }

            // Log initialization
            service<CatPluginService>().logInfo("Browser successfully initialized for Cat tool window")
        } catch (e: Exception) {
            service<CatPluginService>().logError("Failed to initialize browser", e)
            showErrorPanel("Failed to initialize browser: ${e.message}")
        }
    }

    /**
     * Show an error panel with the given message.
     */
    private fun showErrorPanel(message: String) {
        val errorPanel = JPanel(BorderLayout())
        val errorLabel = javax.swing.JLabel("<html><body style='width: 300px'><h3>Error</h3><p>$message</p></body></html>")
        errorPanel.add(errorLabel, BorderLayout.CENTER)
        panel.add(errorPanel, BorderLayout.CENTER)
    }

    /**
     * Initialize JavaScript bindings.
     */
    private fun initializeJavaScriptBindings(browser: org.cef.browser.CefBrowser?) {
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

        try {
            // Get the plugin's class loader
            val classLoader = javaClass.classLoader

            // Try to find the GUI resources in the plugin's resources
            val guiResource = classLoader.getResource("gui/dist/index.html")
            if (guiResource != null) {
                service<CatPluginService>().logInfo("Found GUI at: ${guiResource.toExternalForm()}")
                return guiResource.toExternalForm()
            }

            // Try to find the GUI in the project directory
            val projectDir = project.basePath
            if (projectDir != null) {
                val guiPath = java.io.File(projectDir, "gui/dist/index.html")
                if (guiPath.exists()) {
                    service<CatPluginService>().logInfo("Found GUI at: ${guiPath.toURI().toURL()}")
                    return guiPath.toURI().toURL().toString()
                }
            }

            // Fallback to a simple HTML page
            service<CatPluginService>().logWarning("GUI not found, using fallback HTML")
            return "data:text/html," + java.net.URLEncoder.encode("""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Cat GUI</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .error { color: red; margin: 10px 0; padding: 10px; border: 1px solid red; }
                    </style>
                </head>
                <body>
                    <h1>Cat GUI</h1>
                    <div class="error">
                        <p>The GUI bundle was not found.</p>
                        <p>Please build the GUI by running:</p>
                        <code>cd gui && npm install && npm run build</code>
                    </div>
                </body>
                </html>
            """.trimIndent(), "UTF-8")
        } catch (e: Exception) {
            service<CatPluginService>().logError("Error determining GUI URL", e)

            // Return a simple data URL as a fallback
            return "data:text/html," + java.net.URLEncoder.encode("""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Cat GUI Error</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .error { color: red; margin: 10px 0; padding: 10px; border: 1px solid red; }
                    </style>
                </head>
                <body>
                    <h1>Cat GUI Error</h1>
                    <div class="error">
                        <p>Error loading GUI: ${e.message}</p>
                    </div>
                </body>
                </html>
            """.trimIndent(), "UTF-8")
        }
    }
}
