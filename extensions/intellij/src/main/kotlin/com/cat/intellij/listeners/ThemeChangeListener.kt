package com.cat.intellij.listeners

import com.cat.intellij.service.CatPluginService
import com.intellij.ide.ui.LafManager
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.components.service
import javax.swing.UIManager

/**
 * Listener for theme changes in the IDE.
 * This ensures the UI matches the IDE's appearance.
 */
class ThemeChangeListener : LafManagerListener {
    
    override fun lookAndFeelChanged(source: LafManager) {
        // Log the theme change
        service<CatPluginService>().logInfo("Theme changed to: ${UIManager.getLookAndFeel().name}")
        
        // Update the theme in the browser
        updateBrowserTheme()
    }
    
    /**
     * Update the theme in the browser.
     */
    private fun updateBrowserTheme() {
        // Determine if the current theme is dark
        val isDarkTheme = isDarkTheme()
        
        // TODO: Send theme change to the browser
        // This would typically involve finding all browser instances and executing JavaScript
        // to update the theme
        
        service<CatPluginService>().logInfo("Browser theme updated: ${if (isDarkTheme) "dark" else "light"}")
    }
    
    /**
     * Check if the current theme is dark.
     */
    private fun isDarkTheme(): Boolean {
        val lookAndFeel = UIManager.getLookAndFeel()
        val className = lookAndFeel.javaClass.name
        
        // Check if the look and feel class name contains "dark"
        return className.contains("dark", ignoreCase = true) ||
                className.contains("darcula", ignoreCase = true)
    }
}
