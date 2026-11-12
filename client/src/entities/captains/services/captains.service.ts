import { Injectable, inject } from '@angular/core';
import { HttpService } from '@shared/services/http.service';
import { firstValueFrom } from 'rxjs';
import { TCaptain } from '../types';

type ResponseCaptains = {
  captains: TCaptain[];
  page: number;
};

@Injectable()
export class CaptainsService {
  private readonly useMock = true;

  #httpService = inject(HttpService);

  async getCaptains(page: number = 0): Promise<ResponseCaptains> {
    const data = await firstValueFrom(
      this.#httpService.post<ResponseCaptains>('players/captains', { page }),
    );

    return {
      captains: data?.captains ?? [],
      page: data.page ?? 0,
    };
  }

  async promoteToCaptain() {}
}
