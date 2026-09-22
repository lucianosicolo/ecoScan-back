import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  NestExpressApplication,
} from '@nestjs/platform-express';

import {
  join,
} from 'path';
async function bootstrap(): Promise<void> {
 const app =
  await NestFactory.create<
    NestExpressApplication
  >(
    AppModule,
  );

 app.enableCors({
  origin: [
    'http://localhost',
    'https://localhost',
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
app.useStaticAssets(
  join(
    process.cwd(),
    'uploads',
  ),
  {
    prefix: '/uploads/',
  },
);
  await app.listen(
    3000,
    '0.0.0.0',
  );
}

void bootstrap();