import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromIParam from '../reducers/i-param-reducer';

export const selectIParamState = createFeatureSelector<fromIParam.State>(
    fromIParam.featureKey
);

export const selectIParams = () => createSelector(
    selectIParamState,
    (state: fromIParam.State) => state && state.entities ? Object.values(state.entities) : []
);
