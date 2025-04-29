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

```

```