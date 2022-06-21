import { Inject, Injectable } from "@angular/core";
import { ParamCodes } from "src/config/param-codes";
import { getModelingModule } from "../bpmn-io/bpmn-modules";
import { IBusinessObject } from "../bpmn-io/i-business-object";
import { IElement } from "../bpmn-io/i-element";
import shapeTypes from "../bpmn-io/shape-types";
import { IBpmnJS } from "../process-builder/globals/i-bpmn-js";
import { IFunction } from "../process-builder/globals/i-function";
import { IParam } from "../process-builder/globals/i-param";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import sebleichProcessBuilderExtension from "../process-builder/globals/sebleich-process-builder-extension";

@Injectable({ providedIn: 'root' })
export class BPMNJsRepository {

    constructor(@Inject(PROCESS_BUILDER_CONFIG_TOKEN) private _config: IProcessBuilderConfig) {

    }

    static appendOutputParam(bpmnJS: any, element: IElement, param: IParam | null | undefined, preventDublet: boolean = true): null | IElement {
        if (!param) return null;
        let e = element.outgoing.find(x => x.type === shapeTypes.DataOutputAssociation)?.target;
        if (!preventDublet || !e) {
            e = getModelingModule(bpmnJS).appendShape(element, {
                type: shapeTypes.DataObjectReference
            }, { x: element.x + 50, y: element.y - 60 });
            BPMNJsRepository.updateBpmnElementSLPBExtension(bpmnJS, e.businessObject, 'DataObjectExtension', (ext) => {
                ext.outputParam = param.identifier;
            });
        } else if (e) {
            BPMNJsRepository.updateBpmnElementSLPBExtension(bpmnJS, e.businessObject, 'DataObjectExtension', (ext) => {
                ext.outputParam = param.identifier;
            });
        };
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
        return this.getAvailableInputParamsIElements(element).map(x => BPMNJsRepository.getSLPBExtension(x.businessObject, 'DataObjectExtension', (ext) => ext.outputParam)) as ParamCodes[];
    }

    static getAvailableInputParamsIElements(element: IElement) {
        let anchestors: IElement[] = [];
        this.fillAnchestors(element, anchestors);
        let tasks = anchestors.filter(x => x.type === shapeTypes.Task);
        let outputParams = tasks.flatMap(x => x.outgoing).filter(x => x.type === shapeTypes.DataOutputAssociation).map(x => x.target);
        return outputParams.filter(x => BPMNJsRepository.sLPBExtensionSetted(x.businessObject, 'DataObjectExtension', (ext) => 'outputParam' in ext)) as IElement[];
    }

    static getExtensionElements(element: IBusinessObject, type: string): undefined | any[] {
        if (!element.extensionElements || !Array.isArray(element.extensionElements.values)) return undefined;
        return element.extensionElements.values.filter((x: any) => x.$instanceOf(type))[0];
    }

    static getSLPBExtension<T>(businessObject: IBusinessObject | undefined, type: 'ActivityExtension' | 'GatewayExtension' | 'DataObjectExtension', provider: (extensions: any) => T) {
        if (!businessObject) return undefined;
        let extension = BPMNJsRepository.getExtensionElements(businessObject, `${sebleichProcessBuilderExtension.prefix}:${type}`);
        return extension ? provider(extension) : undefined;
    }

    static sLPBExtensionSetted(businessObject: IBusinessObject | undefined, type: 'ActivityExtension' | 'GatewayExtension' | 'DataObjectExtension', condition: (extensions: any) => boolean) {
        if (!businessObject) return false;
        let extension = BPMNJsRepository.getExtensionElements(businessObject, `${sebleichProcessBuilderExtension.prefix}:${type}`);
        return extension ? condition(extension) : false;
    }

    static updateBpmnElementSLPBExtension(bpmnJS: IBpmnJS, businessObject: IBusinessObject, type: 'ActivityExtension' | 'GatewayExtension' | 'DataObjectExtension', setter: (extension: any) => void) {
        let extensionElements = businessObject.extensionElements;
        if (!extensionElements) {
            extensionElements = bpmnJS._moddle.create('bpmn:ExtensionElements');
            businessObject.extensionElements = extensionElements;
        }

        let activityExtension = BPMNJsRepository.getExtensionElements(businessObject, `${sebleichProcessBuilderExtension.prefix}:${type}`);
        if (!activityExtension) {
            activityExtension = bpmnJS._moddle.create(`${sebleichProcessBuilderExtension.prefix}:${type}`);
            extensionElements.get('values').push(activityExtension);
        }

        setter(activityExtension as any);
    }

    validateErrorGateway(bpmnJS: any, element: IElement, func: IFunction, gatewayName: string = this._config.errorGatewayConfig.gatewayName) {
        var gatewayShape: IElement | undefined = element.outgoing.find(x => x.type === shapeTypes.SequenceFlow && BPMNJsRepository.sLPBExtensionSetted(x.businessObject, 'GatewayExtension', (ext) => ext.gatewayType === 'error_gateway'))?.target, modelingModule = getModelingModule(bpmnJS);
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