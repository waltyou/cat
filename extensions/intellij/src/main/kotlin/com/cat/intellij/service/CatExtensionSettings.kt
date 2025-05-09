package com.cat.intellij.service

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

/**
 * Settings for the Cat plugin.
 */
@Service
@State(
    name = "CatExtensionSettings",
    storages = [Storage("cat-extension.xml")]
)
class CatExtensionSettings : PersistentStateComponent<CatExtensionSettings.State> {
    /**
     * State class for the Cat plugin settings.
     */
    class State {
        /**
         * Whether to enable off-screen rendering.
         */
        var enableOSR: Boolean = false

        /**
         * The host for the core service.
         */
        var coreHost: String = "localhost"

        /**
         * The port for the core service.
         */
        var corePort: Int = 9876

        /**
         * The user token for authentication.
         */
        var userToken: String? = null
    }

    /**
     * The current state of the Cat plugin settings.
     */
    var catState = State()

    override fun getState(): State {
        return catState
    }

    override fun loadState(state: State) {
        catState = state
    }
}
