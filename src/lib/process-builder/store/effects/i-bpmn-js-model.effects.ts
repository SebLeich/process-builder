import { Inject, Injectable, Optional } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { mergeMap, of } from 'rxjs';
import { IBpmnJSModel, } from '../../globals/i-bpmn-js-model';
import { addIBpmnJSModel } from '../actions/i-bpmn-js-model.actions';



@Injectable()
export class IBpmnJSModelEffects {

  constructor(
    private actions$: Actions
  ) { }

}
