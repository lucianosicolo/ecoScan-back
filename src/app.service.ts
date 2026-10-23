import {
  Injectable,
} from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: 'ecoscan-back';
  version: '1.0.0';
}

@Injectable()
export class AppService {

  getHealth():
    HealthResponse {

    return {
      status: 'ok',
      service: 'ecoscan-back',
      version: '1.0.0',
    };
  }
}
