import { Controller, Post, Put, Body } from '@nestjs/common';
import { MongoService } from './mongo.service';

@Controller('mongo')
export class MongoController {
  constructor(private readonly MongoService: MongoService) {}

  @Post('find_repo')
  async findRepository() {
    return this.MongoService.findRepo();
  }
  @Post('Add_repo')
  async addRepository(@Body() body: { name: string; link: string }) {
    return this.MongoService.addRepo(body.name, body.link);
  }
}

