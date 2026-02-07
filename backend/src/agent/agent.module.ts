import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from '../mongo/mongo.schema';
// import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}

