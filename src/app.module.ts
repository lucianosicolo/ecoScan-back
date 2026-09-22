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
          configService.get<string>(
            'DB_HOST',
          ),

        port:
          Number(
            configService.get<string>(
              'DB_PORT',
            ),
          ),

        username:
          configService.get<string>(
            'DB_USERNAME',
          ),

        password:
          configService.get<string>(
            'DB_PASSWORD',
          ),

        database:
          configService.get<string>(
            'DB_NAME',
          ),

        autoLoadEntities: true,

        synchronize: true,
      }),
    }),

    AuthModule,
    ScanModule,
  ],
})
export class AppModule {}