import type { TeamDTO } from '@sfl/schemas';
import { EnumTeamColor } from './team-color';

export interface ITeam {
  _id: string;
  name: string;
  color: EnumTeamColor;
  description?: string;
}

export interface ITeamSettings {}
// The shape of the API, declared once in @sfl/schemas
export type ITeamDTO = TeamDTO;
export type TTeamFinal = ITeamDTO & ITeamSettings;
