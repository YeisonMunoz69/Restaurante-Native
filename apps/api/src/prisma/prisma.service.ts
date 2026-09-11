import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  // aquí defino cuántas veces reintento conectarme y cuánto espero entre un intento y otro
  private readonly intentosMaximos = 10;
  private readonly esperaEntreIntentos = 3000;

  // Me conecto a la base apenas arranca el módulo, pero no me rindo en el primer fallo.
  // Lo hago así porque la dirección del pooler de Supabase se resuelve por DNS, y esa consulta
  // a veces se demora o se pierde. Cuando eso pasa Prisma responde P1001 ("no alcanzo el servidor")
  // y antes la API se caía enterita en el arranque, sobre todo dentro de Docker.
  // Reintentando le doy chance al bache de pasar: si es pasajero, el siguiente intento entra bien.
  async onModuleInit() {
    for (let intento = 1; intento <= this.intentosMaximos; intento++) {
      try {
        await this.$connect();
        this.logger.log(
          `Me conecté a la base de datos en el intento ${intento}.`,
        );
        return;
      } catch (error) {
        // si ya gasté todos los intentos, dejo que el error suba para no arrancar con la base caída
        if (intento === this.intentosMaximos) {
          this.logger.error(
            `No pude conectarme a la base después de ${this.intentosMaximos} intentos, así que no arranco.`,
          );
          throw error;
        }

        const segundos = this.esperaEntreIntentos / 1000;
        this.logger.warn(
          `No pude conectarme a la base (intento ${intento} de ${this.intentosMaximos}). Lo intento de nuevo en ${segundos} segundos.`,
        );
        await this.esperar(this.esperaEntreIntentos);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // esta ayudita solo sirve para hacer una pausa antes del siguiente intento de conexión
  private esperar(milisegundos: number) {
    return new Promise((resolve) => setTimeout(resolve, milisegundos));
  }
}
