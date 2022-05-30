import { IFunction } from "src/lib/process-builder/globals/i-function";
import { ParamCodes } from "./param-codes";

export default [
    {
        'inputParams': null,
        'name': 'LOG_TO_CONSOLE',
        'output': { 'param': ParamCodes.UserStringInput },
        'pseudoImplementation': () => {
            let val = 'test_value_123456789';
            console.log(val);
            return val;
        }
    } as IFunction,
    {
        'inputParams': [
            { 'optional': false, 'param': ParamCodes.UserStringInput }
        ],
        'name': 'LOG_TO_CONSOLE',
        'pseudoImplementation': (inp: string) => {
            console.log(`${inp}`);
        }
    } as IFunction,
    {
        'inputParams': [
            { 'optional': false, 'param': ParamCodes.UserStringInput }
        ],
        'name': 'CONVERT',
        'output': { 'param': ParamCodes.ToUpperCaseResult },
        'pseudoImplementation': (inp: string) => {
            let output = inp.toUpperCase();
            console.log(`${inp}, converted to: ${output}`);
            return output;
        }
    } as IFunction
];
