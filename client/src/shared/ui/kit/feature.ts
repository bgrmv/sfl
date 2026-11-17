import {
  Directive,
  Injectable,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  FEATURE_FLAGS,
  FeatureFlag,
  FeatureKey,
  SHOW_DUMMY_MARKERS,
} from '@shared/config/feature-flags';

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private readonly flags = inject(FEATURE_FLAGS);
  readonly showMarkers = inject(SHOW_DUMMY_MARKERS);

  info(key: FeatureKey): FeatureFlag {
    return this.flags[key];
  }
  isOn(key: FeatureKey): boolean {
    return this.flags[key].enabled;
  }
  isDummy(key: FeatureKey): boolean {
    const f = this.flags[key];
    return f.enabled && f.dummy;
  }
}

/** `<section *sflFeature="'home.vote'">`: renders the block only when its flag is enabled. */
@Directive({ selector: '[sflFeature]' })
export class FeatureDirective {
  private readonly features = inject(FeatureService);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  readonly sflFeature = input.required<FeatureKey>();

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.features.isOn(this.sflFeature())) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
