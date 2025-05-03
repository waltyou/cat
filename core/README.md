# Core Service

A simple TypeScript Node.js application that processes messages from an IDE and passes answers back.

## Overview

This core service provides a simple messaging system between an IDE and the core service. It allows:

- Processing messages from the IDE
- Sending responses back to the IDE
- Handling basic commands like ping/pong

## Architecture

The core service is built with the following components:

1. **Core**: The main service class that handles message processing
2. **Protocol**: Defines the message types and interfaces for communication
3. **Messenger**: Implements the communication mechanism between Core and IDE
4. **IDE Interface**: Defines the interface for interacting with the IDE

## Message Flow

```
IDE <---> Messenger <---> Core
```

1. IDE sends a message to the Core through the Messenger
2. Core processes the message
3. Core sends a response back to the IDE through the Messenger
