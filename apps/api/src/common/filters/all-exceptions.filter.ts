import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // Extraigo el contexto HTTP para poder enviar la respuesta
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    // Determino el código de estado (si es HttpException uso su status, sino 500)
    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extraigo el mensaje (si es HttpException puede tener una respuesta personalizada)
    let message: unknown = 'Internal server error';
    let code: string | undefined;
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        message = response;
      } else {
        message = 'message' in response ? response.message || response : response;
        // Conservo el código público para que el móvil pueda completar el acceso.
        if ('code' in response && typeof response.code === 'string') code = response.code;
      }
    } else if (exception instanceof Error) {
      // En desarrollo podría mostrar el error real, pero genéricamente lo dejo así
      message = exception.message;
    }

    // Estructuro la respuesta según lo solicitado
    const responseBody = {
      statusCode: httpStatus,
      message,
      ...(code === undefined ? {} : { code }),
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    // Envío la respuesta
    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
