import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../users';

import mongoose from 'mongoose';
import {
  EnumPlayerPosition,
  TPlayerMetadata,
} from './constants/player-career-metadata';

export interface ServerPlayer {
  id: string;
  nickname: string;
  isCaptain?: boolean;
  status?: EnumPlayerStatus;
  number?: number;
  user: mongoose.Types.UUID;
  metadata: TPlayerMetadata;

  position?: EnumPlayerPosition;
}

export interface ClientPlayer {
  id: string;

  number: number;
  avatar: number;
  isCaptain: boolean;

  nickname: string;
  name: string;
  surname: string;

  totalGames: number;
  draws: number;
  lostGames: number;
  wonGames: number;
  maxWinStreak: number;
  maxLostStreak: number;

  user: User;

  metadata: TPlayerMetadata;
}

export enum EnumPlayerStatus {
  Deceased = 'DECEASED',
  Retired = 'RETIRED',
  Inactive = 'INACTIVE',
  Injured = 'INJURED',
  Active = 'ACTIVE',
}

export enum EnumPlayerCollection {
  Player = 'players',
  Test = '_players_tests',
}

const transform = (_doc, ret: Record<string, any>) => {
  ret.id = ret._id;
  delete ret._id;
  delete ret._gen;
  delete ret.user?.password;
  return ret;
};

@Schema({
  versionKey: '_gen',
  id: true,
  toObject: {
    transform,
  },
  toJSON: {
    transform,
  },
})
export class Player implements ServerPlayer {
  @ApiProperty()
  id: string;

  @ApiProperty()
  @Prop({
    type: String,
    index: true,
    required: true,
  })
  nickname: string;

  @ApiProperty({ required: false })
  @Prop({ type: Boolean, default: false })
  isCaptain?: boolean;

  @ApiProperty({ required: false })
  @Prop({
    type: String,
    enum: EnumPlayerStatus,
    default: EnumPlayerStatus.Inactive,
  })
  status?: EnumPlayerStatus;

  @ApiProperty({ required: false })
  @Prop({ type: String, enum: EnumPlayerPosition })
  position?: EnumPlayerPosition;

  @ApiProperty({ required: false })
  @Prop({ type: Number, isInteger: true })
  number?: number;

  // TODO PROBLEM does not resolve user by ref
  // @ApiProperty()
  // @Prop({
  //   type: [
  //     {
  //       type: mongoose.Schema.Types.UUID,
  //       ref: User.name,
  //       required: true,
  //       unique: true,
  //     },
  //   ],
  //   transform: (docs) => docs.at(0),
  // })
  // user: mongoose.Schema.Types.UUID;

  @ApiProperty()
  @Prop({
    type: mongoose.Types.UUID,
    ref: User.name,
    required: true,
    unique: true,
  })
  user: mongoose.Types.UUID;

  // Problem
  // @ApiProperty()
  // @Prop({
  //   type: {
  //     type: UUID,
  //     ref: User.name,
  //     required: true,
  //     unique: true,
  //   },
  // })
  // user: typeof UUID;

  @Prop({ type: Object, required: false, default: {} })
  metadata: TPlayerMetadata;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
