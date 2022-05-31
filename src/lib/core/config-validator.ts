import { Injector } from "@angular/core";
import { timer } from "rxjs";
import { ParamCodes } from "src/config/param-codes";
import bpmnJsEventTypes from "../bpmn-io/bpmn-js-event-types";
import bpmnJsModules from "../bpmn-io/bpmn-js-modules";
import { getElementRegistryModule, getModelingModule } from "../bpmn-io/bpmn-modules";
import { IDirectEditingEvent } from "../bpmn-io/i-direct-editing-event";
import { IElement } from "../bpmn-io/i-element";
import { IEvent } from "../bpmn-io/i-event";
import shapeTypes from "../bpmn-io/shape-types";
import { IFunction } from "../process-builder/globals/i-function";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import { ParamPipe } from "../process-builder/pipes/param.pipe";
import { FunctionSelectionControlService } from "../process-builder/services/function-selection-control.service";

export const validateBPMNConfig = (bpmnJS: any, injector: Injector) => {

    let config: IProcessBuilderConfig = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
    let _directEditingActions: { [key: string]: (evt: IDirectEditingEvent) => void } = {};
    let _shapeAddedActions: { [key: string]: (evt: IEvent) => void } = {};

    _directEditingActions[shapeTypes.Task] = (evt: IDirectEditingEvent) => {
        bpmnJS.get(bpmnJsModules.DirectEditing).cancel();
        let service: FunctionSelectionControlService = injector.get(FunctionSelectionControlService);
        let availableParams = getAvailableInputParams(evt.active.element);
        service.selectFunction(availableParams).subscribe((f: IFunction | null | undefined) => {
            if (!f) {
                getModelingModule(bpmnJS).removeElements([evt.active.element]);
                return;
            }
            getModelingModule(bpmnJS).updateLabel(evt.active.element, f.name);
            if (f.output) {
                let fileShape = getModelingModule(bpmnJS).appendShape(evt.active.element, {
                    type: shapeTypes.DataObjectReference,
                    data: {
                        'outputParam': f.output.param
                    }
                }, { x: evt.active.element.x + 50, y: evt.active.element.y - 60 });
                injector.get(ParamPipe).transform(f.output.param).subscribe(paramName => getModelingModule(bpmnJS).updateLabel(fileShape, paramName));
            }
            if (f.canFail) {
                let gatewayShape = getModelingModule(bpmnJS).appendShape(evt.active.element, { type: shapeTypes.ExclusiveGateway }, { x: evt.active.element.x + 200, y: evt.active.element.y + 40 });
                getModelingModule(bpmnJS).updateLabel(gatewayShape, 'Error Result?');
            }
            if(f.inputParams){
                let inputParams = Array.isArray(f.inputParams)? f.inputParams: [f.inputParams];
                let availableInputParamsIElements = getAvailableInputParamsIElements(evt.active.element);
                for(let param of inputParams){
                    let element = availableInputParamsIElements.find(x => x.data['outputParam'] === param.param);
                    if(!element) continue;
                    getModelingModule(bpmnJS).connect(element, evt.active.element);
                }
            }
        });
    }

    _shapeAddedActions[shapeTypes.StartEvent] = (evt: IEvent) => getModelingModule(bpmnJS).updateLabel(evt.element, config.statusConfig.initialStatus);
    _shapeAddedActions[shapeTypes.EndEvent] = (evt: IEvent) => getModelingModule(bpmnJS).updateLabel(evt.element, config.statusConfig.finalStatus);

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.ShapeAdded, (evt: IEvent) => {
        if (typeof _shapeAddedActions[evt.element.type] === 'undefined') return;
        timer(1).subscribe(() => _shapeAddedActions[evt.element.type](evt));
    });

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.DirectEditingActivate, (evt: IDirectEditingEvent) => {
        if (typeof _directEditingActions[evt.active.element.type] === 'undefined') return;
        timer(1).subscribe(() => _directEditingActions[evt.active.element.type](evt));
    });

    let fillAnchestors = (element: IElement, anchestors: IElement[] = []) => {
        let index = 0;
        if(!element || !Array.isArray(element.incoming) || element.incoming.length === 0) return;
        let notPassed = element.incoming.map(x => x.source).filter(x => anchestors.indexOf(x) === -1);
        while(index < notPassed.length){
            let el = notPassed[index];
            anchestors.push(el);
            fillAnchestors(el, anchestors);
            index++;
        }
    }

    let getAvailableInputParamsIElements = (element: IElement) => {
        let anchestors: IElement[] = [];
        fillAnchestors(element, anchestors);
        console.log(anchestors);
        let tasks = anchestors.filter(x => x.type === shapeTypes.Task);
        let outputParams = tasks.flatMap(x => x.outgoing).filter(x => x.type === shapeTypes.DataOutputAssociation).map(x => x.target);
        return outputParams.filter(x => 'outputParam' in x.data) as IElement[];
    }

    let getAvailableInputParams = (element: IElement) => {
        return getAvailableInputParamsIElements(element).map(x => x.data.outputParam) as ParamCodes[];
    }

}
