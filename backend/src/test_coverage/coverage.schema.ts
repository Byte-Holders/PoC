import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Coverage extends Document {
  @Prop({ required: true })
  percentage: number;

  @Prop({ type: Object })
  details: {
    lines: number;
    statements: number;
    functions: number;
    branches: number;
  };
}

export const CoverageSchema = SchemaFactory.createForClass(Coverage);