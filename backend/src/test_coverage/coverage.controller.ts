import { Controller, Post, Get } from '@nestjs/common';
import { CoverageService } from './coverage.service';

@Controller('coverage')
export class CoverageController {
  constructor(private readonly coverageService: CoverageService) {}

  // Quando chiami POST http://localhost:3000/coverage/save
  @Post('save')
  async save() {
    return await this.coverageService.runAndSaveCoverage();
  }

  @Post('trigger-scan')
  async triggerScan() {
    return await this.coverageService.runTestsAndUpload();
  }

  // Quando chiami GET http://localhost:3000/coverage
  @Get()
  async getHistory() {
    return await this.coverageService.findAll();
  }
}