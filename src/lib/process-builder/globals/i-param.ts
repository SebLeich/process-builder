import { InjectionToken } from "@angular/core";
import { IParamKeyValue } from "./i-param-key-value";

export interface IParam {
    'processTypeIdentifier': number;
    'value': IParamKeyValue[];
    'name': string;
    'normalizedName': string;
}

export const PARAMS_CONFIG_TOKEN: InjectionToken<IParam[]> = new InjectionToken<IParam[]>("PARAM_CONFIG");
