package com.cat.intellij.actions

import com.cat.intellij.service.CatPluginService
import com.intellij.notification.NotificationType
import com.intellij.notification.Notifications
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.components.service

/**
 * Action to ping the core service.
 */
class PingCoreAction : AnAction() {
    
    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val pluginService = service<CatPluginService>()
        
        try {
            // Ping the core service
            val response = pluginService.pingCore("Hello from IntelliJ!")
            
            // Show a notification with the response
            Notifications.Bus.notify(
                com.intellij.notification.Notification(
                    "Cat",
                    "Cat Core Response",
                    "Response: $response",
                    NotificationType.INFORMATION
                ),
                project
            )
            
            // Log the action
            pluginService.logInfo("Pinged core service, response: $response")
        } catch (ex: Exception) {
            // Show an error notification
            Notifications.Bus.notify(
                com.intellij.notification.Notification(
                    "Cat",
                    "Cat Core Error",
                    "Error pinging core: ${ex.message}",
                    NotificationType.ERROR
                ),
                project
            )
            
            // Log the error
            pluginService.logError("Error pinging core service", ex)
        }
    }
    
    override fun update(e: AnActionEvent) {
        // Enable the action only if a project is open
        e.presentation.isEnabled = e.project != null
    }
}
