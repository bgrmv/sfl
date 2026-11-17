/** The season and the status of the games list as they are kept in the address (S10.1). */
export function parseBoardQuery(
  params: Record<string, string | null | undefined>,
  seasons: readonly string[],
  statuses: readonly string[],
): { season: string; status: string } {
  const season = params['season'];
  const status = params['status'];
  return {
    season: season && seasons.includes(season) ? season : seasons[0],
    status: status && statuses.includes(status) ? status : statuses[0],
  };
}

/** Query parameters for the address; the defaults are `null`: they leave the address clean. */
export function boardQuery(
  season: string,
  status: string,
  defaultSeason: string,
): { season: string | null; status: string | null } {
  return {
    season: season === defaultSeason ? null : season,
    status: status === 'All' ? null : status,
  };
}
