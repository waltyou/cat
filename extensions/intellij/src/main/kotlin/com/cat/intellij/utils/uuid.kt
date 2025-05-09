package com.cat.intellij.utils

import java.util.UUID

/**
 * Generate a random UUID.
 */
fun uuid(): String {
    return UUID.randomUUID().toString()
}
