import { Inject, Injectable } from "@angular/core";
import { ParamCodes } from "src/config/param-codes";
import { getModelingModule } from "../bpmn-io/bpmn-modules";
import { IElement } from "../bpmn-io/i-element";
import shapeTypes from "../bpmn-io/shape-types";
import { IFunction } from "../process-builder/globals/i-function";
import { IParam } from "../process-builder/globals/i-param";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";

@Injectable({ providedIn: 'root' })
export class BPMNJsRepository {

    constructor(@Inject(PROCESS_BUILDER_CONFIG_TOKEN) private _config: IProcessBuilderConfig){

    }

    static appendOutputParam(bpmnJS: any, element: IElement, param: IParam | null | undefined, preventDublet: boolean = true): null | IElement {
        if (!param) return null;
        let e = element.outgoing.find(x => x.type === shapeTypes.DataOutputAssociation && x.target.data.outputParam === param.identifier)?.target;
        if (!preventDublet || !e) {
            e = getModelingModule(bpmnJS).appendShape(element, {
                type: shapeTypes.DataObjectReference,
                data: {
                    'outputParam': param.identifier
                }
            }, { x: element.x + 50, y: element.y - 60 });
        }
        getModelingModule(bpmnJS).updateLabel(e, param.name);
        return e;
    }

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
        let tasks = anchestors.filter(x => x.type === shapeTypes.Task);
        let outputParams = tasks.flatMap(x => x.outgoing).filter(x => x.type === shapeTypes.DataOutputAssociation).map(x => x.target);
        return outputParams.filter(x => 'outputParam' in x.data) as IElement[];
    }

    validateErrorGateway(bpmnJS: any, element: IElement, func: IFunction, gatewayName: string = this._config.errorGatewayConfig.gatewayName) {
        var gatewayShape: IElement | undefined = element.outgoing.find(x => x.type === shapeTypes.SequenceFlow && x.target?.data?.gatewayType === 'error_gateway')?.target, modelingModule = getModelingModule(bpmnJS);
        if (func.canFail && !gatewayShape) {
            gatewayShape = modelingModule.appendShape(element, {
                type: shapeTypes.ExclusiveGateway,
                data: {
                    'gatewayType': 'error_gateway'
                }
            }, { x: element.x + 200, y: element.y + 40 });
            modelingModule.updateLabel(gatewayShape, gatewayName);
        } else if (!func.canFail && gatewayShape) {
            modelingModule.removeElements([gatewayShape]);
        }
    }

}