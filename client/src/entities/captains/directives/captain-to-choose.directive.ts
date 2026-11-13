import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { CaptainsService } from '../services/captains.service';

@Directive({
  selector: 'sfl-captains-cards[sflCaptainToChoose]',
  standalone: true,
  providers: [CaptainsService],
})
export class CaptainToChooseDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private captainsService = inject(CaptainsService);

  @HostListener('mouseover')
  onMouseOver() {
    this.el.nativeElement.style.boxShadow = '1px 1px 5px 2px black';
  }

  @HostListener('mouseout')
  onMouseOut() {
    this.el.nativeElement.style.boxShadow = 'none';
  }

  @HostListener('click')
  onChoose() {
    // TODO: pick the captain from the card's data-captain attribute
  }

  constructor() {
    this.el.nativeElement.style.cursor = 'pointer';
  }
}
