import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { shareReplay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProcessBuilderService {

  defaultBPMNModel$ = this._httpClient.get('./assets/default-bpmn.xml', {
    headers: new HttpHeaders().set('Content-Type', 'text/xml'),
    responseType: 'text'
  }).pipe(
    shareReplay(1)
  );

  constructor(
    private _httpClient: HttpClient
  ) { }

}
