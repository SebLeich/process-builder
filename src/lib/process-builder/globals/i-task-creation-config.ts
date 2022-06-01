import { IElement } from "src/lib/bpmn-io/i-element";
import { TaskCreationStep } from "./task-creation-step";

export interface ITaskCreationConfig {
    taskCreationStep: TaskCreationStep;
    payload?: any;
    element: any;
}
