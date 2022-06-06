import { InjectionToken } from '@angular/core';
import { createEntityAdapter, EntityAdapter, EntityState, Update } from '@ngrx/entity';
import { createReducer, on, Store } from '@ngrx/store';
import { IParam } from '../../globals/i-param';
import { addIParam, addIParams, updateIParam } from '../actions/i-param.actions';


export const featureKey = 'Param';

function sortCreatedDate(a: IParam, b: IParam) {
  return a.processTypeIdentifier > b.processTypeIdentifier ? 1 : -1;
}

export const adapter: EntityAdapter<IParam> = createEntityAdapter<IParam>({
  selectId: (arg: IParam) => arg.processTypeIdentifier,
  sortComparer: sortCreatedDate
});

export interface State extends EntityState<IParam> {
  ids: string[];
}

export const initialState: State = {
  ids: [],
  entities: {}
};

export const reducer = createReducer(

  initialState,

  on(addIParam, (state: State, { param }) => {
    return adapter.addOne({
      'processTypeIdentifier': nextId(state),
      'value': param.value,
      'name': param.name,
      'normalizedName': param.normalizedName
    }, state);
  }),

  on(addIParams, (state: State, { params }) => {
    let output: IParam[] = [];
    let id = nextId(state);
    for (let param of params) {
      output.push({
        'processTypeIdentifier': nextId(state),
        'value': param.value,
        'name': param.name,
        'normalizedName': param.normalizedName
      });
      id++;
    }
    return adapter.addMany(output, state);
  }),

  on(updateIParam, (state: State, { param }) => {
    let update: Update<IParam> = {
      'id': param.processTypeIdentifier,
      'changes': {
        'name': param.name,
        'value': param.value
      }
    }
    return adapter.updateOne(update, state);
  }),

);

export const nextId = (state: State) => {
  let ids = state && state.entities ? (Object.values(state.entities) as IParam[]).map(x => x.processTypeIdentifier) : [];
  return ids.length === 0 ? 0 : Math.max(...(ids.map(x => typeof x === 'number' ? x : 0))) + 1;
}

export const I_PARAM_STORE_TOKEN = new InjectionToken<Store<State>>("I_PARAM_STORE");
