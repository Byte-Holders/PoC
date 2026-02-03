import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { connect } from 'mongoose';
import dotenv from "dotenv";

dotenv.config();

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
    const mongoHost     = process.env.MONGODB_HOST ?? "mongodb";
    const mongoPort     = process.env.MONGODB_PORT ?? 27017;
    const mongoUser     = process.env.MONGODB_USER ?? "root";
    const mongoPassword = process.env.MONGODB_PASSWORD ?? "password";
    const mongoDbName   = process.env.MONGODB_DBNAME ?? "placeholder";

    const mongoQuery: string = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDbName}?authSource=admin`;

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
