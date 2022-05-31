import { IParam } from "src/lib/process-builder/globals/i-param";
import { ParamCodes } from "./param-codes";

export default [
    {
        'processTypeIdentifier': ParamCodes.UserStringInput,
        'value': [
            { 'name': 'value', 'type': 'string' }
        ],
        'name': 'Eingabe1 (s)'
    } as IParam,
    {
        'processTypeIdentifier': ParamCodes.ToUpperCaseResult,
        'value': [
            { 'name': 'value', 'type': 'string' }
        ],
        'name': 'Uppercase Resultat'
    } as IParam,
    {
        'processTypeIdentifier': ParamCodes.UserDateInput,
        'value': [
            { 'name': 'value', 'type': 'string' }
        ],
        'name': 'Eingabe2 (dt)'
    } as IParam,
    {
        'processTypeIdentifier': ParamCodes.UserNumberInput,
        'value': [
            { 'name': 'value', 'type': 'string' }
        ],
        'name': 'Eingabe3 (num)'
    } as IParam
];