import { Module } from '@nestjs/common';
import { MongoService } from './mongo.service';
import { AgentService } from '../agent/agent.service';
import { MongoController } from './mongo.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Repository, RepositorySchema } from './mongo.schema';
import { AgentModule } from 'src/agent/agent.module';

@Module({
  imports: [
    // Registra lo schema qui per renderlo disponibile al Service
    MongooseModule.forFeature([
      { name: Repository.name, schema: RepositorySchema },
    ]),
    AgentModule,
  ],
  providers: [MongoService],
  controllers: [MongoController],
})
export class MongoModule {}
