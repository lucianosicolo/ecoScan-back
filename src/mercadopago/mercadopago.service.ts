import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  MercadoPagoConfig,
  Payment,
  Preference
} from 'mercadopago';


interface CreatePreferenceData {

  studentId: number;

  studentName: string;

  period: string;

  amount: number;

}


@Injectable()
export class MercadoPagoService {


  private readonly payment: Payment;

  private readonly preference: Preference;


  constructor(
    private readonly configService: ConfigService
  ) {


    const accessToken =
      this.configService.get<string>(
        'MERCADOPAGO_ACCESS_TOKEN'
      );


    if (!accessToken) {

      throw new Error(
        'No se encontró MERCADOPAGO_ACCESS_TOKEN'
      );

    }


    const client =
      new MercadoPagoConfig({
        accessToken
      });


    this.preference =
      new Preference(client);


    this.payment =
      new Payment(client);

  }


  /* ============================= */
  /* CREAR PREFERENCIA             */
  /* ============================= */

  async createPreference(
    data: CreatePreferenceData
  ) {

    try {


      /* ============================= */
      /* REFERENCIA FUTGOL             */
      /* ============================= */

      const externalReference =
        `futgol_${data.studentId}_${Date.now()}`;


      /* ============================= */
      /* BACK URLS                     */
      /* ============================= */

      const successUrl =
        this.configService.get<string>(
          'MERCADOPAGO_SUCCESS_URL'
        );


      const pendingUrl =
        this.configService.get<string>(
          'MERCADOPAGO_PENDING_URL'
        );


      const failureUrl =
        this.configService.get<string>(
          'MERCADOPAGO_FAILURE_URL'
        );


      if (
        !successUrl ||
        !pendingUrl ||
        !failureUrl
      ) {

        throw new Error(
          'Faltan configurar las URLs de retorno de Mercado Pago'
        );

      }


      /* ============================= */
      /* VALIDAR HTTPS                 */
      /* ============================= */

      if (
        !successUrl.startsWith('https://') ||
        !pendingUrl.startsWith('https://') ||
        !failureUrl.startsWith('https://')
      ) {

        throw new Error(
          'Las URLs de retorno de Mercado Pago deben usar HTTPS'
        );

      }


      console.log(
        'MERCADO PAGO BACK URLS:',
        {
          successUrl,
          pendingUrl,
          failureUrl
        }
      );


      /* ============================= */
      /* WEBHOOK                       */
      /* ============================= */

      // const apiPublicUrl =
      //   this.configService.get<string>(
      //     'API_PUBLIC_URL'
      //   );


      // let notificationUrl:
      //   string | undefined;


      // if (
      //   apiPublicUrl &&
      //   apiPublicUrl.startsWith('https://')
      // ) {

      //   notificationUrl =
      //     `${apiPublicUrl.replace(/\/$/, '')}` +
      //     `/mercadopago/webhook`;

      // }


      // console.log(
      //   'MERCADO PAGO WEBHOOK:',
      //   notificationUrl ??
      //   'No configurado todavía'
      // );


      /* ============================= */
      /* CREAR PREFERENCIA             */
      /* ============================= */

      const result =
        await this.preference.create({

          body: {


            /* PRODUCTO */

            items: [

              {

                id:
                  externalReference,

                title:
                  `Cuota ${data.period} - ` +
                  `${data.studentName}`,

                quantity:
                  1,

                currency_id:
                  'ARS',

                unit_price:
                  Number(data.amount)

              }

            ],


            /* REFERENCIA NUESTRA */

            external_reference:
              externalReference,


            /* DATA FUTGOL */

            metadata: {

              studentId:
                data.studentId,

              studentName:
                data.studentName,

              period:
                data.period

            },


            /* RETORNO AL FRONT */

            back_urls: {

              success:
                successUrl,

              pending:
                pendingUrl,

              failure:
                failureUrl

            },


            /* VOLVER AUTOMÁTICAMENTE */

            auto_return:
              'approved',


            /*
             * Solamente agregamos notification_url
             * cuando tenemos un backend público HTTPS.
             */

            // ...(notificationUrl
            //   ? {
            //       notification_url:
            //         notificationUrl
            //     }
            //   : {})

          }

        });


      console.log(
        'PREFERENCIA CREADA:',
        result.id
      );


      /* ============================= */
      /* RESPUESTA AL FRONT            */
      /* ============================= */

      return {

        preferenceId:
          result.id,

        checkoutUrl:
          result.sandbox_init_point ??
          result.init_point,

        externalReference

      };


    } catch (error) {


      console.error(
        'Error creando preferencia:',
        error
      );


      throw new InternalServerErrorException(
        'No se pudo crear el pago de Mercado Pago'
      );

    }

  }


  /* ============================= */
  /* BUSCAR PAGO EN MERCADO PAGO  */
  /* ============================= */

  async processPayment(
    paymentId: string
  ) {

    try {


      const mpPayment =
        await this.payment.get({

          id:
            paymentId

        });


      console.log(
        '=============================='
      );


      console.log(
        'PAGO COMPLETO MERCADO PAGO'
      );


      console.log(
        JSON.stringify(
          mpPayment,
          null,
          2
        )
      );


      console.log(
        '=============================='
      );


      /* ============================= */
      /* DATA QUE DESPUÉS VA A BDD     */
      /* ============================= */

      const futgolPayment = {

        mercadoPagoPaymentId:
          String(mpPayment.id),

        externalReference:
          mpPayment.external_reference,

        studentId:
          Number(
            mpPayment.metadata?.studentId
          ),

        period:
          String(
            mpPayment.metadata?.period ??
            ''
          ),

        amount:
          Number(
            mpPayment.transaction_amount
          ),

        currency:
          mpPayment.currency_id,

        status:
          mpPayment.status,

        statusDetail:
          mpPayment.status_detail,

        paymentMethodId:
          mpPayment.payment_method_id,

        paymentTypeId:
          mpPayment.payment_type_id,

        installments:
          mpPayment.installments ?? 1,

        payerEmail:
          mpPayment.payer?.email ??
          null,

        payerDocument:
          mpPayment.payer
            ?.identification
            ?.number ??
          null,

        dateCreated:
          mpPayment.date_created,

        dateApproved:
          mpPayment.date_approved,

        dateLastUpdated:
          mpPayment.date_last_updated,

        rawResponse:
          mpPayment

      };


      console.log(
        'PAGO PREPARADO PARA FUTGOL:'
      );


      console.log(
        JSON.stringify(
          futgolPayment,
          null,
          2
        )
      );


      /*
       * ACÁ DESPUÉS HACEMOS:
       *
       * await this.paymentRepository.upsert(...)
       *
       * y si:
       *
       * mpPayment.status === 'approved'
       *
       * cuota → AL DÍA
       */


      return futgolPayment;


    } catch (error) {


      console.error(
        'Error obteniendo pago:',
        error
      );


      throw new InternalServerErrorException(
        'No se pudo obtener el pago de Mercado Pago'
      );

    }

  }

}