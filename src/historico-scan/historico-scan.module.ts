import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  UsersModule,
} from '../users/users.module';

import {
  historicoScanEntity,
} from './historico-scan.entity';

import {
  HistorialService,
} from './historico-scan.service';

import {
  HistorialController,
} from './historico-scan.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      historicoScanEntity,
    ]),

    UsersModule,
  ],

  controllers: [
    HistorialController,
  ],

  providers: [
    HistorialService,
  ],

  exports: [
    HistorialService,
  ],
})
export class HistorialModule {}