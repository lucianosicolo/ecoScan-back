import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MercadopagoModule } from './mercadopago/mercadopago.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MercadopagoModule,

    MercadopagoModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}