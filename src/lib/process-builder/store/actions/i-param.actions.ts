import { createAction } from '@ngrx/store';
import { IParam } from '../../globals/i-param';

export const addIParam = createAction(
  '[IParam] Add IParam',
  (param: IParam) => ({ param })
);

export const addIParams = createAction(
  '[IParam] Add IParams',
  (params: IParam[]) => ({ params })
);

export const loadIParams = createAction(
  '[IParam] Load IParams'
);

export const updateIParam = createAction(
  '[IParam] Update IParams',
  (param: IParam) => ({ param })
);

export const removeIParam = createAction(
  '[IParam] Remove IParams',
  (param: IParam|number) => ({ param })
);
