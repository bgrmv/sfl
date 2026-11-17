import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { COMMENT_STATUSES, type CommentDTO } from '@sfl/schemas';
import { Types } from 'mongoose';

export type IComment = CommentDTO;

// The API gives the name the visitor typed and nothing about the person (S8.4)
const transform = (_doc: unknown, ret: Record<string, any>) => {
  ret.id = String(ret._id);
  ret.gameId = String(ret.gameId);
  ret.name = ret.authorName;
  ret.createdAt = new Date(ret.createdAt).toISOString();
  delete ret._id;
  delete ret.authorName;
  delete ret.updatedAt;
  return ret;
};

@Schema({
  versionKey: false,
  timestamps: true,
  toObject: { transform },
  toJSON: { transform },
})
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Game', required: true, index: true })
  gameId: Types.ObjectId;

  @Prop({ type: String, required: true })
  authorName: string;

  @Prop({ type: String, required: true })
  text: string;

  @Prop({
    type: String,
    enum: COMMENT_STATUSES,
    default: 'pending',
    index: true,
  })
  status: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
