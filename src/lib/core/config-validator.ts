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
    let _actions: { [key: string]: (evt: IEvent) => void } = {};

    _actions[shapeTypes.StartEvent] = (evt: IEvent) => bpmnJS.get(bpmnJsModules.Modeling).updateLabel(evt.element, config.statusConfig.initialStatus);
    _actions[shapeTypes.EndEvent] = (evt: IEvent) => bpmnJS.get(bpmnJsModules.Modeling).updateLabel(evt.element, config.statusConfig.finalStatus);
    _actions[shapeTypes.Task] = (evt: IEvent) => {
        let service: FunctionSelectionControlService = injector.get(FunctionSelectionControlService);
        service.selectFunction(null);
    }

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.CreateShape, (evt: IEvent) => {

        if (typeof _actions[evt.element.type] === 'undefined') return;

        timer(5).subscribe(() => _actions[evt.element.type](evt));

    });

}
