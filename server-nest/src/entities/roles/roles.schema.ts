import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { EnumRole } from './constants';

@Schema({
  versionKey: false,
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Role {
  @ApiProperty({
    type: String,
    enum: EnumRole,
    uniqueItems: true,
    examples: Object.values(EnumRole),
  })
  @Prop({ type: String, enum: EnumRole, required: true, unique: true })
  name: string;

  @ApiProperty()
  @Prop()
  description?: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
