# CAT(Code Assistant Tool) MVP Development Blueprint

## Overview
This blueprint provides detailed implementation guidance for creating a lightweight code assistant MVP with a message-passing architecture between a core service, UI, and IDE integration. The solution prioritizes simplicity while maintaining good coding practices.


## Architecture

### 1. Core Service

- a TypeScript Node.js application
- Process the messages pass from IDE
- pass the answer back to IDE

### 2. GUI

- a React App
- A simple button which user can click

### 3. IDE Integration (VS Code Extension & JetBrains Plugin)

#### vscode extension

- A vscode extension 
- use Webview to host GUI app

#### JetBrains Plugin

- A JetBrains plugin which is written in Kotlin.
- use JCEF to host GUI app


## Code structure

### Main Directories

1. **core/**: Core functionality library
   - Contains LLM integrations, context retrieval, configuration management
   - Implements codebase indexing and analysis features

2. **extensions/**: IDE integrations
   - **vscode/**: VS Code extension
   - **jetbrains/**: JetBrains plugin

3. **gui/**: React user interface
   - Implements chat interface and code interaction features

4. **binary/**: Executable-related code

5. **docs/**: Documentation
   - Documentation written in MDX format
   - Includes internationalization support (i18n)

