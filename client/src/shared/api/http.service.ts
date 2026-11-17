import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { ApiResponse } from '@sfl/schemas';
import { Observable, map } from 'rxjs';
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

/**
 * Every answer of the API is `{ ok, data }` or `{ ok, error }`. A success gives
 * services the payload; a failure comes with an HTTP error status, so it
 * arrives in the error channel (see `toResult` for the typed form).
 */
const unwrap = <T>() =>
  map((response: ApiResponse<T>) => {
    if (!response.ok) throw response.error;
    return response.data;
  });

@Service()
export class HttpService {
  #httpClient = inject(HttpClient);

  get<T, Params = Record<string, any>>(
    url: string,
    params: GetParams & Partial<Params> = {},
  ): Observable<T> {
    return this.#httpClient
      .get<ApiResponse<T>>(API_URL + '/' + url, {
        headers: GET_HEADERS,
        params: {
          ...params,
        },
      })
      .pipe(unwrap<T>());
  }

  post<T, V = T>(url: string, data: Partial<T> = {}): Observable<V> {
    return this.#httpClient
      .post<ApiResponse<V>>(API_URL + '/' + url, data, {
        headers: POST_HEADERS,
      })
      .pipe(unwrap<V>());
  }

  /** A file with fields (`multipart/form-data`): the browser sets the boundary itself. */
  upload<V>(url: string, form: FormData): Observable<V> {
    return this.#httpClient
      .post<ApiResponse<V>>(API_URL + '/' + url, form)
      .pipe(unwrap<V>());
  }

  put<T>(url: string, data: T): Observable<T> {
    return this.#httpClient
      .put<ApiResponse<T>>(API_URL + '/' + url, data, {
        headers: PATCH_HEADERS,
      })
      .pipe(unwrap<T>());
  }

  patch<TData, TResponse>(
    url: string,
    data: TData,
    headers: Record<string, string> = {},
  ) {
    return this.#httpClient
      .patch<ApiResponse<TResponse>>(API_URL + '/' + url, data, {
        // `If-Match` carries the version the editor saw (S10.54)
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...headers,
        }),
      })
      .pipe(unwrap<TResponse>());
  }

  delete<TResponse>(url: string) {
    return this.#httpClient
      .delete<ApiResponse<TResponse>>(API_URL + '/' + url)
      .pipe(unwrap<TResponse>());
  }
}
