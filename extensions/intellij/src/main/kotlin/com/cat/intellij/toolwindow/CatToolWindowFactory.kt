package com.cat.intellij.toolwindow

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import javax.swing.JPanel
import java.awt.BorderLayout

/**
 * Factory for creating the Cat tool window.
 */
class CatToolWindowFactory : ToolWindowFactory {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        // Create a URL for the GUI
        val guiUrl = getGuiUrl(project)

        // Create the browser
        val catBrowser = CatBrowser(project, guiUrl)

        // Create a panel to hold the browser
        val panel = JPanel(BorderLayout())
        panel.add(catBrowser.browser.component, BorderLayout.CENTER)

        // Create the content
        val content = ContentFactory.getInstance().createContent(
            panel,
            "Cat",
            false
        )

        // Add the content to the tool window
        toolWindow.contentManager.addContent(content)
    }

    /**
     * Get the URL for the GUI.
     */
    private fun getGuiUrl(project: Project): String {
        println("Resolving GUI URL...")

        // Check if a custom URL is provided via environment variable
        val customUrl = System.getenv("CAT_GUI_URL")
        if (!customUrl.isNullOrBlank()) {
            println("Using custom GUI URL from environment: $customUrl")
            return customUrl
        }

        // Try to find the GUI resources in the plugin's resources
        try {
            val guiResource = javaClass.classLoader.getResource("gui/dist/index.html")
            if (guiResource != null) {
                val url = guiResource.toExternalForm()
                println("Found GUI in plugin resources: $url")
                return url
            }
        } catch (e: Exception) {
            println("Error finding GUI in plugin resources: ${e.message}")
        }

        // Fallback to a simple HTML page
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
    }
}
