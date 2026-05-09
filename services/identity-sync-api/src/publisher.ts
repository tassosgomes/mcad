import amqp, { type Channel, type ChannelModel } from 'amqplib';
import type { IdentityUserEvent } from './events.js';

export interface IdentityEventPublisher {
  publish(event: IdentityUserEvent): Promise<void>;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export class RabbitMqIdentityEventPublisher implements IdentityEventPublisher {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(
    private readonly rabbitMqUrl: string,
    private readonly exchangeName: string,
  ) {}

  async publish(event: IdentityUserEvent): Promise<void> {
    const channel = await this.getChannel();
    const body = Buffer.from(JSON.stringify(event));
    channel.publish(this.exchangeName, event.eventType, body, {
      contentType: 'application/json',
      deliveryMode: 2,
      messageId: event.eventId,
      timestamp: Math.floor(new Date(event.occurredAt).getTime() / 1000),
      type: event.eventType,
    });
  }

  async ready(): Promise<boolean> {
    try {
      await this.getChannel();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close().catch(() => undefined);
    this.channel = null;
    this.connection = null;
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    this.connection = await amqp.connect(this.rabbitMqUrl);
    this.connection.on('close', () => {
      this.connection = null;
      this.channel = null;
    });
    this.connection.on('error', () => {
      this.connection = null;
      this.channel = null;
    });

    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
    return this.channel;
  }
}
