import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator
} from 'mercadopago';

import {
  MercadoPagoService
} from './mercadopago.service';


@Controller('mercadopago')
export class MercadoPagoController {


  constructor(

    private readonly mercadoPagoService:
      MercadoPagoService,

    private readonly configService:
      ConfigService,

  ) { }


  /* ================================= */
  /* WEBHOOK MERCADO PAGO              */
  /* ================================= */

  @Post('webhook')
  @HttpCode(200)
  async webhook(

    @Body()
    body: {

      action?: string;

      type?: string;

      data?: {
        id?: string;
      };

    },


    @Headers('x-signature')
    xSignature?: string,


    @Headers('x-request-id')
    xRequestId?: string,


    @Query('data.id')
    dataId?: string,


    @Query('type')
    queryType?: string

  ) {


    console.log(
      '=============================='
    );

    console.log(
      'WEBHOOK MERCADO PAGO:',
      body
    );

    console.log(
      'QUERY:',
      {
        dataId,
        queryType
      }
    );

    console.log(
      '=============================='
    );


    /* ================================= */
    /* TIPO DE NOTIFICACIÓN              */
    /* ================================= */

    const type =
      queryType ??
      body.type;


    if (
      type !== 'payment'
    ) {

      return {
        received: true
      };

    }


    /* ================================= */
    /* PAYMENT ID                        */
    /* ================================= */

    const paymentId =
      dataId ??
      body.data?.id;


    if (!paymentId) {

      console.log(
        'Webhook sin paymentId'
      );

      return {
        received: true
      };

    }


    console.log(
      'PAYMENT ID:',
      paymentId
    );


    /* ================================= */
    /* SECRET                            */
    /* ================================= */

    const secret =
      this.configService.get<string>(
        'MERCADOPAGO_WEBHOOK_SECRET'
      )?.trim();


    console.log(
      'DATOS VALIDACIÓN WEBHOOK:',
      {

        xSignature,

        xRequestId,

        dataId:
          paymentId,

        secretLoaded:
          !!secret,

        secretLength:
          secret?.length

      }
    );


    if (!secret) {
      throw new Error(
        'Falta MERCADOPAGO_WEBHOOK_SECRET'
      );
    }


    /* ================================= */
    /* VALIDAR FIRMA                     */
    /* ================================= */

    try {


      WebhookSignatureValidator.validate({

        xSignature,

        xRequestId,

        dataId:
          paymentId,

        secret

      });


      console.log(
        'FIRMA WEBHOOK VÁLIDA ✅'
      );


    } catch (error) {


      console.error(
        'FIRMA WEBHOOK INVÁLIDA'
      );


      console.error(
        error
      );


      if (
        error instanceof
        InvalidWebhookSignatureError
      ) {

        throw new UnauthorizedException(
          'Webhook inválido'
        );

      }


      throw error;

    }


    /* ================================= */
    /* BUSCAR PAGO COMPLETO              */
    /* ================================= */

    const payment =
      await this.mercadoPagoService
        .processPayment(
          String(paymentId)
        );


    console.log(
      'PAGO PROCESADO:',
      payment.status
    );


    return {

      received:
        true,

      paymentId,

      status:
        payment.status

    };

  }


  /* ================================= */
  /* CREAR PREFERENCIA                 */
  /* ================================= */

  @Post('preference')
  createPreference(

    @Body()
    body: {

      studentId: number;

      studentName: string;

      period: string;

      amount: number;

    },

  ) {


    return this.mercadoPagoService
      .createPreference({

        studentId:
          Number(body.studentId),

        studentName:
          body.studentName,

        period:
          body.period,

        amount:
          Number(body.amount),

      });

  }

}