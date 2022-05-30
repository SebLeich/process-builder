import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { createReducer, on } from '@ngrx/store';
import { IParam } from '../../globals/i-param';
import { addIParam, addIParams } from '../actions/i-param.actions';


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
    return adapter.addOne({ 'processTypeIdentifier': nextId(state), 'value': param.value  }, state);
  }),

  on(addIParams, (state: State, { params }) => {
    let output: IParam[] = [];
    let id = nextId(state);
    for (let param of params) {
      output.push({ 'processTypeIdentifier': id, 'value': param.value });
      id++;
    }
    return adapter.addMany(output, state);
  }),

);

export const nextId = (state: State) => {
  let ids = state && state.entities ? (Object.values(state.entities) as IParam[]).map(x => x.processTypeIdentifier) : [];
  return ids.length === 0 ? 0 : Math.max(...(ids.map(x => typeof x === 'number' ? x : 0))) + 1;
}
