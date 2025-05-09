package com.cat.intellij.activities

import com.intellij.openapi.Disposable
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import java.util.concurrent.ConcurrentHashMap

/**
 * Disposable for the Cat plugin.
 * This class is used to register disposable resources that should be cleaned up when the plugin is unloaded.
 */
class CatPluginDisposable private constructor(private val project: Project) : Disposable {
    companion object {
        private val instances = ConcurrentHashMap<Project, CatPluginDisposable>()

        /**
         * Get the instance for the given project.
         */
        @JvmStatic
        fun getInstance(project: Project): CatPluginDisposable {
            return instances.computeIfAbsent(project) { p ->
                val disposable = CatPluginDisposable(p)
                Disposer.register(p, disposable)
                disposable
            }
        }
    }

    override fun dispose() {
        instances.remove(project)
    }
}
