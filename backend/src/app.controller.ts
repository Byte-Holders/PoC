import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { connect } from 'mongoose';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
    const mongoQuery: string = `mongodb://mongodb:27017/`;

    console.log(
      `${new Date().toString()} Trying to connect to: ${mongoQuery}`,
    );

    connect(mongoQuery)
    .then(
      () => console.log(`${new Date().toString()} Connected to mongodb`),
      (e) =>
        console.log(`${new Date().toString()} Rejected by mongodb, ${e}`),
    )
    .catch(() => console.log('Error on connection'));
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
