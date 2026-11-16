import { inject, Service } from '@angular/core';
import { HttpService } from '@shared/services/http.service';
import { firstValueFrom } from 'rxjs';
import { TCaptain } from '../model/captain';

@Service({ autoProvided: false })
export class CaptainsService {
  #httpService = inject(HttpService);

  async getCaptains(): Promise<TCaptain[]> {
    const captains = await firstValueFrom(
      this.#httpService.get<TCaptain[]>('players/captains'),
    );

    return captains ?? [];
  }

  async promoteToCaptain() {}
}
