import { Module } from '@nestjs/common';
import { MongoService } from './mongo.service';
import { MongoController } from './mongo.controller';

@Module({
  providers: [MongoService],
  controllers: [MongoController],
})
export class MongoModule {}
