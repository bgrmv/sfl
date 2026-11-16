import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

import { ITeamDTO } from '../model/team';
import { HttpService } from '@shared/api/http.service';

@Service()
export class TeamsService {
  private readonly httpService = inject(HttpService);

  public find(filter?: Partial<ITeamDTO>): Observable<[ITeamDTO, ITeamDTO]> {
    return this.httpService.get<[ITeamDTO, ITeamDTO]>('teams', filter);
  }
}
