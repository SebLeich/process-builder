import bpmnJsModules from "./bpmn-js-modules";
import { IElement } from "./i-element";

export const getModelingModule = (bpmnJS: any) => bpmnJS.get(bpmnJsModules.Modeling) as ModelingModule;

export interface ModelingModule {
    appendShape: (origin: IElement, type: { type: string }, position: null | { x: number, y: number }) => IElement;
    removeElements: (elements: IElement[]) => void;
    updateLabel: (element: IElement, text: string) => void;
}
