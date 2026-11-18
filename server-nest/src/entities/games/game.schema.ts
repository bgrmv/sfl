import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ObjectId } from 'src/constants';
import type { IGameMetadata, IPlayerGameResultMetadata } from '@sfl/domain';
import {
  EnumGameStatus,
  EnumPlayerPosition,
  type GameEvent,
  type PlayerStatisticDTO,
} from '@sfl/schemas';
import { ITeam, Team } from '../teams/team.schema';

// The API shape (@sfl/schemas). Games stored before own goals were counted
// have no `goalsByAuto`, so in the database it is optional.
export type IPlayerStatistic = Omit<PlayerStatisticDTO, 'goalsByAuto'> & {
  goalsByAuto?: number;
};

export { EnumGameStatus };

export type { IGameMetadata, IPlayerGameResultMetadata };

export interface IGame {
  id: string;
  number: number;
  season: number;
  playedAt: Date;
  status: EnumGameStatus;
  teams: [ITeam, ITeam];
  statistics: PlayerStatistic[];
  link: string;
  notes: [string, string];
  metadata: IGameMetadata;
  /** The goals in the order they were scored (S10.27). */
  events?: GameEvent[];
  /** Who confirmed the draft (S10.35). */
  confirmations?: { accountId: string; at: Date }[];
  revoked?: { reason: string; accountId: string; at: Date };
  version?: number;
  deletedAt?: Date | null;
  lock?: {
    accountId: string;
    name: string;
    acquiredAt: Date;
    expiresAt: Date;
  } | null;
}

@Schema({
  _id: false,
})
export class PlayerStatistic implements IPlayerStatistic {
  @ApiProperty({ type: String })
  @Prop({ type: ObjectId, ref: 'Player', required: true })
  playerId: string;

  @ApiProperty({ type: String })
  @Prop({
    type: ObjectId,
    ref: Team.name,
    required: true,
  })
  teamId: string;

  @ApiProperty()
  @Prop({ type: Number, required: true, default: 0 })
  goalsByLeg: number;

  @ApiProperty()
  @Prop({ type: Number, required: true, default: 0 })
  goalsByHead: number;

  @ApiProperty()
  @Prop({ type: Number, required: true, default: 0 })
  goalsByPenalty: number;

  @ApiProperty()
  @Prop({ type: Number, required: false, default: 0 })
  goalsByAuto?: number;

  @ApiProperty()
  @Prop({ type: Number, required: true, default: 0 })
  passes: number;

  @ApiProperty({ type: Boolean, required: true, default: false })
  @Prop({ type: Boolean })
  isMVP: boolean;

  @ApiProperty({ type: Boolean, required: true, default: false })
  @Prop({ type: Boolean })
  isTransfer: boolean;

  @ApiProperty({ type: Boolean, default: false })
  @Prop({ type: Boolean })
  isCaptain: boolean;

  @ApiProperty({
    type: String,
    default: null,
    enum: EnumPlayerPosition,
  })
  @Prop({ type: String, default: null, isEnum: true })
  position: EnumPlayerPosition | null;
}

export const PlayerStatisticSchema =
  SchemaFactory.createForClass(PlayerStatistic);

@Schema({
  id: true,
  timestamps: true,
  versionKey: '_gen',
  toObject: {
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
  toJSON: {
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Game implements IGame {
  @ApiProperty()
  id: string;

  @ApiProperty({ default: 1 })
  @Prop({ type: Number, required: true })
  number: number;

  @ApiProperty({ default: 2010 })
  @Prop({ type: Number, required: true, index: true })
  season: number;

  @ApiProperty()
  @Prop({ type: Date, required: true })
  playedAt: Date;

  @ApiProperty({ type: String, enum: EnumGameStatus })
  @Prop({
    type: String,
    enum: EnumGameStatus,
    required: true,
  })
  status: EnumGameStatus;

  @ApiProperty({ type: Object, isArray: true })
  @Prop({
    type: Object,
    required: true,
  })
  teams: [ITeam, ITeam];

  @ApiProperty({ type: [PlayerStatistic] })
  @Prop({
    type: [PlayerStatisticSchema],
  })
  statistics: PlayerStatistic[];

  @ApiProperty({ type: String })
  @Prop({
    type: String,
  })
  link: string;

  @ApiProperty({ type: String })
  @Prop({
    type: String,
  })
  description: string;

  @ApiProperty({ type: Array, isArray: true })
  @Prop({
    type: Array,
    schemas: [{ type: String }, { type: String }],
  })
  notes: [string, string];

  @Prop({ type: Object, required: false, default: {} })
  metadata: IGameMetadata;

  /** The goals in the order they were scored; absent when the order is not known (S10.27). */
  @Prop({ type: [Object], required: false, default: undefined })
  events?: GameEvent[];

  /**
   * Who confirmed the draft (S10.35): two different people publish it. Any change
   * of the content clears them. `accountId` is the id of the user.
   */
  @Prop({
    type: [{ _id: false, accountId: String, at: Date }],
    default: [],
  })
  confirmations: { accountId: string; at: Date }[];

  /** Grows with every change of the game: a save of an old version is refused (S10.54). */
  @Prop({ type: Number, default: 1 })
  version: number;

  /** The lease of the game: only its holder saves it (S10.54, ADR 0015). */
  @Prop({ type: Object, required: false, default: null })
  lock?: {
    accountId: string;
    name: string;
    acquiredAt: Date;
    expiresAt: Date;
  } | null;

  /** When the game was deleted (S10.2); absent for a living game. Deleted games are hidden. */
  @Prop({ type: Date, required: false })
  deletedAt?: Date | null;

  /** The last revoke of the publication: why, who, when. */
  @Prop({ type: Object, required: false })
  revoked?: { reason: string; accountId: string; at: Date };

  [key: string]: any;
}

// If you want to create a DTO for updating the game, you can use PartialType
export class UpdateGame extends PartialType(Game) {}

export const GameSchema = SchemaFactory.createForClass(Game);

// A deleted game keeps its record but frees its number: the time of the deletion is part of the key (S10.2)
GameSchema.index({ number: 1, season: 1, deletedAt: 1 }, { unique: true });
// `DELETE /players/:id` asks whether the player has games (S12.4)
GameSchema.index({ 'statistics.playerId': 1 });
