import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ObjectId } from 'src/constants';
import { EnumPlayerPosition } from '../players/constants/player-career-metadata';
import { ITeam, Team } from '../teams/team.schema';

export interface IPlayerStatistic {
  playerId: string;
  teamId: string;

  passes: number;
  goalsByLeg: number;
  goalsByHead: number;
  goalsByPenalty: number;
  goalsByAuto?: number;

  isMVP: boolean;
  isTransfer: boolean;
  isCaptain: boolean;

  position: EnumPlayerPosition | null;

  // More details
  // distance?: number;
  // injure?: boolean;
  // pulse?: number;
}

export interface IPlayerGameResultMetadata {
  isMvp: boolean;
  isMvpByGoals: boolean;
  isMvpByPasses: boolean;

  asCaptain: boolean;
  asTransfer: boolean;
  asFirstDraft: boolean;
  asSecondDraft: boolean;

  hasWon: boolean;
  hasDraw: boolean;
  hasLose: boolean;
  hasPosition: EnumPlayerPosition | null;

  totalGoalsByLeg: number;
  totalGoalsByHead: number;
  totalGoalsByPenalty: number;
  totalGoalsByAuto: number;
  totalGoals: number;
  totalPasses: number;
  totalPoints: number;

  errors: { name: string; message: string; date: Date }[];
}

export interface IGameMetadata {
  // Common
  totalPlayers: number;
  totalGoals: number;
  totalGoalsByLeg: number;
  totalGoalsByHead: number;
  totalGoalsByPenalty: number;
  totalGoalsByAuto: number;
  totalPasses: number;
  totalPoints: number;

  // Team
  teamWon: string | null; // null if scoreIsDraw
  teamLost: string | null; // null if scoreIsDraw
  isTeamFromFirstDraftWon: boolean;
  isTeamFromFirstDraftLost: boolean;
  isTeamFromSecondDraftWon: boolean;
  isTeamFromSecondDraftLost: boolean;

  // Score
  score: [number, number];
  scoreIsDraw: boolean;
  scoreFirstDraft: number;
  scoreSecondDraft: number;

  // Captains
  captainFirstDraft: string;
  captainSecondDraft: string;
  captainWon: string | null; // null if scoreIsDraw
  captainLost: string | null; // null if scoreIsDraw
  isCaptainFirstDraftWon: boolean;
  isCaptainFirstDraftDraw: boolean;
  isCaptainFirstDraftLost: boolean;
  isCaptainSecondDraftWon: boolean;
  isCaptainSecondDraftDraw: boolean;
  isCaptainSecondDraftLost: boolean;

  // Players
  playerIdsOfFirstDraft: string[];
  playerIdsOfSecondDraft: string[];
  playersByPosition?: {
    [key in EnumPlayerPosition]: number;
  };
  players: Record<string, IPlayerGameResultMetadata>;

  // Mpv
  mvpByGoalsIds: string[];
  mvpByGoalsHeadIds: string[];
  mvpByPassesIds: string[];
  mvpListIds: string[];
}

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
}

export enum EnumGameStatus {
  New = 'new',
  Draft = 'draft',
  Published = 'published',
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
export class Game implements IGame {
  @ApiProperty()
  id: string;

  @ApiProperty({ default: 1 })
  @Prop({ type: Number, reuqired: true, index: true })
  number: number;

  @ApiProperty({ default: 2010 })
  @Prop({ type: Number, reuqired: true, index: true })
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

  [key: string]: any;
}

// If you want to create a DTO for updating the game, you can use PartialType
export class UpdateGame extends PartialType(Game) {}

export const GameSchema = SchemaFactory.createForClass(Game);

GameSchema.index({ number: 1, season: 1 }, { unique: true });
