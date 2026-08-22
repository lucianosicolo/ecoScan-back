import { Module } from '@nestjs/common';

import { MercadoPagoController }
  from './mercadopago.controller';

import { MercadoPagoService }
  from './mercadopago.service';


@Module({
  controllers: [
    MercadoPagoController,
  ],

  providers: [
    MercadoPagoService,
  ],
})
export class MercadopagoModule {}