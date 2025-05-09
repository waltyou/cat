package com.cat.intellij.toolwindow

import com.cat.intellij.activities.CatPluginDisposable
import com.cat.intellij.service.CatPluginService
import com.cat.intellij.constants.MessageTypes.Companion.PASS_THROUGH_TO_CORE
import com.cat.intellij.factories.CustomSchemeHandlerFactory
import com.cat.intellij.service.CatExtensionSettings
import com.cat.intellij.utils.uuid
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.*
import com.intellij.ui.jcef.JBCefClient.Properties
import com.intellij.util.application
import org.cef.CefApp
import org.cef.browser.CefBrowser
import org.cef.handler.CefLoadHandlerAdapter

class CatBrowser(val project: Project, url: String) {
    private fun registerAppSchemeHandler() {
        CefApp.getInstance().registerSchemeHandlerFactory(
            "http",
            "cat",
            CustomSchemeHandlerFactory()
        )
    }

    val browser: JBCefBrowser

    val catPluginService: CatPluginService = project.getService(CatPluginService::class.java)

    companion object {
        private const val JS_QUERY_POOL_SIZE = 100
    }

    init {
        val isOSREnabled = application.getService(CatExtensionSettings::class.java)?.catState?.enableOSR ?: false

        this.browser = JBCefBrowser.createBuilder().setOffScreenRendering(isOSREnabled).build().apply {
            // Configure JS_QUERY_POOL_SIZE after JBCefClient is instantiated
            jbCefClient.setProperty(Properties.JS_QUERY_POOL_SIZE, JS_QUERY_POOL_SIZE)
        }

        registerAppSchemeHandler()
        Disposer.register(CatPluginDisposable.getInstance(project), browser)

        // Listen for events sent from browser
        val myJSQueryOpenInBrowser = JBCefJSQuery.create((browser as JBCefBrowserBase?)!!)

        myJSQueryOpenInBrowser.addHandler { msg: String? ->
            val parser = JsonParser()
            val json: JsonObject = parser.parse(msg).asJsonObject
            val messageType = json.get("messageType").asString
            val data = json.get("data")
            val messageId = json.get("messageId")?.asString

            val respond = fun(data: Any?) {
                sendToWebview(messageType, data, messageId ?: uuid())
            }

            if (PASS_THROUGH_TO_CORE.contains(messageType)) {
                catPluginService.coreMessenger?.request(messageType, data, messageId, respond)
                return@addHandler null
            }

            null
        }

        // Listen for the page load event
        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadingStateChange(
                browser: CefBrowser?,
                isLoading: Boolean,
                canGoBack: Boolean,
                canGoForward: Boolean
            ) {
                if (!isLoading) {
                    // The page has finished loading
                    executeJavaScript(browser, myJSQueryOpenInBrowser)
                }
            }
        }, browser.cefBrowser)

        // Load the url only after the protocolClient is initialized
        catPluginService.onProtocolClientInitialized {
            browser.loadURL(url)
        }
    }

    fun executeJavaScript(browser: CefBrowser?, myJSQueryOpenInBrowser: JBCefJSQuery) {
        // Execute JavaScript - you might want to handle potential exceptions here
        val script = """window.postIntellijMessage = function(messageType, data, messageId) {
                const msg = JSON.stringify({messageType, data, messageId});
                ${myJSQueryOpenInBrowser.inject("msg")}
            }""".trimIndent()

        browser?.executeJavaScript(script, browser.url, 0)
    }

    fun sendToWebview(
        messageType: String,
        data: Any?,
        messageId: String = uuid()
    ) {
        val jsonData = Gson().toJson(
            mapOf(
                "messageId" to messageId,
                "messageType" to messageType,
                "data" to data
            )
        )
        val jsCode = buildJavaScript(jsonData)

        try {
            this.browser.executeJavaScriptAsync(jsCode).onError {
                println("Failed to execute jsCode error: ${it.message}")
            }
        } catch (error: IllegalStateException) {
            println("Webview not initialized yet $error")
        }
    }

    private fun buildJavaScript(jsonData: String): String {
        return """window.postMessage($jsonData, "*");"""
    }
}
