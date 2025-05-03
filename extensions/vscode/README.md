# Cat VS Code Extension

A simple VS Code extension for the Cat project.

## Features

- Simple "Hello World" command
- Count Files in Workspace - Counts all files in your workspace (excluding node_modules and .git directories)
- Status Bar Clock - Displays the current time in the status bar (click to show a greeting)

## Requirements

- VS Code 1.70.0 or higher

## Extension Settings

This extension doesn't contribute any settings yet.

## Known Issues

None at the moment.

## Release Notes

### 0.1.0

Initial release with basic "Hello World" functionality.

## Development

### Building the Extension

1. Clone the repository
2. Run `npm install` in the `cat-vscode-extension` folder
3. Run `npm run compile` to compile the TypeScript code
4. Press F5 to open a new window with your extension loaded

### Packaging the Extension

To package the extension for distribution:

```bash
npm install -g @vscode/vsce
vsce package
```

This will create a `.vsix` file that can be installed in VS Code.
