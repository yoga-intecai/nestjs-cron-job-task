import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  getReady() {
    // readyState 1 means connected
    if (this.connection.readyState === 1) {
      return { status: 'ready', database: 'connected' };
    }
    throw new ServiceUnavailableException('Database is not connected');
  }
}
