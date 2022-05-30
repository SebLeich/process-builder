import { Injector } from "@angular/core";
import { timer } from "rxjs";
import bpmnJsEventTypes from "../bpmn-io/bpmn-js-event-types";
import bpmnJsModules from "../bpmn-io/bpmn-js-modules";
import { IEvent } from "../bpmn-io/i-event";
import shapeTypes from "../bpmn-io/shape-types";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import { FunctionSelectionControlService } from "../process-builder/services/function-selection-control.service";

export const validateBPMNConfig = (bpmnJS: any, injector: Injector) => {

    let config: IProcessBuilderConfig = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
    let _elementDblClickActions: { [key: string]: (evt: IEvent) => void } = { };
    let _shapeAddedActions: { [key: string]: (evt: IEvent) => void } = { };

    _elementDblClickActions[shapeTypes.Task] = (evt: IEvent) => {
        let service: FunctionSelectionControlService = injector.get(FunctionSelectionControlService);
        service.selectFunction(null);
    }

    _shapeAddedActions[shapeTypes.StartEvent] = (evt: IEvent) => bpmnJS.get(bpmnJsModules.Modeling).updateLabel(evt.element, config.statusConfig.initialStatus);
    _shapeAddedActions[shapeTypes.EndEvent] = (evt: IEvent) => bpmnJS.get(bpmnJsModules.Modeling).updateLabel(evt.element, config.statusConfig.finalStatus);
    _shapeAddedActions[shapeTypes.Task] = (evt: IEvent) => {
        let service: FunctionSelectionControlService = injector.get(FunctionSelectionControlService);
        service.selectFunction(null);
    }

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.ShapeAdded, (evt: IEvent) => {

        if (typeof _shapeAddedActions[evt.element.type] === 'undefined') return;

        timer(1).subscribe(() => _shapeAddedActions[evt.element.type](evt));

    });

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.SelectionChanged, (evt: IEvent) => {

        /*

        if (typeof _elementDblClickActions[evt.element.type] === 'undefined') return;

        timer(1).subscribe(() => _elementDblClickActions[evt.element.type](evt));

        */

        console.log(evt);

    });

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.ElementMarkerUpdate, (evt: IEvent) => {

        if(evt.element.type === shapeTypes.Task) debugger;

    });

}
