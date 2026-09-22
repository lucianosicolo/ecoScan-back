import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module';



import {
  ScanController,
} from './scan.controller';

import {
  ScanService,
} from './scan.service';
import { HistorialModule } from 'src/historico-scan/historico-scan.module';

@Module({
  imports: [
    AuthModule,
    HistorialModule,
  ],

  controllers: [
    ScanController,
  ],

  providers: [
    ScanService,
  ],
})
export class ScanModule {}