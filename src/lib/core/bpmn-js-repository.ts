import { ParamCodes } from "src/config/param-codes";
import { IElement } from "../bpmn-io/i-element";
import shapeTypes from "../bpmn-io/shape-types";

export class BPMNJsRepository {

    static fillAnchestors(element: IElement, anchestors: IElement[] = []) {
        let index = 0;
        if (!element || !Array.isArray(element.incoming) || element.incoming.length === 0) return;
        let notPassed = element.incoming.map(x => x.source).filter(x => anchestors.indexOf(x) === -1);
        while (index < notPassed.length) {
            let el = notPassed[index];
            anchestors.push(el);
            this.fillAnchestors(el, anchestors);
            index++;
        }
    }

    static getAvailableInputParams(element: IElement) {
        return this.getAvailableInputParamsIElements(element).map(x => x.data.outputParam) as ParamCodes[];
    }

    static getAvailableInputParamsIElements(element: IElement) {
        let anchestors: IElement[] = [];
        this.fillAnchestors(element, anchestors);
        console.log(anchestors);
        let tasks = anchestors.filter(x => x.type === shapeTypes.Task);
        let outputParams = tasks.flatMap(x => x.outgoing).filter(x => x.type === shapeTypes.DataOutputAssociation).map(x => x.target);
        return outputParams.filter(x => 'outputParam' in x.data) as IElement[];
    }

}