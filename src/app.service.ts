import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {

  getHello(): string {
    const unused = 42;
    return 'Hello World!';
  }
}
