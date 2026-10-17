import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  // Consulto el esquema del menú, sin leer filas: SELECT 1 no detectaba migraciones pendientes.
  async checkHealth() {
    try {
      await this.prisma.$queryRaw`SELECT "activo" FROM "platos" LIMIT 0`;
      return { status: 'ok', database: 'connected' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
