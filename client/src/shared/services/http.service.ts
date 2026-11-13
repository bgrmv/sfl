import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

const GET_HEADERS = new HttpHeaders();

const POST_HEADERS = new HttpHeaders({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

const PATCH_HEADERS = new HttpHeaders({
  'Content-Type': 'application/json',
  Accept: 'application/json',
});

type GetParams = {
  page?: number;
  skip?: number;
  limit?: number;
};

@Service()
export class HttpService {
  #httpClient = inject(HttpClient);

  get<T, Params = Record<string, any>>(
    url: string,
    params: GetParams & Partial<Params> = {},
  ): Observable<T> {
    return this.#httpClient.get<T>(API_URL + '/' + url, {
      headers: GET_HEADERS,
      params: {
        ...params,
      },
    });
  }

  post<T, V = T>(url: string, data: Partial<T> = {}): Observable<V> {
    return this.#httpClient.post<V>(API_URL + '/' + url, data, {
      headers: POST_HEADERS,
    });
  }

  put<T>(url: string, data: T): Observable<T> {
    return this.#httpClient.put<T>(API_URL + '/' + url, data, {
      headers: PATCH_HEADERS,
    });
  }

  patch<TData, TResponse>(url: string, data: TData) {
    return this.#httpClient.patch<TResponse>(API_URL + '/' + url, data, {
      headers: PATCH_HEADERS,
    });
  }

  delete<TResponse>(url: string) {
    return this.#httpClient.delete<TResponse>(API_URL + '/' + url);
  }
}
