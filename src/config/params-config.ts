import { IParam } from "src/lib/process-builder/globals/i-param";
import { ParamCodes } from "./param-codes";

export default [
    {
        'processTypeIdentifier': ParamCodes.UserStringInput,
        'value': [
            { 'name': 'value', 'type': 'string', 'defaultValue': 'exemplary user string input' }
        ],
        'name': 'user string input'
    } as IParam,
    {
        'processTypeIdentifier': ParamCodes.ToUpperCaseResult,
        'value': [
            { 'name': 'value', 'type': 'string', 'defaultValue': 'exemplary user string input - uppercase' }
        ],
        'name': 'user string input uppercase'
    } as IParam,
    {
        'processTypeIdentifier': ParamCodes.UserDateInput,
        'value': [
            { 'name': 'value', 'type': 'string', 'defaultValue': 'exemplary user date input' }
        ],
        'name': 'user date input'
    } as IParam,
    {
        'processTypeIdentifier': ParamCodes.UserNumberInput,
        'value': [
            { 'name': 'value', 'type': 'number', 'defaultValue': 'exemplary user numeric input' }
        ],
        'name': 'numeric user input'
    } as IParam,
    {
        'processTypeIdentifier': ParamCodes.ExemplarySolution,
        'value': [
            { 'name': '_Id', 'type': 'string', 'defaultValue': 'ab34762f-ccd1-4258-b3e1-69558728e6b4' },
            {
                'name': '_Container', 'type': 'object', 'typeDef': [
                    { 'name': '_Height', 'type': 'number', 'defaultValue': 1700 },
                    { 'name': '_Width', 'type': 'number', 'defaultValue': 2100 },
                    { 'name': '_Length', 'type': 'number', 'defaultValue': 3000 },
                    {
                        'name': '_Goods', 'type': 'array', 'typeDef': [
                            {
                                'name': null, type: 'object', 'typeDef': [
                                    { 'name': 'id', 'type': 'number', 'defaultValue': 1 },
                                    { 'name': 'desc', 'type': 'string', 'defaultValue': 'pallet' },
                                    { 'name': 'height', 'type': 'number', 'defaultValue': 10 },
                                    { 'name': 'group', 'type': 'number', 'defaultValue': 1 },
                                ]
                            }
                        ]
                    }
                ]
            },
            { 'name': '_Algorithm', 'type': 'string', 'defaultValue': 'ABC' },
        ],
        'name': 'exemplary solution'
    } as IParam,
];