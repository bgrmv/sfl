// One declaration of the values the client and the server exchange.
// The words are the ones of GLOSSARY.md.

/** Position of a player in a game (GLOSSARY: Position). */
export enum EnumPlayerPosition {
  Goalkeeper = 'GK',
  Defender = 'DEF',
  Midfielder = 'MID',
  ForwardStriker = 'FRWD',
}

/** State of the record of a game (GLOSSARY: Game status). */
export enum EnumGameStatus {
  New = 'new',
  Draft = 'draft',
  Published = 'published',
}

/** Shirt colour that tells the two teams of a game apart. */
export enum EnumTeamColor {
  White = 'WHITE',
  Red = 'RED',
}

/** State of a player in the league. */
export enum EnumPlayerStatus {
  Deceased = 'DECEASED',
  Retired = 'RETIRED',
  Inactive = 'INACTIVE',
  Injured = 'INJURED',
  Active = 'ACTIVE',
}
