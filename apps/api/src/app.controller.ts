import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  // Expongo una comprobacion sencilla para el balanceador y Docker.
  checkHealth() {
    return this.appService.checkHealth();
  }
}
