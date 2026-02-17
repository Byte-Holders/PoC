import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Repository, Report } from './mongo.schema';
import { Model } from 'mongoose';


@Injectable()
export class MongoService {
  constructor(
    @InjectModel(Repository.name) private repoModel: Model<Repository>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
  ) {}

  async findRepo() {
    return this.repoModel.find();
  }

  async addRepo(name: string, link: string) {
    const newRepo = new this.repoModel({
      name: name,
      link: link,
    });

    return newRepo.save();
  }

  async findReports(reponame: string){
    return this.reportModel.find({name : reponame}).sort({ date: -1 });
  }




}