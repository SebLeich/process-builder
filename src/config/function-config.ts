import { IFunction } from "src/lib/process-builder/globals/i-function";
import { ParamCodes } from "./param-codes";

export default [
    {
        'inputParams': null,
        'name': 'Request User String Input',
        'output': { 'param': ParamCodes.UserStringInput },
        'pseudoImplementation': () => {
            let val = 'test_value_123456789';
            console.log(val);
            return val;
        }
    } as IFunction,
    {
        'inputParams': null,
        'name': 'Request User Number Input',
        'output': { 'param': ParamCodes.UserNumberInput },
        'pseudoImplementation': () => {
            let val = 123456789;
            console.log(val);
            return val;
        }
    } as IFunction,
    {
        'inputParams': null,
        'name': 'Request User Date Input',
        'output': { 'param': ParamCodes.UserDateInput },
        'pseudoImplementation': () => {
            let val = '2022-01-01T00:30:00';
            console.log(val);
            return val;
        }
    } as IFunction,
    {
        'inputParams': [
            { 'optional': false, 'param': ParamCodes.UserStringInput }
        ],
        'name': 'Log user input to console',
        'pseudoImplementation': (inp: string) => {
            console.log(`${inp}`);
        }
    } as IFunction,
    {
        'inputParams': [
            { 'optional': false, 'param': ParamCodes.UserStringInput }
        ],
        'name': 'Convert user input to uppercase',
        'output': { 'param': ParamCodes.ToUpperCaseResult },
        'pseudoImplementation': (inp: string) => {
            let output = inp.toUpperCase();
            console.log(`${inp}, converted to: ${output}`);
            return output;
        }
    } as IFunction
];
