import { createAction } from '@ngrx/store';
import { IParam } from '../../globals/i-param';

export const loadIParams = createAction(
  '[IParam] Load IParams'
);

export const addIParam = createAction(
  '[IParam] Add IParam',
  (param: IParam) => ({ param })
);

export const addIParams = createAction(
  '[IParam] Add IParams',
  (params: IParam[]) => ({ params })
);


