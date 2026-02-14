import { Controller, Post, Put, Body } from '@nestjs/common';
import { MongoService } from './mongo.service';
import { AgentService } from '../agent/agent.service';

@Controller('mongo')
export class MongoController {
  constructor(
    private readonly MongoService: MongoService,
    private readonly AgentService: AgentService,
  ) {}

  @Post('find_repo')
  async findRepository() {
    return this.MongoService.findRepo();
  }
  @Post('Add_repo')
  async addRepository(@Body() body: { name: string; link: string }) {
    this.AgentService.cloneRepo(body.link);
    return this.MongoService.addRepo(body.name, body.link);
  }
  @Post('find_report')
  async findReports(@Body() body: { name: string }) {
    return this.MongoService.findReports(body.name);
  }
}