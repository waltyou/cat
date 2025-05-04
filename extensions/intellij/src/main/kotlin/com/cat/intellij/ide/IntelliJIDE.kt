package com.cat.intellij.ide

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.ApplicationInfo
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Document
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile
import com.intellij.psi.PsiManager
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths

/**
 * IntelliJ implementation of the IDE interface.
 * This class provides methods to interact with IntelliJ's APIs.
 */
class IntelliJIDE(private val project: Project) {
    
    /**
     * Get information about the IDE.
     */
    fun getIdeInfo(): Map<String, String> {
        val appInfo = ApplicationInfo.getInstance()
        return mapOf(
            "name" to "JetBrains",
            "version" to appInfo.fullVersion
        )
    }
    
    /**
     * Get IDE settings.
     */
    fun getIdeSettings(): Map<String, Any?> {
        // Get plugin version
        val pluginId = PluginId.getId("com.cat.intellij")
        val plugin = PluginManagerCore.getPlugin(pluginId)
        val pluginVersion = plugin?.version ?: "unknown"
        
        return mapOf(
            "userToken" to null, // TODO: Implement user token storage
            "pauseIndexOnStart" to false,
            "pluginVersion" to pluginVersion
        )
    }
    
    /**
     * Read a file from the filesystem.
     */
    fun readFile(filepath: String): String {
        val file = File(filepath)
        if (!file.exists()) {
            throw IllegalArgumentException("File does not exist: $filepath")
        }
        
        return Files.readString(Paths.get(filepath))
    }
    
    /**
     * Write content to a file.
     */
    fun writeFile(filepath: String, contents: String) {
        val file = File(filepath)
        
        // Create parent directories if they don't exist
        file.parentFile?.mkdirs()
        
        // Write the file
        Files.writeString(Paths.get(filepath), contents)
        
        // Refresh the VFS to make IntelliJ aware of the changes
        val virtualFile = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(file)
        virtualFile?.refresh(false, false)
    }
    
    /**
     * Show a toast notification in the IDE.
     */
    fun showToast(type: String, message: String) {
        val notification = when (type) {
            "info" -> com.intellij.notification.NotificationType.INFORMATION
            "warning" -> com.intellij.notification.NotificationType.WARNING
            "error" -> com.intellij.notification.NotificationType.ERROR
            else -> com.intellij.notification.NotificationType.INFORMATION
        }
        
        com.intellij.notification.Notifications.Bus.notify(
            com.intellij.notification.Notification(
                "Cat",
                "Cat",
                message,
                notification
            ),
            project
        )
    }
    
    /**
     * Get the list of open files in the IDE.
     */
    fun getOpenFiles(): List<String> {
        val openFiles = FileEditorManager.getInstance(project).openFiles
        return openFiles.mapNotNull { it.path }
    }
    
    /**
     * Get the currently active file in the IDE.
     */
    fun getCurrentFile(): Map<String, String>? {
        val currentFile = FileEditorManager.getInstance(project).selectedEditor?.file ?: return null
        val document = FileDocumentManager.getInstance().getDocument(currentFile) ?: return null
        
        return mapOf(
            "path" to currentFile.path,
            "contents" to document.text
        )
    }
    
    /**
     * Run a command in the IDE.
     */
    fun runCommand(command: String) {
        // This is a simplified implementation
        // In a real plugin, you would map commands to specific actions
        ApplicationManager.getApplication().invokeLater {
            com.intellij.ide.actions.ActionsCollector.getInstance().record(command, "Cat")
        }
    }
}
