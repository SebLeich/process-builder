import { IFunction } from "src/lib/process-builder/globals/i-function";
import { PredefinedFunctions } from "src/lib/process-builder/globals/pre-defined-functions";
import exampleSolution from "./exampleSolution";
import { ParamCodes } from "./param-codes";

export default [
    new PredefinedFunctions().customJSMethod(0),
    {
        'identifier': 1,
        'inputParams': null,
        'name': 'Request User String Input',
        'description': 'method asks user to insert text and provides the input for further operations',
        'output': { 'param': ParamCodes.UserStringInput },
        'pseudoImplementation': () => {
            let val = 'test_value_123456789';
            console.log(val);
            return val;
        },
        'canFail': true
    } as IFunction,
    {
        'identifier': 2,
        'inputParams': null,
        'name': 'Request User Number Input',
        'description': 'method asks user to insert a number and provides the input for further operations',
        'output': { 'param': ParamCodes.UserNumberInput },
        'pseudoImplementation': () => {
            let val = 123456789;
            console.log(val);
            return val;
        },
        'canFail': true
    } as IFunction,
    {
        'identifier': 3,
        'inputParams': null,
        'name': 'Request User Date Input',
        'description': 'method asks user to insert a date and provides the input for further operations',
        'output': { 'param': ParamCodes.UserDateInput },
        'pseudoImplementation': () => {
            let val = '2022-01-01T00:30:00';
            console.log(val);
            return val;
        },
        'canFail': true
    } as IFunction,
    {
        'identifier': 4,
        'inputParams': [
            { 'optional': false, 'param': ParamCodes.UserStringInput }
        ],
        'name': 'Log user input to console',
        'description': 'method logs the inputs to the console',
        'pseudoImplementation': (inp: string) => {
            console.log(`${inp}`);
        },
        'canFail': false
    } as IFunction,
    {
        'identifier': 5,
        'inputParams': [
            { 'optional': false, 'param': ParamCodes.UserStringInput }
        ],
        'name': 'Convert user input to uppercase',
        'description': 'method converts user input to uppercase',
        'output': { 'param': ParamCodes.ToUpperCaseResult },
        'pseudoImplementation': (inp: string) => {
            let output = inp.toUpperCase();
            console.log(`${inp}, converted to: ${output}`);
            return output;
        },
        'canFail': true
    } as IFunction,
    {
        'identifier': 6,
        'inputParams': [],
        'name': 'Provide exemplary solution',
        'description': 'method provides an exemplary solution',
        'output': { 'param': ParamCodes.ExemplarySolution },
        'pseudoImplementation': () => {
            return exampleSolution;
        },
        'canFail': false
    } as IFunction
];
