import crypto from 'crypto';
import WebSocket from 'ws';

export interface AgentGatewayConfig {
  url: string;
  apiKey: string;
}

export interface ExecuteParams {
  executionId: string;
  agentType: 'claude' | 'azure' | 'gcloud' | 'ssh' | 'docker' | 'shell';
  parameters: Record<string, unknown>;
  credentials?: Record<string, string>;
  unixUser?: string;
  userId: string;
}

export interface AgentEvent {
  type: 'output' | 'complete' | 'error';
  executionId: string;
  timestamp: number;
  data?: unknown;
}

type EventCallback = (event: AgentEvent) => void;

export class AgentGatewayClient {
  private config: AgentGatewayConfig;
  private ws: WebSocket | null = null;
  private eventCallbacks: EventCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: AgentGatewayConfig) {
    this.config = config;
  }

  private generateSignature(payload: unknown): { signature: string; timestamp: number } {
    const timestamp = Date.now();
    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.config.apiKey)
      .update(payloadString + timestamp)
      .digest('hex');

    return { signature, timestamp };
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.url}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
    };

    if (body) {
      const { signature, timestamp } = this.generateSignature(body);
      headers['X-Signature'] = signature;
      headers['X-Timestamp'] = timestamp.toString();
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }

  async execute(params: ExecuteParams): Promise<{ executionId: string; jobId: string; status: string }> {
    const requestId = crypto.randomUUID();
    const timestamp = Date.now();

    const payload = {
      requestId,
      timestamp,
      signature: '', // Will be set in request method
      payload: {
        executionId: params.executionId,
        agentType: params.agentType,
        parameters: params.parameters,
        credentials: params.credentials,
        unixUser: params.unixUser,
        userId: params.userId,
      },
    };

    return this.request('POST', `/execute/${params.agentType}`, payload);
  }

  async cancel(executionId: string): Promise<{ executionId: string; status: string }> {
    return this.request('POST', '/execute/cancel', { executionId });
  }

  async getStatus(executionId: string): Promise<Record<string, unknown>> {
    return this.request('GET', `/execute/${executionId}/status`);
  }

  async getAgentStatus(agentType?: string): Promise<Record<string, unknown>> {
    const path = agentType ? `/status/${agentType}` : '/status';
    return this.request('GET', path);
  }

  async getHealth(): Promise<Record<string, unknown>> {
    return this.request('GET', '/health');
  }

  // WebSocket connection for real-time events
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = this.config.url.replace(/^http/, 'ws') + '/ws';
    this.ws = new WebSocket(wsUrl, {
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    });

    this.ws.on('open', () => {
      console.log('Connected to Agent Gateway WebSocket');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString()) as AgentEvent;
        this.eventCallbacks.forEach((cb) => cb(event));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket connection closed');
      this.scheduleReconnect();
    });

    this.ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect();
    }, delay);
  }

  subscribeToExecution(executionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        executionId,
      }));
    }
  }

  onEvent(callback: EventCallback): void {
    this.eventCallbacks.push(callback);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventCallbacks = [];
  }
}
