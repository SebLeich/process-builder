import { Text } from "@codemirror/state";
import { IParamKeyValue } from "src/lib/process-builder/globals/i-param-key-value";

export interface IEmbeddedFunctionImplementationData {
    implementation: Text;
    name: string;
    canFail: boolean;
    normalizedName: string;
    outputParamName: string;
    normalizedOutputParamName: string;
    outputParamValue: IParamKeyValue[];
}
