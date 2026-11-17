import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** One change made by a signed-in person: who, what (method and route), how it ended, when. */
@Schema({
  versionKey: false,
  timestamps: { createdAt: 'at', updatedAt: false },
})
export class Audit {
  /** The id of the user: the name is read from the user when the log is shown. */
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  method: string;

  /** The pattern of the route (`/rest/players/:id`), never the ids, the query or the body. */
  @Prop({ type: String, required: true })
  route: string;

  @Prop({ type: Number, required: true })
  status: number;

  at: Date;
}

export const AuditSchema = SchemaFactory.createForClass(Audit);
// The log is kept for a year
AuditSchema.index({ at: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });
