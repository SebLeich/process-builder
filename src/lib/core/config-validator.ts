import { Injector } from "@angular/core";
import { timer } from "rxjs";
import bpmnJsEventTypes from "../bpmn-io/bpmn-js-event-types";
import bpmnJsModules from "../bpmn-io/bpmn-js-modules";
import { getModelingModule } from "../bpmn-io/bpmn-modules";
import { IDirectEditingEvent } from "../bpmn-io/i-direct-editing-event";
import { IEvent } from "../bpmn-io/i-event";
import shapeTypes from "../bpmn-io/shape-types";
import { IFunction } from "../process-builder/globals/i-function";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import { FunctionSelectionControlService } from "../process-builder/services/function-selection-control.service";

export const validateBPMNConfig = (bpmnJS: any, injector: Injector) => {

    let config: IProcessBuilderConfig = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
    let _directEditingActions: { [key: string]: (evt: IDirectEditingEvent) => void } = {};
    let _shapeAddedActions: { [key: string]: (evt: IEvent) => void } = {};

    _directEditingActions[shapeTypes.Task] = (evt: IDirectEditingEvent) => {
        bpmnJS.get(bpmnJsModules.DirectEditing).cancel();
        let service: FunctionSelectionControlService = injector.get(FunctionSelectionControlService);
        service.selectFunction(null).subscribe((f: IFunction | null | undefined) => {
            if (!f) {
                getModelingModule(bpmnJS).removeElements([evt.active.element]);
                return;
            }
            getModelingModule(bpmnJS).updateLabel(evt.active.element, f.name);
            if (f.output) {
                let fileShape = getModelingModule(bpmnJS).appendShape(evt.active.element, { type: shapeTypes.DataObjectReference }, { x: evt.active.element.x + 50, y: evt.active.element.y - 60 });
                getModelingModule(bpmnJS).updateLabel(fileShape, f.name);
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

}
