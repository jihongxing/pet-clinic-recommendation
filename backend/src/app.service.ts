import { Injectable } from '@nestjs/common';

import { APP_NAME } from './common/constants/app.constants';

@Injectable()
export class AppService {
  getRoot() {
    return {
      name: APP_NAME,
      message: 'Pet clinic recommendation backend is running.',
    };
  }
}
