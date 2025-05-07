package com.cat.intellij.toolwindow

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

/**
 * Factory for creating the Cat tool window.
 */
class CatToolWindowFactory : ToolWindowFactory {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val catBrowser = CatBrowser(project)
        val content = ContentFactory.getInstance().createContent(
            catBrowser.getContent(),
            "Cat",
            false
        )
        toolWindow.contentManager.addContent(content)
    }
}
