import 'dotenv/config'; // Load .env before anything else
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

let cachedApp: INestApplication;

export async function bootstrap(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(AppModule);

  // Helmet security headers (NFR-1.4)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Next.js BFF compatible
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Parse HttpOnly cookies
  app.use(cookieParser());

  // Global request validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // CORS config for Next.js frontend (Vercel)
  const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://*.vercel.app',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow mobile/curl/AI agents without origin header
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  await app.init();
  cachedApp = app;
  return app;
}

// Standalone execution (Railway, Render, local dev, Docker)
if (!process.env.VERCEL && require.main === module) {
  bootstrap().then(async (app) => {
    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`🏥 HealthPulse HMS API running on port ${port}`);
  });
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
}

