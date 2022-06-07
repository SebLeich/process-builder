import { createFeatureSelector, createSelector } from '@ngrx/store';
import { IFunction } from '../../globals/i-function';
import { IParam } from '../../globals/i-param';
import * as fromIFunction from '../reducers/i-function.reducer';

export const selectIFunctionState = createFeatureSelector<fromIFunction.State>(
    fromIFunction.featureKey
);

export const selectIFunction = (id: number) => createSelector(
    selectIFunctionState,
    (state: fromIFunction.State) => state && state.entities ? Object.values(state.entities).find(x => x?.identifier === id) : null
);

export const selectIFunctions = (ids?: number[]) => createSelector(
    selectIFunctionState,
    (state: fromIFunction.State) => {
        if (!state || !state.entities) return [];
        let funcs = Object.values(state.entities);
        if (Array.isArray(ids)) funcs = funcs.filter(x => ids.findIndex(y => x?.identifier === y) > -1);
        return funcs;
    }
);

export const selectIFunctionsByOutputParam = (arg: IParam | number) => createSelector(
    selectIFunctionState,
    (state: fromIFunction.State) => {
        if (!state || !state.entities) return [];
        return Object.values(state.entities).filter(x => x && x.output && x.output.param === (typeof arg === 'number' ? arg : arg.identifier)) as IFunction[];
    }
);

export const selectNextId = () => createSelector(
    selectIFunctionState,
    (state: fromIFunction.State) => (state && state.entities ? Math.max(...Object.values(state.entities).filter(x => x ? true : false).map(x => (x as IFunction).identifier), -1) : -1) + 1
);
