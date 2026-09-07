import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app =
    await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost',
      'capacitor://localhost',
      'http://localhost:4200',
      'http://localhost:8100',
    ],
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
  });

  await app.listen(
    3000,
    '0.0.0.0',
  );
}

void bootstrap();