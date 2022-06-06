import { Text } from "@codemirror/state";

export interface IEmbeddedFunctionImplementationData {
    implementation: Text;
    name: string;
    canFail: boolean;
    normalizedName: string;
    outputParamName: string;
    normalizedOutputParamName: string;
}
