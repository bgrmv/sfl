import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { ObjectId } from 'src/constants';
import { sha512Legacy } from 'src/shared/utils/string';
import { PasswordAlgorithm } from 'src/shared/utils/password';
import { Role } from '../roles/roles.schema';

export interface IUser {
  id?: string;
  name: string;
  surname: string;
  avatar: string;
  birthDate?: Date | null;
  country?: string | null;
  email: string;
  password: string;
  passwordAlgorithm?: PasswordAlgorithm;
  roles: (typeof ObjectId)[];
}

const transform = (_doc, ret: Record<string, any>) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.password;
  delete ret.roles;
  delete ret.tokenVersion;
  delete ret.passwordAlgorithm;
  delete ret.googleSub;
  delete ret.createdAt;
  delete ret.updatedAt;
  // Stored for the profile (S10.33, S10.44), shown to nobody until the visibility settings exist (S8.4)
  delete ret.birthDate;
  delete ret.country;
  return ret;
};

@Schema({
  versionKey: false,
  // Dates are kept for the account's own history; the API does not show them yet (S3.33)
  timestamps: true,
  toObject: {
    transform,
  },
  toJSON: {
    transform,
  },
})
export class User implements IUser {
  @Prop({
    default: () => new Types.UUID(),
    type: Types.UUID,
    required: true,
  })
  _id: string;

  @ApiProperty()
  id: string;

  @ApiProperty()
  @Prop({ type: String })
  name: string;

  @ApiProperty()
  @Prop({ type: String })
  surname: string;

  @ApiProperty()
  @Prop({ type: String })
  avatar: string;

  /** The day only, in UTC. Many dates are lost for good, so it is optional (S3.33). */
  @Prop({ type: Date })
  birthDate?: Date | null;

  /** ISO 3166-1 alpha-2, e.g. `LV`. */
  @Prop({ type: String, match: /^[A-Z]{2}$/ })
  country?: string | null;

  @ApiProperty()
  @Prop({ required: true, unique: true, match: /^\S+@\S+\.\S+$/ })
  email: string;

  @ApiProperty()
  @Prop({ required: true, default: () => sha512Legacy(randomUUID()) })
  password: string;

  /** Documents from before S8.7 have no value: that is `sha512`. */
  @Prop({ type: String, enum: ['sha512', 'argon2id'], default: 'sha512' })
  passwordAlgorithm: PasswordAlgorithm;

  /**
   * The Google account linked by an invitation (S8.13). Never shown, not even to
   * an admin; a second user cannot take the same one.
   */
  @Prop({ type: String, unique: true, sparse: true })
  googleSub?: string;

  /** Raised on sign-out and on a password change: every refresh token issued before is void (S8.12). */
  @Prop({ type: Number, default: 0 })
  tokenVersion: number;

  // Assuming you have defined EnumRoleCollection and RoleModel elsewhere
  // Adjust this part based on your actual setup
  @ApiProperty()
  @Prop({
    type: [
      {
        type: ObjectId,
        ref: Role.name,
        required: true,
      },
    ],
    // validate: {
    //   validator: async (array: any[]) => {
    //     const rolesCount = await Role.countDocuments({ _id: { $in: array } });
    //     return (
    //       Array.isArray(array) &&
    //       array.length > 0 &&
    //       array.length === rolesCount
    //     );
    //   },
    //   message: 'At least one role is required.',
    // },
  })
  roles: (typeof ObjectId)[]; // TODO roles;

  // You might need to adjust this if `useRoleModelReference` returns something specific
  // such as a reference to another schema
}

export const UserSchema = SchemaFactory.createForClass(User);
