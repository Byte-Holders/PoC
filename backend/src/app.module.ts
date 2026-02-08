import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from './agent/agent.module';
import { MongoModule } from './mongo/mongo.module';
import {MongoService} from './mongo/mongo.service';
import {MongoController } from './mongo/mongo.controller';
import { MongooseModule } from '@nestjs/mongoose';
import * as dotenv from 'dotenv';
import { CoverageModule } from './test_coverage/coverage.module';


dotenv.config();

const mongoHost = process.env.MONGODB_HOST ?? 'mongodb';
const mongoPort = process.env.MONGODB_PORT ?? 27017;
const mongoUser = process.env.MONGODB_USER ?? 'root';
const mongoPassword = process.env.MONGODB_PASSWORD ?? 'password';
const mongoDbName = process.env.MONGODB_DBNAME ?? 'placeholder';

const mongoQuery = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoDbName}?authSource=admin`;

console.log(`Configurazione Mongo per NestJS: ${mongoQuery}`);

@Module({
  imports: [MongooseModule.forRoot(mongoQuery), MongoModule, AgentModule, CoverageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
