## Binary Directory Overview

The  binary directory contains code for packaging TypeScript into standalone executables that can run on any platform. Here's a breakdown of its key components:

## Build Process

- Uses esbuild to bundle TypeScript code into a single JavaScript file
- Uses pkg to package the bundled code into platform-specific binaries
- Supports multiple platforms: Windows, macOS, and Linux (both x64 and arm64 architectures)

## Key Files

- build.js: The main build script that handles bundling, packaging, and asset management
- src/index.ts: Entry point for the binary application
- src/IpcMessenger.ts: Handles communication between the binary and the IDE
- src/TcpMessenger.ts: Alternative communication method for debugging

## Platform Support

The build process creates binaries for:

- darwin-x64 (macOS Intel)
- darwin-arm64 (macOS Apple Silicon)
- linux-x64 (Linux Intel/AMD)
- linux-arm64 (Linux ARM)
- win32-x64 (Windows Intel/AMD)
- win32-arm64 (Windows ARM)

## Configuration

- Platform-specific configurations are stored in pkgJson/{platform}-{arch}/package.json
- These files define which assets to include in each binary

## Testing

- test/binary.test.ts contains tests to verify the binary works correctly
- Tests check for proper file creation, communication, and LLM completion

## Debugging
The binary supports two communication modes:

- Standard mode: Uses stdin/stdout for communication
- TCP mode: For debugging, connects over TCP to a server

This architecture allows the Core functionality to be packaged as standalone executables that can be distributed and run across different platforms and IDEs.