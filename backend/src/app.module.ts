import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from './agent/agent.module';
import { MongoModule } from './mongo/mongo.module';

@Module({
  imports: [AgentModule, MongoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
