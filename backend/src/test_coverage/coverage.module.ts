import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoverageService } from './coverage.service';
import { CoverageController } from './coverage.controller';
import { Coverage, CoverageSchema } from './coverage.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Coverage.name, schema: CoverageSchema }])],
  controllers: [CoverageController],
  providers: [CoverageService],
  exports: [CoverageService],
})
export class CoverageModule {}