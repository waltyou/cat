# CAT (Code Assistant Tool)

A lightweight code assistant with a message-passing architecture between a core service, UI, and IDE integration. Inspired by the [Continue.dev](https://github.com/continuedev/continue) project.

> **Note:** This project currently only implements the foundational message-passing architecture and infrastructure. No actual code assistant features have been implemented yet. The focus is on establishing the communication framework between components.

## Overview

CAT is a code assistant tool designed to help developers with coding tasks. It features a modular architecture with three main components:

1. **Core Service**: A TypeScript Node.js application that processes messages from the IDE and returns responses
2. **GUI**: A React application that provides a user interface for interacting with the core service
3. **IDE Integration**: Extensions for VS Code and JetBrains IDEs that integrate the GUI and core service

## Architecture

The project uses a message-passing architecture to enable communication between components:

```text
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
- Runs as a TCP server in development mode
- Can be built as a binary executable file using IPC in production
- Protocol definitions are located in core/src/protocol/

### GUI

The GUI is a React application with Redux for state management that:

- Provides a user interface for interacting with the core service
- Sends requests to the core service through the IDE extension
- Displays responses from the core service
- Designed to work with both VS Code and IntelliJ plugins
- Uses Vite 6.3.4 for development and Vitest for testing

### IDE Integration

#### VS Code Extension

A VS Code extension that:

- Hosts the GUI in a webview
- Provides commands for interacting with the core service
- Passes messages between the GUI and core service
- Uses esbuild for bundling TypeScript code

#### JetBrains Plugin

A JetBrains plugin written in Kotlin that:

- Hosts the GUI using JCEF
- Provides actions for interacting with the core service
- Passes messages between the GUI and core service
- Uses port 9876 for core service communication

### Binary Directory

The `binary` directory is a crucial component of the project that:

- Contains the core service executable builds
- Supports both VS Code and IntelliJ plugins
- Runs as a TCP server in development mode
- Provides a Node.js-based implementation (not a JAR)
- Has a VS Code run configuration called 'Core binary' for development
- Requires the esbuild module for building
- Can be built as a standalone executable for production use

### Configuration Files

#### VS Code Configuration (.vscode)

The `.vscode` directory at the project root contains important configuration files:

- **launch.json**: Defines VS Code launch configurations
  - Contains 'Run Extension' configuration for debugging the VS Code extension
  - Includes 'Core binary' configuration for running the TCP process in the binary directory
  - Uses esbuild task as preLaunchTask for the 'Run Extension' configuration

- **tasks.json**: Defines VS Code tasks
  - Contains the esbuild task that runs `extensions\vscode\scripts\esbuild.js`
  - Bundles TypeScript source code into a single JavaScript file
  - Used as a prerequisite for launching the extension

#### IntelliJ Configuration

- **Run Extension.run.xml**: Located in `extensions\intellij\.run\`
  - Defines the run configuration for the IntelliJ plugin
  - Configures how the IntelliJ plugin is launched and debugged
  - Integrates with the core service running on port 9876

## Installation

### Prerequisites

- Node.js 14 or higher
- npm 6 or higher
- VS Code 1.70.0 or higher (for VS Code extension)
- JetBrains IDE (for JetBrains plugin)
- Windows environment (primary development platform)

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

### VS Code Extension Commands

The VS Code extension provides the following commands:

- **Cat: Hello World** - Displays a simple hello world message
- **Cat: Count Files in Workspace** - Counts all files in your workspace
- **Cat: Ping Core Service** - Pings the core service (valid part of the messaging protocol)
- **Cat: Open GUI** - Opens the GUI in a webview

To use the extension:

1. Open the command palette (Ctrl+Shift+P)
2. Type "Cat:" to see available commands
3. Select a command to execute it

## Development

### Project Structure

```text
cat/
├── core/                  # Core service
│   ├── src/               # Source code
│   │   └── protocol/      # Protocol definitions
│   └── README.md          # Core service documentation
├── extensions/            # IDE integrations
│   ├── vscode/            # VS Code extension
│   │   └── scripts/       # Build scripts including esbuild.js
│   └── jetbrains/         # JetBrains plugin
├── gui/                   # React user interface
│   ├── src/               # Source code
│   │   ├── redux/         # Redux state management (renamed from store)
│   │   ├── hooks/         # React hooks
│   │   └── context/       # Context providers (renamed from messaging)
│   └── public/            # Static assets
├── binary/                # Binary executable builds
├── .vscode/               # VS Code configuration (at project root)
├── docs/                  # Documentation
└── README.md              # Project documentation
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
npm run build  # Runs TypeScript compilation before Vite build
```

The build script in package.json runs TypeScript compilation before Vite build with `tsc && vite build`.

### Building the VS Code Extension

```bash
cd extensions/vscode
npm install
npm run esbuild  # Uses esbuild.js script to bundle TypeScript code
```

### Running the VS Code Extension

1. Open the project in VS Code
2. Press F5 to start debugging (uses esbuild task as preLaunchTask)
3. A new VS Code window will open with the extension loaded

### Running the Core Service

The core service can be run in two modes:

1. **Development Mode (TCP)**:
   - Use the VS Code run configuration 'Core binary'
   - Runs the TCP server from the binary directory

2. **Production Mode (IPC)**:
   - Built as a binary executable file
   - Uses IPC for communication

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.
