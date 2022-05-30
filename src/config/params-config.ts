import { IParam } from "src/lib/process-builder/globals/i-param";
import { ParamCodes } from "./param-codes";

export default [
    {
        'processTypeIdentifier': ParamCodes.UserStringInput,
        'value': [
            { 'name': 'value', 'type': 'string' }
        ]
    } as IParam
];