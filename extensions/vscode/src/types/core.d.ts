declare module 'core' {
  export class Core {
    constructor(
      messenger: IMessenger<ToCoreProtocol, FromCoreProtocol>,
      ide: IDE
    );
    
    invoke<T extends keyof ToCoreProtocol>(
      messageType: T,
      data: ToCoreProtocol[T][0]
    ): ToCoreProtocol[T][1];
  }

  export interface IdeInfo {
    name: string;
    version: string;
  }

  export interface IdeSettings {
    userToken?: string;
    pauseIndexOnStart?: boolean;
  }

  export interface IDE {
    getIdeInfo(): Promise<IdeInfo>;
    getIdeSettings(): Promise<IdeSettings>;
    readFile(filepath: string): Promise<string>;
    writeFile(path: string, contents: string): Promise<void>;
    showToast(type: 'info' | 'warning' | 'error', message: string): Promise<void>;
    getOpenFiles(): Promise<string[]>;
    getCurrentFile(): Promise<{ path: string; contents: string } | undefined>;
    runCommand(command: string): Promise<void>;
  }

  export interface IProtocol {
    [key: string]: [any, any]; // [request data, response data]
  }

  export interface ToCoreFomIdeProtocol extends IProtocol {
    ping: [string, string];
    processMessage: [{ message: string }, { response: string }];
    getCoreInfo: [undefined, { version: string; status: string }];
  }

  export interface ToIdeFromCoreProtocol extends IProtocol {
    sendResponse: [{ message: string }, void];
    log: [{ level: 'info' | 'warn' | 'error'; message: string }, void];
    statusUpdate: [{ status: string }, void];
  }

  export type ToCoreProtocol = ToCoreFomIdeProtocol;
  export type FromCoreProtocol = ToIdeFromCoreProtocol;

  export interface Message<T = any> {
    messageType: string;
    messageId: string;
    data: T;
  }

  export interface IMessenger<ToProtocol extends IProtocol, FromProtocol extends IProtocol> {
    onError(handler: (message: Message, error: Error) => void): void;
    send<T extends keyof FromProtocol>(
      messageType: T,
      data: FromProtocol[T][0],
      messageId?: string,
    ): string;
    on<T extends keyof ToProtocol>(
      messageType: T,
      handler: (
        message: Message<ToProtocol[T][0]>,
      ) => Promise<ToProtocol[T][1]> | ToProtocol[T][1],
    ): void;
    request<T extends keyof FromProtocol>(
      messageType: T,
      data: FromProtocol[T][0],
    ): Promise<FromProtocol[T][1]>;
    invoke<T extends keyof ToProtocol>(
      messageType: T,
      data: ToProtocol[T][0],
      messageId?: string,
    ): ToProtocol[T][1];
    externalOn<T extends keyof FromProtocol>(
      messageType: T,
      handler: (message: Message) => any,
    ): void;
  }

  export class InProcessMessenger<ToProtocol extends IProtocol, FromProtocol extends IProtocol>
    implements IMessenger<ToProtocol, FromProtocol> {
    onError(handler: (message: Message, error: Error) => void): void;
    invoke<T extends keyof ToProtocol>(
      messageType: T,
      data: ToProtocol[T][0],
      messageId?: string,
    ): ToProtocol[T][1];
    send<T extends keyof FromProtocol>(
      messageType: T,
      data: any,
      _messageId?: string,
    ): string;
    on<T extends keyof ToProtocol>(
      messageType: T,
      handler: (message: Message<ToProtocol[T][0]>) => ToProtocol[T][1],
    ): void;
    request<T extends keyof FromProtocol>(
      messageType: T,
      data: FromProtocol[T][0],
    ): Promise<FromProtocol[T][1]>;
    externalOn<T extends keyof FromProtocol>(
      messageType: T,
      handler: (message: Message) => any,
    ): void;
  }
}
