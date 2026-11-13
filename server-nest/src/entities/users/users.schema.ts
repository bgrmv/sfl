import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { Types } from 'mongoose';
import { ObjectId } from 'src/constants';
import { hash } from 'src/shared/utils/string';
import { Role } from '../roles/roles.schema';

export interface IUser {
  id?: string;
  name: string;
  surname: string;
  avatar: string;
  age: number;
  email: string;
  password: string;
  roles: (typeof ObjectId)[];
}

const transform = (doc, ret) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret.password;
  delete ret.roles;
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

  @ApiProperty()
  @Prop({ type: Number })
  age: number;

  @ApiProperty()
  @Prop({ required: true, unique: true, match: /^\S+@\S+\.\S+$/ })
  email: string;

  @ApiProperty()
  @Prop({ required: true, default: () => hash(randomUUID()) })
  password: string;

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
