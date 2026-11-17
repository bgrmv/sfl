import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { MediaService } from './media.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    service: TestBed.inject(MediaService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('MediaService', () => {
  it('asks for the photos of a game and gives the list', () => {
    const { service, http } = setup();
    let list: unknown;
    service.find({ gameId: 'g1' }).subscribe(value => (list = value));

    const req = http.expectOne(r => r.url.endsWith('/media'));
    expect(req.request.params.get('gameId')).toBe('g1');
    req.flush({
      ok: true,
      data: [{ id: 'a', mime: 'image/png', size: 1 }],
    });
    expect(list).toEqual([
      { id: 'a', mime: 'image/png', size: 1, caption: '' },
    ]);
  });

  it('uploads the file with the fields, and leaves out the empty ones', () => {
    const { service, http } = setup();
    const file = new File([new Uint8Array([1, 2, 3])], 'p.png', {
      type: 'image/png',
    });
    service
      .upload(file, { caption: 'Final', gameId: '', playerId: 'p1' })
      .subscribe();

    const req = http.expectOne(r => r.url.endsWith('/media'));
    const form = req.request.body as FormData;
    expect(req.request.method).toBe('POST');
    expect(form.get('caption')).toBe('Final');
    expect(form.get('playerId')).toBe('p1');
    expect(form.has('gameId')).toBe(false);
    expect((form.get('file') as File).name).toBe('p.png');
    req.flush({ ok: true, data: { id: 'n', mime: 'image/png', size: 3 } });
  });

  it('changes and deletes a photo by its id', () => {
    const { service, http } = setup();
    service.update('n', { caption: 'New' }).subscribe();
    const patch = http.expectOne(r => r.url.endsWith('/media/n'));
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ caption: 'New' });
    patch.flush({ ok: true, data: { id: 'n', mime: 'image/png', size: 3 } });

    service.delete('n').subscribe();
    const del = http.expectOne(r => r.url.endsWith('/media/n'));
    expect(del.request.method).toBe('DELETE');
    del.flush({ ok: true, data: null });
  });
});
