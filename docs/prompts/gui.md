GUI is a React application that serves as the primary interface for users to interact within VS Code. Please help init it. Some information about it:

1. React Application Structure: 
- Built as a standalone React app in the  `gui` directory 
- A button use can click 
 
2. State Management: 
- Uses Redux for global state management 

Please draft a detail plan to let me review, and don't need do anything before.



need change one part: "Connect the GUI to the Core Service", Actually, the communication flow between GUI and Core follows this pattern: GUI (React) <-> IdeMessenger <-> VSCode Extension <-> Core Component. 

- IdeMessenger is the GUI Side Communication Interface which serves as the core interface between the GUI and IDE (VSCode). 
- The VSCode extension acts as a middleware, handling message passing between GUI and Core.
- React components use this communication mechanism through hooks:
 ```ts
export function useIdeMessengerRequest<T extends keyof FromWebviewProtocol>(
  messageType: T,
  data: FromWebviewProtocol[T][0] | null,
) {
  const ideMessenger = useContext(IdeMessengerContext);
  const [result, setResult] = useState<
    SuccessWebviewSingleMessage<FromWebviewProtocol[T][1]>["content"] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  // ...
}
````
