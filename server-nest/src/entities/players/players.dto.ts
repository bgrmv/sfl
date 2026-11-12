import * as v from 'valibot';

export const RecalculateSeasonDTO = v.object({
  seasonId: v.number([v.integer(), v.minValue(2010)]),
  playerIds: v.array(v.string([v.toTrimmed(), v.minLength(1)]), [
    v.minLength(1),
  ]),
});

export type RecalculateSeasonDTOInput = v.Input<typeof RecalculateSeasonDTO>;
export type RecalculateSeasonDTOOutput = v.Output<typeof RecalculateSeasonDTO>;
