import { Inject, Injectable, Optional } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { mergeMap, of } from 'rxjs';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from '../../globals/i-function';
import { addIFunctions, loadIFunctions } from '../actions/i-function.actions';



@Injectable()
export class IFunctionEffects {

  loadParams$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadIFunctions),
      mergeMap(
        () => of(addIFunctions(this._config ?? []))
      )
    )
  );

  constructor(
    @Optional() @Inject(FUNCTIONS_CONFIG_TOKEN) private _config: IFunction[],
    private actions$: Actions
  ) { }

}
