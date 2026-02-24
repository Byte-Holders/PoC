import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from '../mongo/mongo.schema';
import { Coverage } from 'src/test_coverage/coverage.schema';
import { CoverageModule } from 'src/test_coverage/coverage.module';

@Module({
  imports: [
    CoverageModule,
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule { }

