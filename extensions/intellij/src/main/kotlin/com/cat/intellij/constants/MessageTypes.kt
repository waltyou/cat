package com.cat.intellij.constants

/**
 * Constants for message types used in the Cat plugin.
 */
class MessageTypes {
    companion object {
        /**
         * Message types that should be passed through to the core service.
         */
        val PASS_THROUGH_TO_CORE = setOf(
            "ping",
            "processMessage",
            "getCoreInfo"
        )
    }
}
