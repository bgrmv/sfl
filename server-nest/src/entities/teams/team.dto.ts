import * as v from 'valibot';
import { EnumTeamColor } from './team.schema';

const nullToDefaultString = v.transform(
  v.union([v.string(), v.null_()]),
  value => {
    return value === null ? '' : value;
  },
);

export const TeamBaseDTO = {
  name: v.string([v.toTrimmed(), v.minLength(3)]),
  color: v.enum_(EnumTeamColor),
  description: nullToDefaultString,
  logo: nullToDefaultString,
};

export const TeamSaveDTO = v.object({
  ...TeamBaseDTO,
});

export const TeamUpdateDTO = v.transform(
  v.object({
    id: v.string([v.toTrimmed()]),
    ...TeamBaseDTO,
  }),
  input => ({
    ...input,
  }),
);

export const TeamTransformDTO = v.transform(TeamSaveDTO, input => ({
  ...input,
}));

export type SaveTeamDTOInput = v.Input<typeof TeamTransformDTO>;
export type SaveTeamDTOOutput = v.Output<typeof TeamTransformDTO>;
