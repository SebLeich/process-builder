import { Injector } from "@angular/core";
import * as fromIParamState from 'src/lib/process-builder/store/reducers/i-param.reducer';
import * as fromIFunctionState from 'src/lib/process-builder/store/reducers/i-function.reducer';
import { selectIParams } from "../store/selectors/i-param.selectors";
import { IParam } from "../globals/i-param";
import { selectIFunctions } from "../store/selectors/i-function.selector";
import { IFunction } from "../globals/i-function";
import { upsertIFunctions } from "../store/actions/i-function.actions";
import { upsertIParams } from "../store/actions/i-param.actions";

export const localStorageAdapter = (injector: Injector) => {

    let paramStore = injector.get(fromIParamState.PARAM_STORE_TOKEN), functionStore = injector.get(fromIFunctionState.FUNCTION_STORE_TOKEN);

    paramStore.select(selectIParams()).subscribe((params: IParam[]) => {
        localStorage.setItem('params', JSON.stringify(params));
    });

    functionStore.select(selectIFunctions()).subscribe((funcs: IFunction[]) => {
        localStorage.setItem('funcs', JSON.stringify(funcs));
    });

}

export const provideLocalStorageSettings = (injector: Injector) => {

    let paramStore = injector.get(fromIParamState.PARAM_STORE_TOKEN), functionStore = injector.get(fromIFunctionState.FUNCTION_STORE_TOKEN);
    let funcsSetting = localStorage.getItem('funcs'), paramsSetting = localStorage.getItem('params');

    if(funcsSetting){
        
        try {

            let funcs: IFunction[] = JSON.parse(funcsSetting);
            functionStore.dispatch(upsertIFunctions(funcs));

        } catch(e){
            localStorage.removeItem('funcs');
        }

    }

    if(paramsSetting){
        
        try {

            let params: IParam[] = JSON.parse(paramsSetting) as IParam[];
            paramStore.dispatch(upsertIParams(params));

        } catch(e){
            localStorage.removeItem('params');
        }

    }

}
