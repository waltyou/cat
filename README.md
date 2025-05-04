# CAT (Code Assistant Tool)

A lightweight code assistant with a message-passing architecture between a core service, UI, and IDE integration. Inspired by the [Continue.dev](https://github.com/continuedev/continue) project.

## Overview

CAT is a code assistant tool designed to help developers with coding tasks. It features a modular architecture with three main components:

1. **Core Service**: A TypeScript Node.js application that processes messages from the IDE and returns responses
2. **GUI**: A React application that provides a user interface for interacting with the core service
3. **IDE Integration**: Extensions for VS Code and JetBrains IDEs that integrate the GUI and core service

## Architecture

The project uses a message-passing architecture to enable communication between components:

```
IDE Extension <---> Core Service <---> GUI
```

- The IDE extension hosts the GUI in a webview
- The GUI communicates with the core service through the IDE extension
- The core service processes requests and returns responses

## Main Components

### Core Service

The core service is a TypeScript Node.js application that:
- Processes messages from the IDE
- Sends responses back to the IDE
- Handles basic commands like ping/pong

### GUI

The GUI is a React application with Redux for state management that:
- Provides a user interface for interacting with the core service
- Sends requests to the core service through the IDE extension
- Displays responses from the core service

### IDE Integration

#### VS Code Extension

A VS Code extension that:
- Hosts the GUI in a webview
- Provides commands for interacting with the core service
- Passes messages between the GUI and core service

#### JetBrains Plugin

A JetBrains plugin written in Kotlin that:
- Hosts the GUI using JCEF
- Provides actions for interacting with the core service
- Passes messages between the GUI and core service

## Installation

### Prerequisites

- Node.js 14 or higher
- npm 6 or higher
- VS Code 1.70.0 or higher (for VS Code extension)
- JetBrains IDE (for JetBrains plugin)

### Installing the VS Code Extension

1. Clone the repository
2. Build the extension:
   ```bash
   cd extensions/vscode
   npm install
   npm run esbuild
   ```
3. Install the extension in VS Code:
   - Press F5 to open a new window with the extension loaded
   - Or package the extension with `vsce package` and install the .vsix file

## Usage

### VS Code Extension

The VS Code extension provides the following commands:

- **Cat: Hello World** - Displays a simple hello world message
- **Cat: Count Files in Workspace** - Counts all files in your workspace
- **Cat: Ping Core Service** - Pings the core service
- **Cat: Open GUI** - Opens the GUI in a webview

To use the extension:

1. Open the command palette (Ctrl+Shift+P)
2. Type "Cat:" to see available commands
3. Select a command to execute it

## Development

### Project Structure

```
cat/
├── core/               # Core service
│   ├── src/            # Source code
│   └── README.md       # Core service documentation
├── extensions/         # IDE integrations
│   ├── vscode/         # VS Code extension
│   └── jetbrains/      # JetBrains plugin
├── gui/                # React user interface
│   ├── src/            # Source code
│   └── public/         # Static assets
├── docs/               # Documentation
└── README.md           # Project documentation
```

### Building the Core Service

```bash
cd core
npm install
npm run build
```

### Building the GUI

```bash
cd gui
npm install
npm run build
```

### Building the VS Code Extension

```bash
cd extensions/vscode
npm install
npm run esbuild
```

### Running the VS Code Extension

1. Open the project in VS Code
2. Press F5 to start debugging
3. A new VS Code window will open with the extension loaded

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.
