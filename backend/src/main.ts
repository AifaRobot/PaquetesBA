import 'dotenv/config';
import multipart from '@fastify/multipart';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { OptionalJwtInterceptor } from './common/interceptors/optional-jwt.interceptor.js';
import { ResponseWrapperInterceptor } from './common/interceptors/response-wrapper.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());

  await app.getHttpAdapter().getInstance().register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    attachFieldsToBody: false,
  });

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(new ResponseWrapperInterceptor());
  app.useGlobalInterceptors(new OptionalJwtInterceptor(app.get(JwtService)));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(process.env.PORT ?? 8000, '0.0.0.0');
}
bootstrap();
