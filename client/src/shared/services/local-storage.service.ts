import { Service } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Service({ autoProvided: false })
export class LocalStorageService {
  #dataSubject = new BehaviorSubject<any>({});

  constructor() {
    // Initialize the BehaviorSubject with the data from localStorage or an empty object
    const storedData = localStorage.getItem('app_data');
    this.#dataSubject.next(storedData ? JSON.parse(storedData) : {});
  }

  getData(): any {
    return this.#dataSubject.value;
  }

  setData(data: any): void {
    localStorage.setItem('app_data', JSON.stringify(data));
    this.#dataSubject.next(data);
  }

  clearData(): void {
    localStorage.removeItem('app_data');
    this.#dataSubject.next({});
  }
}
