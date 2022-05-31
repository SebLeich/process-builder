import bpmnJsModules from "./bpmn-js-modules";
import { IConnector } from "./i-connector";
import { IElement } from "./i-element";

export const getModelingModule = (bpmnJS: any) => bpmnJS.get(bpmnJsModules.Modeling) as IModelingModule;
export const getElementRegistryModule = (bpmnJS: any) => bpmnJS.get(bpmnJsModules.ElementRegistry) as IElementRegistry;

export interface IModelingModule {
    appendShape: (origin: IElement, type: { type: string, data?: any }, position: null | { x: number, y: number }) => IElement;
    connect: (origin: IElement, target: IElement) => IConnector;
    removeElements: (elements: IElement[]) => void;
    updateLabel: (element: IElement, text: string) => void;
}

export interface IElementRegistry {
    add: (element: IElement) => void;
    filter: (cond: (e: IElement) => boolean) => IElement[];
    find: (cond: (e: IElement) => boolean) => IElement | undefined;
    forEach: (arg: (e: IElement) => void) => void;
    get: (id: string) => IElement | undefined;
    getAll: () => IElement[];
    /*
    getGraphics: ƒ (e, t)
    remove: ƒ (e)
    updateGraphics: ƒ (e, t, n)
    updateId: ƒ (e, t)
    */
}
