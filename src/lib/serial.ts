/**
 * Ponte Web Serial com o Arduino.
 * Usa TextEncoderStream / TextDecoderStream e fragmenta as mensagens a cada '\n'.
 */
export interface SerialBridgeHandlers {
  onLine: (line: string) => void;
  /** Chamado quando a porta fecha sem ser por disconnect() (ex.: cabo USB removido). */
  onClose: (reason: string) => void;
}

export class SerialBridge {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<string> | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private readableClosed: Promise<void> | null = null;
  private writableClosed: Promise<void> | null = null;
  private keepReading = false;

  constructor(private readonly handlers: SerialBridgeHandlers) {}

  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  get isOpen(): boolean {
    return this.port !== null;
  }

  async connect(baudRate: number): Promise<void> {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate });
    if (!port.readable || !port.writable) {
      await port.close();
      throw new Error('Porta serial sem fluxo de leitura/escrita.');
    }
    this.port = port;

    const encoder = new TextEncoderStream();
    this.writableClosed = encoder.readable.pipeTo(port.writable);
    this.writer = encoder.writable.getWriter();

    const decoder = new TextDecoderStream();
    this.readableClosed = port.readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>);
    this.reader = decoder.readable.getReader();

    this.keepReading = true;
    void this.readLoop();
  }

  private async readLoop(): Promise<void> {
    let buffer = '';
    let reason = 'Fluxo serial encerrado.';
    try {
      while (this.keepReading && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (!value) continue;
        buffer += value;
        let idx = buffer.indexOf('\n');
        while (idx >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (line) this.handlers.onLine(line);
          idx = buffer.indexOf('\n');
        }
        if (buffer.length > 512) buffer = ''; // proteção contra lixo sem '\n'
      }
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
    }
    if (this.keepReading) {
      this.keepReading = false;
      this.handlers.onClose(reason);
    }
  }

  async write(line: string): Promise<void> {
    if (!this.writer) throw new Error('Porta serial não conectada.');
    await this.writer.write(line.endsWith('\n') ? line : `${line}\n`);
  }

  async disconnect(): Promise<void> {
    this.keepReading = false;
    try {
      await this.reader?.cancel();
    } catch {
      /* ignora */
    }
    await this.readableClosed?.catch(() => undefined);
    try {
      await this.writer?.close();
    } catch {
      /* ignora */
    }
    await this.writableClosed?.catch(() => undefined);
    try {
      await this.port?.close();
    } catch {
      /* ignora */
    }
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.readableClosed = null;
    this.writableClosed = null;
  }
}

/**
 * Temporizador que roda em Web Worker: o navegador limita setInterval em abas
 * em segundo plano, o que poderia disparar o watchdog do Arduino (3 s).
 */
export function createTicker(intervalMs: number, callback: () => void): () => void {
  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const blob = new Blob([`setInterval(function(){postMessage(0)}, ${intervalMs});`], {
        type: 'application/javascript',
      });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      worker.onmessage = () => callback();
      return () => {
        worker.terminate();
        URL.revokeObjectURL(url);
      };
    } catch {
      /* fallback abaixo */
    }
  }
  const handle = setInterval(callback, intervalMs);
  return () => clearInterval(handle);
}
