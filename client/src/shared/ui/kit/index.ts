export * from './feature';
export * from './primitives';
export * from './charts';
export * from './icon';
export * from './table';
export * from './flip';
export * from './ribbon';

import { FeatureDirective } from './feature';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonDirective,
  CardComponent,
  FormDotsComponent,
  PageHeadComponent,
  SectionComponent,
  SegmentedComponent,
  SplitBarComponent,
  StateComponent,
  StatComponent,
} from './primitives';
import {
  BarsComponent,
  MonthComponent,
  PitchComponent,
  RadarComponent,
  ScoreboardComponent,
  SparklineComponent,
} from './charts';
import { IconComponent } from './icon';
import { FlipDigitsComponent } from './flip';
import { SeasonRibbonComponent } from './ribbon';
import {
  FilterBarComponent,
  SortHeaderComponent,
  SortSelectComponent,
} from './table';

/** One import for every page: `imports: [...KIT]`. */
export const KIT = [
  FeatureDirective,
  ButtonDirective,
  CardComponent,
  SectionComponent,
  BadgeComponent,
  AvatarComponent,
  FormDotsComponent,
  StatComponent,
  SegmentedComponent,
  PageHeadComponent,
  StateComponent,
  SplitBarComponent,
  SparklineComponent,
  BarsComponent,
  RadarComponent,
  PitchComponent,
  ScoreboardComponent,
  MonthComponent,
  IconComponent,
  SortHeaderComponent,
  FilterBarComponent,
  SortSelectComponent,
  FlipDigitsComponent,
  SeasonRibbonComponent,
] as const;
