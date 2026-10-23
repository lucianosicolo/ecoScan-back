import {
  Module,
} from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  AuthModule,
} from './auth/auth.module';

import {
  ScanModule,
} from './scan/scan.module';

import {
  AppController,
} from './app.controller';

import {
  AppService,
} from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [
        ConfigService,
      ],

      useFactory: (
        configService:
          ConfigService,
      ) => ({
        type: 'mysql',

        host:
          configService
            .getOrThrow<string>(
              'DB_HOST',
            ),

        port:
          Number(
            configService.get<string>(
              'DB_PORT',
            ) ?? '3306',
          ),

        username:
          configService
            .getOrThrow<string>(
              'DB_USERNAME',
            ),

        password:
          configService
            .getOrThrow<string>(
              'DB_PASSWORD',
            ),

        database:
          configService
            .getOrThrow<string>(
              'DB_NAME',
            ),

        autoLoadEntities: true,

        synchronize: true,
      }),
    }),

    AuthModule,
    ScanModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}