import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { MediaDTO } from '@sfl/schemas';
import { Types } from 'mongoose';

export type IMedia = MediaDTO;

// The stored file name stays on the server: the API gives `id`, the file is at /media/:id/file
const transform = (_doc: unknown, ret: Record<string, any>) => {
  ret.id = String(ret._id);
  if (ret.gameId) ret.gameId = String(ret.gameId);
  if (ret.playerId) ret.playerId = String(ret.playerId);
  if (ret.createdAt) ret.createdAt = new Date(ret.createdAt).toISOString();
  delete ret._id;
  delete ret.file;
  delete ret.updatedAt;
  return ret;
};

@Schema({
  versionKey: false,
  timestamps: true,
  toObject: { transform },
  toJSON: { transform },
})
export class Media {
  /** Name of the file in `MEDIA_DIR`: a random id and the extension. */
  @Prop({ type: String, required: true })
  file: string;

  @Prop({ type: String, required: true })
  mime: string;

  @Prop({ type: Number, required: true })
  size: number;

  @Prop({ type: String, default: '' })
  caption: string;

  @Prop({ type: Types.ObjectId, ref: 'Game', default: null, index: true })
  gameId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Player', default: null, index: true })
  playerId: Types.ObjectId | null;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
