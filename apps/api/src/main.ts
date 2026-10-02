import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuro el prefijo global para todas las rutas
  app.setGlobalPrefix('api/v1');

  // Configuro el filtro global de excepciones para unificar el formato de error
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // Limito las llamadas web a los origenes declarados para este entorno.
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN debe declarar origenes explicitos, no *');
  }
  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins });
  }

  // Dejo Swagger disponible en desarrollo y permito desactivarlo en el VPS.
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('API Restaurante')
      .setDescription('Documentación de la API de El Encanto Campestre')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, documentFactory);
  }

  // Inicio el servidor en el puerto indicado en las variables de entorno o en el 3000
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap();
