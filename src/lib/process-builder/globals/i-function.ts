import { InjectionToken } from "@angular/core";
import { IDynamicInputParamsConfig } from "./i-dynamic-input-params-config";
import { IInputParam } from "./i-input-param";
import { IOutputParam } from "./i-output-param";

export interface IFunction {
    name: string;
    description?: string;
    inputParams: IInputParam | IInputParam[] | null;
    useDynamicInputParams?: undefined | boolean | IDynamicInputParamsConfig;
    output: IOutputParam | null;
    pseudoImplementation: (args: any) => any;
    canFail: boolean;
    payload?: any;
    requireCustomImplementation?: boolean;
}

export const FUNCTIONS_CONFIG_TOKEN: InjectionToken<IFunction[]> = new InjectionToken<IFunction[]>("FUNCTION_CONFIG");
