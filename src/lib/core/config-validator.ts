import { Injector } from "@angular/core";
import { bufferTime, filter, ReplaySubject, Subject, timer, toArray } from "rxjs";
import bpmnJsEventTypes from "../bpmn-io/bpmn-js-event-types";
import bpmnJsModules from "../bpmn-io/bpmn-js-modules";
import { getElementRegistryModule, getModelingModule } from "../bpmn-io/bpmn-modules";
import { IConnectionCreatePostExecutedEvent } from "../bpmn-io/i-connection-create-post-executed-event";
import { IDirectEditingEvent } from "../bpmn-io/i-direct-editing-event";
import { IEvent } from "../bpmn-io/i-event";
import { IShapeDeleteExecutedEvent } from "../bpmn-io/i-shape-delete-executed-event";
import shapeTypes from "../bpmn-io/shape-types";
import { ITaskCreationComponentOutput } from "../process-builder/components/dialog/task-creation/i-task-creation-component-output";
import { IFunction } from "../process-builder/globals/i-function";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import { ITaskCreationConfig } from "../process-builder/globals/i-task-creation-config";
import { TaskCreationStep } from "../process-builder/globals/task-creation-step";
import { ParamPipe } from "../process-builder/pipes/param.pipe";
import { DialogService } from "../process-builder/services/dialog.service";
import { FunctionSelectionControlService } from "../process-builder/services/function-selection-control.service";
import { BPMNJsRepository } from "./bpmn-js-repository";

export const validateBPMNConfig = (bpmnJS: any, injector: Injector) => {

    let taskCreationSubject = new Subject<ITaskCreationConfig>();
    taskCreationSubject.pipe(bufferTime(200), filter(x => x.length > 0)).subscribe((val) => {
        let service = injector.get(DialogService);
        service.configTaskCreation(val).subscribe((results) => {
            for (let result of results) handleTaskCreationComponentOutput(result);
        });
    });

    let config: IProcessBuilderConfig = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
    let _connectionCreatePostExecutedActions: { [key: string]: (evt: IConnectionCreatePostExecutedEvent) => void } = {};
    let _directEditingActivateActions: { [key: string]: (evt: IDirectEditingEvent) => void } = {};
    let _shapeAddedActions: { [key: string]: (evt: IEvent) => void } = {};
    let _shapeDeleteExecutedActions: { [key: string]: (evt: IShapeDeleteExecutedEvent) => void } = {};

    _connectionCreatePostExecutedActions[shapeTypes.SequenceFlow] = (evt: IConnectionCreatePostExecutedEvent) => {
        if (evt.context.source.type !== shapeTypes.ExclusiveGateway || evt.context.source.data['gatewayType'] !== 'error_gateway') return;
        if (!taskCreationSubject) taskCreationSubject = new ReplaySubject<ITaskCreationConfig>();
        taskCreationSubject.next({ 'taskCreationStep': TaskCreationStep.ConfigureErrorGatewayEntranceConnection, payload: evt });
    }

    _directEditingActivateActions[shapeTypes.Task] = (evt: IDirectEditingEvent) => {
        console.log("DE A");
        bpmnJS.get(bpmnJsModules.DirectEditing).cancel();
        let service: FunctionSelectionControlService = injector.get(FunctionSelectionControlService);
        let availableParams = BPMNJsRepository.getAvailableInputParams(evt.active.element);
        if (!taskCreationSubject) taskCreationSubject = new ReplaySubject<ITaskCreationConfig>();
        taskCreationSubject.next({ 'taskCreationStep': TaskCreationStep.ConfigureFunctionSelection, payload: evt });
        /*
        service.selectFunction(availableParams).subscribe((f: IFunction | null | undefined) => {
            applyFunctionConfig(evt, f);
        });
        */
    }
    _directEditingActivateActions[shapeTypes.DataObjectReference] = (evt: IDirectEditingEvent) => {
        console.log("DE A");
        bpmnJS.get(bpmnJsModules.DirectEditing).cancel();
        let service: FunctionSelectionControlService = injector.get(FunctionSelectionControlService);
        service.editParam(evt.active.element.data['outputParam']).subscribe(() => {

        });
    }
    _directEditingActivateActions[shapeTypes.Label] = (evt: IDirectEditingEvent) => {
        if (typeof _directEditingActivateActions[evt.active.element.businessObject.$type] === 'undefined') return;
        let element = getElementRegistryModule(bpmnJS).get(evt.active.element.businessObject.id);
        _directEditingActivateActions[evt.active.element.businessObject.$type]({ 'active': { 'element': element } } as any);
    }

    _shapeAddedActions[shapeTypes.StartEvent] = (evt: IEvent) => getModelingModule(bpmnJS).updateLabel(evt.element, config.statusConfig.initialStatus);
    _shapeAddedActions[shapeTypes.EndEvent] = (evt: IEvent) => getModelingModule(bpmnJS).updateLabel(evt.element, config.statusConfig.finalStatus);

    _shapeDeleteExecutedActions[shapeTypes.Task] = (evt: IShapeDeleteExecutedEvent) => {
        let dataObjects = evt.context.shape.outgoing.filter(x => x.type === shapeTypes.DataOutputAssociation);
        getModelingModule(bpmnJS).removeElements(dataObjects.map(x => x.target));
    }

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.ShapeAdded, (evt: IEvent) => {
        if (typeof _shapeAddedActions[evt.element.type] === 'undefined') return;
        timer(1).subscribe(() => _shapeAddedActions[evt.element.type](evt));
    });

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.DirectEditingActivate, (evt: IDirectEditingEvent) => {
        if (typeof _directEditingActivateActions[evt.active.element.type] === 'undefined') return;
        timer(1).subscribe(() => _directEditingActivateActions[evt.active.element.type](evt));
    });

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.CommandStackShapeDeletePreExecute, (evt: IShapeDeleteExecutedEvent) => {
        if (typeof _shapeDeleteExecutedActions[evt.context.shape.type] === 'undefined') return;
        _shapeDeleteExecutedActions[evt.context.shape.type](evt);
    });

    bpmnJS.get(bpmnJsModules.EventBus).on(bpmnJsEventTypes.CommandStackConnectionCreatePostExecuted, (evt: IConnectionCreatePostExecutedEvent) => {
        if (typeof _connectionCreatePostExecutedActions[evt.context.connection.type] === 'undefined') return;
        _connectionCreatePostExecutedActions[evt.context.connection.type](evt);
    });

    const applyFunctionConfig = (evt: IDirectEditingEvent, f: IFunction | null | undefined) => {
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
            let config = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
            let gatewayShape = getModelingModule(bpmnJS).appendShape(evt.active.element, {
                type: shapeTypes.ExclusiveGateway,
                data: {
                    'gatewayType': 'error_gateway'
                }
            }, { x: evt.active.element.x + 200, y: evt.active.element.y + 40 });
            getModelingModule(bpmnJS).updateLabel(gatewayShape, config.errorGatewayConfig.gatewayName);
        }
        if (f.inputParams) {
            let inputParams = Array.isArray(f.inputParams) ? f.inputParams : [f.inputParams];
            let availableInputParamsIElements = BPMNJsRepository.getAvailableInputParamsIElements(evt.active.element);
            for (let param of inputParams) {
                let element = availableInputParamsIElements.find(x => x.data['outputParam'] === param.param);
                if (!element) continue;
                getModelingModule(bpmnJS).connect(element, evt.active.element);
            }
        }
    }

    const handleTaskCreationComponentOutput = (taskCreationComponentOutput: ITaskCreationComponentOutput) => {

        switch (taskCreationComponentOutput.config.taskCreationStep) {

            case TaskCreationStep.ConfigureFunctionSelection:
                applyFunctionConfig(taskCreationComponentOutput.config.payload, taskCreationComponentOutput.value);
                break;

        }

    }

}
