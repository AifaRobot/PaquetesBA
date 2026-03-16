import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const GENERIC_MESSAGE = 'Unexpected error occurred';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = GENERIC_MESSAGE;
    let code: string | undefined;

    const extractMessage = (input: unknown): string | undefined => {
      if (!input) return undefined;
      if (typeof input === 'string') return input;
      if (Array.isArray(input)) {
        // Prefer first string, else stringify first item
        const first = input[0];
        return typeof first === 'string' ? first : JSON.stringify(first);
      }
      if (typeof input === 'object') {
        const obj = input as Record<string, any>;
        if (typeof obj.message === 'string') return obj.message;
        if (Array.isArray(obj.message)) {
          const first = obj.message[0];
          return typeof first === 'string' ? first : String(first);
        }
        if (typeof obj.error === 'string') return obj.error;
        if (Array.isArray(obj.errors)) {
          const first = obj.errors[0];
          return typeof first === 'string' ? first : String(first);
        }
      }
      return undefined;
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      const extracted = extractMessage(res);
      message = extracted ?? GENERIC_MESSAGE;
      if (typeof res === 'object' && res) {
        const obj = res as Record<string, any>;
        code = obj.code ?? code;
      }
      // Log detalle de HttpException
      this.logger.error(
        `HttpException: status=${status} path=${request.url} message=${message}`,
      );
    } else {
      // Loguea la excepción real y su stack
      const err = exception as any;
      const stack = typeof err?.stack === 'string' ? err.stack : undefined;
      const realMsg = typeof err?.message === 'string' ? err.message : GENERIC_MESSAGE;
      this.logger.error(`Unhandled exception at ${request.url}: ${realMsg}`, stack);
      // Do not leak internal errors; use generic message
      status = status;
      message = GENERIC_MESSAGE;
    }

    response.status(status).send({
      error: {
        message,
        code,
        status,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
