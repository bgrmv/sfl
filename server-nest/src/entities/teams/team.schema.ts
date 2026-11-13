import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { EnumTeamColor, type TeamDTO } from '@sfl/schemas';

// The same shape the API exchanges with the client (@sfl/schemas)
export type ITeam = TeamDTO;

export { EnumTeamColor };

const transform = (_doc, ret: Record<string, any>) => {
  ret.id = ret._id;
  delete ret._id;
  return ret;
};

@Schema({
  versionKey: false,
  toObject: {
    transform,
  },
  toJSON: {
    transform,
  },
})
export class Team {
  @ApiProperty()
  @Prop({ type: String, required: true, index: true, unique: true })
  name: string;

  @ApiProperty({ type: String, enum: EnumTeamColor, uniqueItems: true })
  @Prop({ type: String, enum: EnumTeamColor, unique: true })
  color: EnumTeamColor;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ type: String, default: null })
  logo?: string | null;
}

export class UpdateTeam extends PartialType(Team) {}

export const TeamSchema = SchemaFactory.createForClass(Team);
