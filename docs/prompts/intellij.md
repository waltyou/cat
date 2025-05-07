init IntelliJ Extension at `extension/intellij` directory. Use Kotlin.

The extension initializes when a project is opened through the CatPluginStartupActivity class. It creates a tool window in the IDE's right panel with the GUI app. 

Key components:

IntelliJIDE: Implements the IDE interface to interact with IntelliJ's APIs
CatPluginService: Manages the plugin's state and communication 

The extension communicates with the `core` through the IdeProtocolClient class, which acts as a bridge between the IDE and the `core` functionality: 

The extension hosts the React-based GUI using JCEF (Java Chromium Embedded Framework). The React app is loaded from either a custom URL (via environment variable) or the default bundled URL. The HTML file sets the IDE type to "jetbrains" in localStorage. 

The extension also handles theme changes to ensure the UI matches the IDE's appearance, and provides JavaScript interfaces for bidirectional communication between the React app and the IDE.

