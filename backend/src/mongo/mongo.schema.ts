import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RepositoryDocument = HydratedDocument<Repository>;

@Schema({collection: 'repositories'})
export class Repository {

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  link: string;
}

export type ReportDocument = HydratedDocument<Report>;

@Schema({collection: 'reports'})
export class Report {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  report: string;
}

export const RepositorySchema = SchemaFactory.createForClass(Repository);
export const ReportSchema = SchemaFactory.createForClass(Report);
