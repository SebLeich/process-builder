import { Injector } from "@angular/core";
import { Store } from "@ngrx/store";
import { buffer, combineLatest, debounceTime, filter, ReplaySubject, Subject, take, timer } from "rxjs";
import { ParamCodes } from "src/config/param-codes";
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
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from "../process-builder/globals/i-function";
import { IFunctionSelectionModelingData } from "../process-builder/globals/i-function-selection-modeling-data";
import { IParam } from "../process-builder/globals/i-param";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import { ITaskCreationConfig } from "../process-builder/globals/i-task-creation-config";
import { MethodEvaluationStatus } from "../process-builder/globals/method-evaluation-status";
import { TaskCreationStep } from "../process-builder/globals/task-creation-step";
import { ParamPipe } from "../process-builder/pipes/param.pipe";
import { DialogService } from "../process-builder/services/dialog.service";
import { addIFunction } from "../process-builder/store/actions/i-function.actions";
import { addIParam } from "../process-builder/store/actions/i-param.actions";
import { I_FUNCTION_STORE_TOKEN } from "../process-builder/store/reducers/i-function.reducer";
import { I_PARAM_STORE_TOKEN, State } from "../process-builder/store/reducers/i-param.reducer";
import { selectIFunction, selectNextId } from "../process-builder/store/selectors/i-function.selector";
import { BPMNJsRepository } from "./bpmn-js-repository";
import { CodemirrorRepository } from "./codemirror-repository";
import { ProcessBuilderRepository } from "./process-builder-repository";

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

    const applyFunctionSelectionConfig = (evt: IDirectEditingEvent, functionIdentifier: number | null | undefined) => {
        let f: IFunction = injector.get(FUNCTIONS_CONFIG_TOKEN).find(x => x.identifier === functionIdentifier)!;
        if (!f) {
            if (!(typeof (evt.active.element.data as IFunctionSelectionModelingData)?.functionIdentifier === 'number')) {
                getModelingModule(bpmnJS).removeElements([evt.active.element]);
            }
            return;
        }

        getModelingModule(bpmnJS).updateLabel(evt.active.element, f.name);
        let data = {
            functionIdentifier: f.identifier,
            customImplementation: evt.active?.element?.data?.customImplementation ?? undefined
        } as IFunctionSelectionModelingData;
        evt.active.element.data = data;

        if (f.output && !(f.output.param === 'dynamic')) {
            let outputParamCode = f.output.param;
            let fileShape = getModelingModule(bpmnJS).appendShape(evt.active.element, {
                type: shapeTypes.DataObjectReference,
                data: {
                    'outputParam': outputParamCode
                }
            }, { x: evt.active.element.x + 50, y: evt.active.element.y - 60 });
            injector.get(ParamPipe).transform(outputParamCode).subscribe(paramName => getModelingModule(bpmnJS).updateLabel(fileShape, paramName));
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

    const applyErrorGatewayEntranceConnection = (evt: IConnectionCreatePostExecutedEvent, e: ErrorGatewayEvent) => {
        if (typeof e !== 'number') return;
        let config = injector.get(PROCESS_BUILDER_CONFIG_TOKEN);
        getModelingModule(bpmnJS).updateLabel(evt.context.connection, e === ErrorGatewayEvent.Success ? config.errorGatewayConfig.successConnectionName : config.errorGatewayConfig.errorConnectionName);
    }

    const handleTaskCreationComponentOutput = (taskCreationComponentOutput: ITaskCreationComponentOutput) => {

        switch (taskCreationComponentOutput.config.taskCreationStep) {

            case TaskCreationStep.ConfigureErrorGatewayEntranceConnection:
                applyErrorGatewayEntranceConnection(taskCreationComponentOutput.config.payload, taskCreationComponentOutput.value);
                break;

            case TaskCreationStep.ConfigureFunctionSelection:
                applyFunctionSelectionConfig(taskCreationComponentOutput.config.payload, taskCreationComponentOutput.value);
                break;

            case TaskCreationStep.ConfigureFunctionImplementation:
                if (!taskCreationComponentOutput.config.element) return;
                if (!taskCreationComponentOutput.config.element.data) taskCreationComponentOutput.config.element.data = {
                    functionIdentifier: undefined,
                    customImplementation: undefined
                } as IFunctionSelectionModelingData;

                taskCreationComponentOutput.config.element.data.customImplementation = taskCreationComponentOutput.value;

                let value = taskCreationComponentOutput.value as IEmbeddedFunctionImplementationData;

                let store = injector.get(I_FUNCTION_STORE_TOKEN);
                combineLatest([
                    store.select(selectIFunction(taskCreationComponentOutput.config.element.data.functionIdentifier)),
                    store.select(selectNextId())
                ]).pipe(take(1)).subscribe((arr) => {

                    let outputParamCode: number | null = null;
                    let methodEvaluation = CodemirrorRepository.evaluateCustomMethod(undefined, value.implementation);

                    if (methodEvaluation === MethodEvaluationStatus.ReturnValueFound) {
                        outputParamCode = Math.max(...(Object.values(ParamCodes).filter(x => typeof x === 'number') as number[]), -1) + 1;
                        let param = {
                            'name': value.outputParamName,
                            'normalizedName': value.normalizedOutputParamName,
                            'processTypeIdentifier': outputParamCode,
                            'value': []
                        } as IParam;
                        let paramStore: Store<State> = injector.get(I_PARAM_STORE_TOKEN);
                        paramStore.dispatch(addIParam(param))

                        let fileShape = getModelingModule(bpmnJS).appendShape(taskCreationComponentOutput.config.element, {
                            type: shapeTypes.DataObjectReference,
                            data: {
                                'outputParam': outputParamCode
                            }
                        }, { x: taskCreationComponentOutput.config.element.x + 50, y: taskCreationComponentOutput.config.element.y - 60 });
                        injector.get(ParamPipe).transform(outputParamCode).subscribe(paramName => getModelingModule(bpmnJS).updateLabel(fileShape, paramName));
                    
                    } else {

                        let removeElements = (taskCreationComponentOutput.config.element as IElement)
                            .outgoing
                            ?.map(x => x.target)
                            .filter(x => x.type === shapeTypes.DataObjectReference) ?? [];

                        getModelingModule(bpmnJS).removeElements(removeElements);
                    }

                    let func = arr[0];
                    if (func?.requireCustomImplementation) {
                        func = {
                            'customImplementation': value.implementation,
                            'canFail': value.canFail,
                            'name': value.name,
                            'identifier': arr[1],
                            'normalizedName': value.normalizedName,
                            'output': outputParamCode? { 'param': outputParamCode }: null,
                            'pseudoImplementation': () => { },
                            'inputParams': null,
                            'requireCustomImplementation': false
                        };
                        store.dispatch(addIFunction(func));
                    }

                });

                break;

        }

    }

}
