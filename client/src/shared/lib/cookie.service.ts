import { inject, DOCUMENT, Service } from '@angular/core';

@Service({ autoProvided: false })
export class CookieService {
  #document = inject(DOCUMENT);

  public get(name: string) {
    const cookies = this.#document.cookie.split('; ');
    for (let i = 0; i < cookies.length; i++) {
      const [key, value] = cookies[i].split('=');
      if (key === name) {
        return decodeURIComponent(value);
      }
    }
    return null;
  }
}
