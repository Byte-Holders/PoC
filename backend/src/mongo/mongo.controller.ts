import { Controller, Post } from '@nestjs/common';
import { MongoService } from './mongo.service';

@Controller('mongo')
export class MongoController {
  constructor(private readonly MongoService: MongoService) {}

  @Post('find_repo')
  async findRepository() {
    return this.MongoService.findRepo();
  }
}

