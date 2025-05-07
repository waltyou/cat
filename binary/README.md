# CAT Core Binary

The purpose of this folder is to package Typescript code in a way that can be run from any IDE or platform. We first bundle with `esbuild` and then package into binaries with `pkg`.

The `pkgJson/package.json` contains instructions for building with pkg, and needs to be in a separte folder because there is no CLI flag for the assets option (it must be in a package.json), and pkg doesn't recognize any name other than package.json, but if we use the same package.json with dependencies in it, pkg will automatically include these, significantly increasing the binary size.

The build process is otherwise defined entirely in `build.js`.

## Debugging

### Using the VS Code "Core binary" Configuration

The VS Code workspace includes a "Core binary" run configuration that starts the binary in TCP server mode. This allows other components (like the IntelliJ plugin) to connect to it for debugging.

To use this configuration:

1. Open VS Code
2. Go to the "Run and Debug" view (Ctrl+Shift+D)
3. Select "Core binary" from the dropdown menu
4. Click the green play button or press F5

This will start the binary as a TCP server on port 9876. You can then connect to it from other components.

### Debugging with IntelliJ

To debug the binary with IntelliJ:

1. Set `useTcp` to `true` in `CoreMessenger.kt`
2. Run the "Core Binary" debug script in VS Code
3. Start the IntelliJ plugin

The IntelliJ plugin will connect over TCP to the server started from the VS Code window. You can place breakpoints anywhere in the `core` or `binary` folders.

## Building

```bash
npm run build
```

## Testing

```bash
npm run test
```
