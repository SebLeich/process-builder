import { Injector } from "@angular/core";
import { buffer, combineLatest, debounceTime, filter, ReplaySubject, Subject, switchMap, take, timer } from "rxjs";
import bpmnJsEventTypes from "../bpmn-io/bpmn-js-event-types";
import bpmnJsModules from "../bpmn-io/bpmn-js-modules";
import { getElementRegistryModule, getModelingModule } from "../bpmn-io/bpmn-modules";
import { IConnectionCreatePostExecutedEvent } from "../bpmn-io/i-connection-create-post-executed-event";
import { IDirectEditingEvent } from "../bpmn-io/i-direct-editing-event";
import { IElement } from "../bpmn-io/i-element";
import { IEvent } from "../bpmn-io/i-event";
import { IShapeDeleteExecutedEvent } from "../bpmn-io/i-shape-delete-executed-event";
import shapeTypes from "../bpmn-io/shape-types";
import { ITaskCreationComponentOutput } from "../process-builder/components/dialog/task-creation/i-task-creation-component-output";
import { IEmbeddedFunctionImplementationData } from "../process-builder/components/embedded/embedded-function-implementation/i-embedded-function-implementation-output";
import { ErrorGatewayEvent } from "../process-builder/globals/error-gateway-event";
import { IFunction } from "../process-builder/globals/i-function";
import { IParam } from "../process-builder/globals/i-param";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import { ITaskCreationConfig } from "../process-builder/globals/i-task-creation-config";
import { MethodEvaluationStatus } from "../process-builder/globals/method-evaluation-status";
import { TaskCreationStep } from "../process-builder/globals/task-creation-step";
import { ParamPipe } from "../process-builder/pipes/param.pipe";
import { DialogService } from "../process-builder/services/dialog.service";
import { addIFunction, updateIFunction } from "../process-builder/store/actions/i-function.actions";
import { addIParam, removeIParam, updateIParam } from "../process-builder/store/actions/i-param.actions";
import { FUNCTION_STORE_TOKEN } from "../process-builder/store/reducers/i-function.reducer";
import { PARAM_STORE_TOKEN } from "../process-builder/store/reducers/i-param.reducer";
import * as fromIFunctionSelector from "../process-builder/store/selectors/i-function.selector";
import * as fromIParmSelector from "../process-builder/store/selectors/i-param.selectors";
import { BPMNJsRepository } from "./bpmn-js-repository";
import { CodemirrorRepository } from "./codemirror-repository";

export const validateBPMNConfig = (bpmnJS: any, injector: Injector) => {

    let taskCreationSubject = new Subject<ITaskCreationConfig>();
    taskCreationSubject.pipe(buffer(taskCreationSubject.pipe(debounceTime(100))), filter(x => x.length > 0)).subscribe((val) => {
        let service = injector.get(DialogService);
        service.configTaskCreation(val, bpmnJS).subscribe((results) => {
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
        if (!taskCreationSubject) taskCreationSubject = new ReplaySubject<ITaskCreationConfig>(1);
        taskCreationSubject.next({
            taskCreationStep: TaskCreationStep.ConfigureErrorGatewayEntranceConnection,
            payload: evt,
            element: evt.context.connection
        });
    }

    _directEditingActivateActions[shapeTypes.Task] = (evt: IDirectEditingEvent) => {
        bpmnJS.get(bpmnJsModules.DirectEditing).cancel();
        if (!taskCreationSubject) taskCreationSubject = new ReplaySubject<ITaskCreationConfig>(1);
        taskCreationSubject.next({
            taskCreationStep: TaskCreationStep.ConfigureFunctionSelection,
            payload: evt,
            element: evt.active.element
        });
    }
    _directEditingActivateActions[shapeTypes.DataObjectReference] = (evt: IDirectEditingEvent) => {
        bpmnJS.get(bpmnJsModules.DirectEditing).cancel();
        let service: DialogService = injector.get(DialogService);
        let paramStore = injector.get(PARAM_STORE_TOKEN);
        service.editParam(evt.active.element.data['outputParam']).pipe(
            switchMap(() => paramStore.select(fromIParmSelector.selectIParam(evt.active.element.data['outputParam']))),
            take(1)
        ).subscribe((param: IParam | null | undefined) => {
            if (!param) return;
            getModelingModule(bpmnJS).updateLabel(evt.active.element, param.name);
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
        let removeElements = evt.context.shape.outgoing.filter(x => x.type === shapeTypes.DataOutputAssociation || (x.type === shapeTypes.SequenceFlow && x.target.data?.gatewayType === 'error_gateway'));
        getModelingModule(bpmnJS).removeElements(removeElements.map(x => x.target));
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

    const applyFunctionSelectionConfig = (taskCreationComponentOutput: ITaskCreationComponentOutput) => {

        let functionIdentifier = taskCreationComponentOutput.value, element = taskCreationComponentOutput.config.element;

        let funcStore = injector.get(FUNCTION_STORE_TOKEN);
        funcStore.select(fromIFunctionSelector.selectIFunction(functionIdentifier))
            .pipe(take(1))
            .subscribe((f: IFunction | undefined | null) => {
                if (!f) {
                    if (typeof element.data !== 'number') {
                        getModelingModule(bpmnJS).removeElements([element]);
                    }
                    return;
                }
                if (f.requireCustomImplementation) return;
        
                getModelingModule(bpmnJS).updateLabel(element, f.name);
                element.data = f.identifier;
        
                if (f.output && !(f.output.param === 'dynamic')) {
                    let outputParamCode = f.output.param;
                    let fileShape = getModelingModule(bpmnJS).appendShape(element, {
                        type: shapeTypes.DataObjectReference,
                        data: {
                            'outputParam': outputParamCode
                        }
                    }, { x: element.x + 50, y: element.y - 60 });
                    injector.get(ParamPipe).transform(outputParamCode).subscribe(paramName => getModelingModule(bpmnJS).updateLabel(fileShape, paramName));
                }
                if (f.canFail) {
                    let config = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
                    let gatewayShape = getModelingModule(bpmnJS).appendShape(element, {
                        type: shapeTypes.ExclusiveGateway,
                        data: {
                            'gatewayType': 'error_gateway'
                        }
                    }, { x: element.x + 200, y: element.y + 40 });
                    getModelingModule(bpmnJS).updateLabel(gatewayShape, config.errorGatewayConfig.gatewayName);
                }
                if (f.inputParams) {
                    let inputParams = Array.isArray(f.inputParams) ? f.inputParams : [f.inputParams];
                    let availableInputParamsIElements = BPMNJsRepository.getAvailableInputParamsIElements(element);
                    for (let param of inputParams) {
                        let element = availableInputParamsIElements.find(x => x.data['outputParam'] === param.param);
                        if (!element) continue;
                        getModelingModule(bpmnJS).connect(element, element);
                    }
                }
            })
    }

    const applyErrorGatewayEntranceConnection = (evt: IConnectionCreatePostExecutedEvent, e: ErrorGatewayEvent) => {
        if (typeof e !== 'number') return;
        let config = injector.get(PROCESS_BUILDER_CONFIG_TOKEN);
        getModelingModule(bpmnJS).updateLabel(evt.context.connection, e === ErrorGatewayEvent.Success ? config.errorGatewayConfig.successConnectionName : config.errorGatewayConfig.errorConnectionName);
    }

    const applyFunctionImplementationConfig = (taskCreationComponentOutput: ITaskCreationComponentOutput) => {

        if (!taskCreationComponentOutput.config.element || !taskCreationComponentOutput.value) return;

        let value = taskCreationComponentOutput.value as IEmbeddedFunctionImplementationData;
        getModelingModule(bpmnJS).updateLabel(taskCreationComponentOutput.config.element, value.name);

        let funcStore = injector.get(FUNCTION_STORE_TOKEN), paramStore = injector.get(PARAM_STORE_TOKEN);
        combineLatest([
            paramStore.select(fromIParmSelector.selectNextId()),
            funcStore.select(fromIFunctionSelector.selectNextId()),
            funcStore.select(fromIFunctionSelector.selectIFunction(taskCreationComponentOutput.config.element.data))
        ]).pipe(take(1)).subscribe(([paramId, funcId, existingFun]: [number, number, (IFunction | undefined | null)]) => {

            let methodEvaluation = CodemirrorRepository.evaluateCustomMethod(undefined, value.implementation);

            let outputParamId: number | null = paramId;

            if (existingFun) {

                if (methodEvaluation === MethodEvaluationStatus.ReturnValueFound) {

                    if (typeof existingFun.output?.param === 'number') outputParamId = existingFun.output?.param;
                    let param = {
                        'name': value.outputParamName,
                        'normalizedName': value.normalizedOutputParamName,
                        'identifier': outputParamId,
                        'value': value.outputParamValue
                    } as IParam;

                    if (typeof existingFun.output?.param === 'number') {
                        paramStore.dispatch(updateIParam(param));
                        let fileShape = (taskCreationComponentOutput.config.element as IElement).outgoing.map(x => x.target).find(x => x.type === shapeTypes.DataObjectReference && x.data?.outputParam === param.identifier);
                        if (fileShape) getModelingModule(bpmnJS).updateLabel(fileShape, param.name);
                    }
                    else {
                        paramStore.dispatch(addIParam(param));
                        let fileShape = getModelingModule(bpmnJS).appendShape(taskCreationComponentOutput.config.element, {
                            type: shapeTypes.DataObjectReference,
                            data: {
                                'outputParam': outputParamId
                            }
                        }, { x: taskCreationComponentOutput.config.element.x + 50, y: taskCreationComponentOutput.config.element.y - 60 });
                        getModelingModule(bpmnJS).updateLabel(fileShape, param.name);
                    }

                } else if (typeof existingFun.output?.param === 'number') {

                    getModelingModule(bpmnJS).removeElements((taskCreationComponentOutput.config.element as IElement).outgoing.map(x => x.target).filter(x => x.type === shapeTypes.DataObjectReference));
                    paramStore.dispatch(removeIParam(existingFun.output.param));
                    outputParamId = null;

                }

            } else if (methodEvaluation === MethodEvaluationStatus.ReturnValueFound) {

                let param = {
                    'name': value.outputParamName,
                    'normalizedName': value.normalizedOutputParamName,
                    'identifier': outputParamId,
                    'value': value.outputParamValue
                } as IParam;
                paramStore.dispatch(addIParam(param));

                let fileShape = getModelingModule(bpmnJS).appendShape(taskCreationComponentOutput.config.element, {
                    type: shapeTypes.DataObjectReference,
                    data: {
                        'outputParam': outputParamId
                    }
                }, { x: taskCreationComponentOutput.config.element.x + 50, y: taskCreationComponentOutput.config.element.y - 60 });
                getModelingModule(bpmnJS).updateLabel(fileShape, param.name);

            }

            let func: IFunction = {
                'customImplementation': value.implementation,
                'canFail': value.canFail,
                'name': value.name,
                'identifier': typeof taskCreationComponentOutput.config.element.data !== 'number' ? funcId : taskCreationComponentOutput.config.element.data,
                'normalizedName': value.normalizedName,
                'output': methodEvaluation === MethodEvaluationStatus.ReturnValueFound && outputParamId ? { param: outputParamId } : null,
                'pseudoImplementation': () => { },
                'inputParams': null,
                'requireCustomImplementation': false
            };

            if (typeof taskCreationComponentOutput.config.element.data !== 'number') {
                funcStore.dispatch(addIFunction(func));
                taskCreationComponentOutput.config.element.data = funcId;
            } else funcStore.dispatch(updateIFunction(func));

            if (func.canFail) {
                let config = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
                let gatewayShape = getModelingModule(bpmnJS).appendShape(taskCreationComponentOutput.config.element, {
                    type: shapeTypes.ExclusiveGateway,
                    data: {
                        'gatewayType': 'error_gateway'
                    }
                }, { x: taskCreationComponentOutput.config.element.x + 200, y: taskCreationComponentOutput.config.element.y + 40 });
                getModelingModule(bpmnJS).updateLabel(gatewayShape, config.errorGatewayConfig.gatewayName);
            }

        });
    }

    const handleTaskCreationComponentOutput = (taskCreationComponentOutput: ITaskCreationComponentOutput) => {

        switch (taskCreationComponentOutput.config.taskCreationStep) {

            case TaskCreationStep.ConfigureErrorGatewayEntranceConnection:
                applyErrorGatewayEntranceConnection(taskCreationComponentOutput.config.payload, taskCreationComponentOutput.value);
                break;

            case TaskCreationStep.ConfigureFunctionSelection:
                applyFunctionSelectionConfig(taskCreationComponentOutput);
                break;

            case TaskCreationStep.ConfigureFunctionImplementation:
                applyFunctionImplementationConfig(taskCreationComponentOutput);
                break;

            case TaskCreationStep.ConfigureFunctionOutput:
                applyFunctionImplementationConfig(taskCreationComponentOutput);
                break;

        }

    }

}
