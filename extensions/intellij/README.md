# Cat IntelliJ Plugin

A simple IntelliJ plugin for the Cat project.

## Features

- Integration with the Cat core service
- Tool window in the IDE's right panel with the GUI app
- Theme synchronization with the IDE

## Architecture

The plugin consists of the following key components:

### IntelliJIDE

Implements the IDE interface to interact with IntelliJ's APIs. This class provides methods for:
- Getting IDE information
- Reading and writing files
- Showing notifications
- Getting open files
- Running commands

### CatPluginService

Manages the plugin's state and communication. This service:
- Initializes the plugin when a project is opened
- Provides access to the IDE implementation
- Handles communication with the core service
- Provides logging functionality

### IdeProtocolClient

Acts as a bridge between the IDE and the core functionality. This class:
- Initializes the core service
- Provides methods to communicate with the core
- Handles message passing between the IDE and core

### CatToolWindowFactory

Creates the tool window in the IDE's right panel. This factory:
- Initializes the JCEF browser
- Loads the React-based GUI
- Sets up JavaScript bindings for communication

## Development

### Building the Plugin

1. Clone the repository
2. Build the core component:
   ```
   cd core
   ./gradlew build
   ```
3. Build the plugin:
   ```
   cd extensions/intellij
   ./gradlew buildPlugin
   ```

### Running the Plugin

1. Run the plugin in a development instance:
   ```
   cd extensions/intellij
   ./gradlew runIde
   ```

### Packaging the Plugin

To package the plugin for distribution:
```
cd extensions/intellij
./gradlew buildPlugin
```

This will create a `.zip` file in `build/distributions` that can be installed in IntelliJ IDEA.

## Requirements

- IntelliJ IDEA 2023.1 or later
- Java 17 or later

## Configuration

The plugin can be configured through environment variables:

- `CAT_GUI_URL`: Custom URL for the GUI app (optional)
