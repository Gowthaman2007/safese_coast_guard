export type SerialMessageCallback = (line: string) => void;

class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private buffer: string = '';
  private onMessageCallback: SerialMessageCallback | null = null;
  private isConnected: boolean = false;
  private isSimulated: boolean = false;
  private simTimer: any = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public setOnMessage(cb: SerialMessageCallback) {
    this.onMessageCallback = cb;
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public getIsSimulated(): boolean {
    return this.isSimulated;
  }

  public async connect(): Promise<{ success: boolean; message: string; simulated?: boolean }> {
    if (!this.isSupported()) {
      // Automatically provide simulation fallback so user is never stuck
      this.startSimulation();
      return {
        success: true,
        simulated: true,
        message: 'Web Serial not supported in this browser. Connected to ESP32 Hardware Simulator.',
      };
    }

    try {
      const serial = (navigator as any).serial;
      this.port = await serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      this.isConnected = true;
      this.isSimulated = false;
      this.startReading();

      return {
        success: true,
        message: 'Physical ESP32 connected successfully at 115200 baud.',
      };
    } catch (err: any) {
      // Check if blocked by iframe Permissions Policy
      if (err.name === 'SecurityError' || (err.message && err.message.includes('disallowed by permissions policy'))) {
        this.startSimulation();
        return {
          success: true,
          simulated: true,
          message: 'Browser iframe blocked direct USB access. Connected to active ESP32 Hardware Simulator with telemetry streaming.',
        };
      }

      // If user cancelled selection dialog
      if (err.name === 'NotFoundError' || err.message?.includes('No port selected')) {
        return {
          success: false,
          message: 'No port selected by user.',
        };
      }

      // Other connection failures, fallback to simulation option
      this.startSimulation();
      return {
        success: true,
        simulated: true,
        message: `Hardware port error: ${err.message}. Connected to ESP32 Hardware Simulator.`,
      };
    }
  }

  public connectSimulator(): { success: boolean; message: string } {
    this.startSimulation();
    return {
      success: true,
      message: 'Connected to ESP32 / Neo-6M Hardware Simulator.',
    };
  }

  private startSimulation() {
    this.isConnected = true;
    this.isSimulated = true;
    if (this.simTimer) clearInterval(this.simTimer);

    // Stream simulated telemetry lines every 2 seconds
    let simLat = 9.375;
    let simLng = 79.460;
    this.simTimer = setInterval(() => {
      if (!this.isConnected || !this.isSimulated) return;
      simLat += (Math.random() - 0.48) * 0.0008;
      simLng += (Math.random() - 0.48) * 0.0008;
      const speed = (6.0 + Math.random() * 2.5).toFixed(1);
      if (this.onMessageCallback) {
        this.onMessageCallback(`GPS,${simLat.toFixed(6)},${simLng.toFixed(6)},${speed}`);
      }
    }, 2500);
  }

  private async startReading() {
    if (!this.port || !this.port.readable) return;

    try {
      this.reader = this.port.readable.getReader();
      const textDecoder = new TextDecoder();

      while (this.isConnected && this.port) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.buffer += textDecoder.decode(value, { stream: true });
          const lines = this.buffer.split(/\r?\n/);
          this.buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && this.onMessageCallback) {
              this.onMessageCallback(trimmed);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Serial reader ended or error:', err);
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch {}
        this.reader = null;
      }
    }
  }

  public async sendCommand(cmd: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    if (this.isSimulated) {
      // Simulate hardware response
      if (this.onMessageCallback) {
        if (cmd === 'TEST,LED') {
          setTimeout(() => this.onMessageCallback?.('ACK,LED_OK'), 300);
        } else if (cmd === 'TEST,BUZZER') {
          setTimeout(() => this.onMessageCallback?.('ACK,BUZZER_OK'), 300);
        } else if (cmd === 'TEST,ALARM') {
          setTimeout(() => this.onMessageCallback?.('ACK,ALARM_ACTIVE'), 300);
        } else if (cmd === 'RESET_ALARM') {
          setTimeout(() => this.onMessageCallback?.('ACK,ALARM_RESET'), 300);
        }
      }
      return true;
    }

    if (!this.writer) return false;

    try {
      const textEncoder = new TextEncoder();
      await this.writer.write(textEncoder.encode(cmd + '\n'));
      return true;
    } catch (err) {
      console.error('Failed to write to serial:', err);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.isSimulated = false;
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (err) {
      console.warn('Error closing serial port:', err);
    }
  }
}

export const webSerial = new WebSerialManager();
