package com.cat.intellij.startup

import com.cat.intellij.service.CatPluginService
import com.intellij.openapi.components.ServiceManager
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.startup.StartupActivity

/**
 * Startup activity that initializes the Cat plugin when a project is opened.
 */
class CatPluginStartupActivity : StartupActivity {
    override fun runActivity(project: Project) {
        // Get the plugin service
        val pluginService = ServiceManager.getService(
            project,
            CatPluginService::class.java
        )
        
        // Initialize the plugin with the current project
        pluginService.initialize(project)
        
        // Log initialization
        pluginService.logInfo("Cat plugin initialized for project: ${project.name}")
    }
}
