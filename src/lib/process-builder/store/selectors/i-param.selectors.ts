import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ParamCodes } from 'src/config/param-codes';
import * as fromIParam from '../reducers/i-param-reducer';

export const selectIParamState = createFeatureSelector<fromIParam.State>(
    fromIParam.featureKey
);

export const selectIParam = (code: ParamCodes) => createSelector(
    selectIParamState,
    (state: fromIParam.State) => state && state.entities ? Object.values(state.entities).find(x => x?.processTypeIdentifier === code) : null
);

export const selectIParams = () => createSelector(
    selectIParamState,
    (state: fromIParam.State) => state && state.entities ? Object.values(state.entities) : []
);
