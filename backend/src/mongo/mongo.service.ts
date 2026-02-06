import { Injectable } from '@nestjs/common';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export class RepoDto {
  _id: string;
  name: string;
  link: string;
}

const reportDtoSchema = new mongoose.Schema<RepoDto>({
  _id: String,
  name: String,
  link: String,
});


@Injectable()
export class MongoService {

  repoModel = mongoose.model('repo', reportDtoSchema);

  async findRepo() {
    return this.repoModel.find();
  }
}

