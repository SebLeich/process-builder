import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ParamCodes } from 'src/config/param-codes';
import * as fromIParam from '../reducers/i-param-reducer';

export const selectIParamState = createFeatureSelector<fromIParam.State>(
    fromIParam.featureKey
);

export const selectIParam = (code: ParamCodes | 'dynamic') => createSelector(
    selectIParamState,
    (state: fromIParam.State) => code === 'dynamic' ? null : state && state.entities ? Object.values(state.entities).find(x => x?.processTypeIdentifier === code) : null
);

export const selectIParams = (codes?: ParamCodes[]) => createSelector(
    selectIParamState,
    (state: fromIParam.State) => {
        if (!state || !state.entities) return [];
        let params = Object.values(state.entities);
        if (Array.isArray(codes)) params = params.filter(x => codes.findIndex(y => x?.processTypeIdentifier === y) > -1);
        return params;
    }
);
