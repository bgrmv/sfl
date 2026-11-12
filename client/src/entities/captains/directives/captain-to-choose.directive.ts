import { Directive, ElementRef, HostListener } from '@angular/core';
import { CaptainsService } from '../services/captains.service';

@Directive({
  selector: 'sfl-captains-cards[sflCaptainToChoose]',
  standalone: true,
  providers: [CaptainsService],
})
export class CaptainToChooseDirective {
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

  constructor(
    private el: ElementRef<HTMLElement>,
    private captainsService: CaptainsService,
  ) {
    this.el.nativeElement.style.cursor = 'pointer';
  }
}
