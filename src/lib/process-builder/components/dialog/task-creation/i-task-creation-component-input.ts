import { ITaskCreationConfig } from "src/lib/process-builder/globals/i-task-creation-config";

export interface ITaskCreationComponentInput {
    steps: ITaskCreationConfig[];
    bpmnJS: any;
}