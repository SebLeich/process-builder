import { Injector } from "@angular/core";
import { buffer, combineLatest, debounceTime, filter, of, ReplaySubject, Subject, switchMap, take, timer } from "rxjs";
import bpmnJsEventTypes from "../bpmn-io/bpmn-js-event-types";
import bpmnJsModules from "../bpmn-io/bpmn-js-modules";
import { getElementRegistryModule, getModelingModule } from "../bpmn-io/bpmn-modules";
import { IConnectionCreatePostExecutedEvent } from "../bpmn-io/i-connection-create-post-executed-event";
import { IConnector } from "../bpmn-io/i-connector";
import { IDirectEditingEvent } from "../bpmn-io/i-direct-editing-event";
import { IElement } from "../bpmn-io/i-element";
import { IEvent } from "../bpmn-io/i-event";
import { IShapeDeleteExecutedEvent } from "../bpmn-io/i-shape-delete-executed-event";
import shapeTypes from "../bpmn-io/shape-types";
import { ITaskCreationData, ITaskCreationPayload } from "../process-builder/components/dialog/task-creation/i-task-creation-component-input";
import defaultImplementation from "../process-builder/globals/default-implementation";
import { ErrorGatewayEvent } from "../process-builder/globals/error-gateway-event";
import { IFunction } from "../process-builder/globals/i-function";
import { IParam } from "../process-builder/globals/i-param";
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from "../process-builder/globals/i-process-builder-config";
import { ITaskCreationConfig } from "../process-builder/globals/i-task-creation-config";
import { MethodEvaluationStatus } from "../process-builder/globals/method-evaluation-status";
import sebleichProcessBuilderExtension from "../process-builder/globals/sebleich-process-builder-extension";
import { TaskCreationStep } from "../process-builder/globals/task-creation-step";
import { DialogService } from "../process-builder/services/dialog.service";
import { addIFunction, updateIFunction } from "../process-builder/store/actions/i-function.actions";
import { removeIParam, updateIParam, upsertIParam, upsertIParams } from "../process-builder/store/actions/i-param.actions";
import { FUNCTION_STORE_TOKEN } from "../process-builder/store/reducers/i-function.reducer";
import { PARAM_STORE_TOKEN } from "../process-builder/store/reducers/i-param.reducer";
import * as fromIFunctionSelector from "../process-builder/store/selectors/i-function.selector";
import * as fromIParmSelector from "../process-builder/store/selectors/i-param.selectors";
import { BPMNJsRepository } from "./bpmn-js-repository";
import { CodemirrorRepository } from "./codemirror-repository";
import { ProcessBuilderRepository } from "./process-builder-repository";

export const validateBPMNConfig = (bpmnJS: any, injector: Injector) => {

    let validationFinishedSubject = new Subject<void>();
    let taskCreationSubject = new Subject<ITaskCreationConfig>();
    taskCreationSubject.pipe(
        buffer(taskCreationSubject.pipe(debounceTime(100))),
        filter(x => x.length > 0),
        switchMap((val: ITaskCreationConfig[]) => {
            let functionIdentifier: null | number = val.find(x => x.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection)?.element?.data ?? null;
            let inputData: ITaskCreationPayload = {
                configureActivity: val.find(x => x.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection)?.element,
                configureIncomingErrorGatewaySequenceFlow: val.find(x => x.taskCreationStep === TaskCreationStep.ConfigureErrorGatewayEntranceConnection)?.element
            }, initialValue = {
                functionIdentifier: functionIdentifier
            } as ITaskCreationData;
            return combineLatest([
                injector.get(DialogService).configTaskCreation({ data: initialValue, payload: inputData }, bpmnJS),
                of(inputData)
            ]).pipe(take(1));
        }))
        .subscribe(([data, payload]: [ITaskCreationData, ITaskCreationPayload]) => handleTaskCreationComponentOutput(data, payload));

    let config: IProcessBuilderConfig = injector.get<IProcessBuilderConfig>(PROCESS_BUILDER_CONFIG_TOKEN);
    let _connectionCreatePostExecutedActions: { [key: string]: (evt: IConnectionCreatePostExecutedEvent) => void } = {};
    let _directEditingActivateActions: { [key: string]: (evt: IDirectEditingEvent) => void } = {};
    let _shapeAddedActions: { [key: string]: (evt: IEvent) => void } = {};
    let _shapeDeleteExecutedActions: { [key: string]: (evt: IShapeDeleteExecutedEvent) => void } = {};

    _connectionCreatePostExecutedActions[shapeTypes.SequenceFlow] = (evt: IConnectionCreatePostExecutedEvent) => {
        if (evt.context.source.type !== shapeTypes.ExclusiveGateway || !evt.context.source.data || evt.context.source.data['gatewayType'] !== 'error_gateway') return;
        if (!taskCreationSubject) taskCreationSubject = new ReplaySubject<ITaskCreationConfig>(1);
        taskCreationSubject.next({
            taskCreationStep: TaskCreationStep.ConfigureErrorGatewayEntranceConnection,
            element: evt.context.connection
        });
    }

    _directEditingActivateActions[shapeTypes.Task] = (evt: IDirectEditingEvent) => {
        bpmnJS.get(bpmnJsModules.DirectEditing).cancel();
        if (!taskCreationSubject) taskCreationSubject = new ReplaySubject<ITaskCreationConfig>(1);
        taskCreationSubject.next({
            taskCreationStep: TaskCreationStep.ConfigureFunctionSelection,
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

    const handleTaskCreationComponentOutput = (taskCreationComponentOutput: ITaskCreationData, payload: ITaskCreationPayload): void => {

        if (!taskCreationComponentOutput) {
            if (!payload.configureActivity || typeof payload.configureActivity?.data !== 'number') getModelingModule(bpmnJS).removeElements([payload.configureActivity!]);
            return;
        }

        let config = injector.get(PROCESS_BUILDER_CONFIG_TOKEN), modelingModule = getModelingModule(bpmnJS), funcStore = injector.get(FUNCTION_STORE_TOKEN), paramStore = injector.get(PARAM_STORE_TOKEN);

        if (typeof taskCreationComponentOutput.entranceGatewayType === 'number') {
            let connector: IConnector | null = payload.configureIncomingErrorGatewaySequenceFlow ?? null;
            if (connector) modelingModule.updateLabel(connector, taskCreationComponentOutput.entranceGatewayType === ErrorGatewayEvent.Success ? config.errorGatewayConfig.successConnectionName : config.errorGatewayConfig.errorConnectionName);
        }

        let inputParams = taskCreationComponentOutput.implementation ? CodemirrorRepository.getUsedInputParams(undefined, taskCreationComponentOutput.implementation) : [];

        combineLatest([
            funcStore.select(fromIFunctionSelector.selectIFunction(taskCreationComponentOutput.functionIdentifier)),
            paramStore.select(fromIParmSelector.selectNextId()),
            funcStore.select(fromIFunctionSelector.selectNextId()),
            paramStore.select(fromIParmSelector.selectIParamsByNormalizedName(inputParams.filter(x => x.varName === 'injector' && typeof x.propertyName === 'string').map(x => x.propertyName!)))
        ])
            .pipe(
                take(1),
                switchMap(([func, paramId, funcId, usedInputParams]: [(IFunction | undefined | null), number, number, IParam[]]) => {
                    return combineLatest([of(func), of(paramId), of(funcId), of(usedInputParams), paramStore.select(fromIParmSelector.selectIParam(func?.output?.param))]);
                }),
                take(1)
            )
            .subscribe(([func, paramId, funcId, usedInputParams, outputParam]: [(IFunction | undefined | null), number, number, IParam[], IParam | 'dynamic' | undefined | null]) => {

                if (!func) {

                    if (payload.configureActivity && typeof payload.configureActivity?.data !== 'number') {
                        getModelingModule(bpmnJS).removeElements([payload.configureActivity]);
                    }
                    return;

                }

                let type = typeof func.output?.param;
                let f: IFunction = func!, outputParamId: number = type === 'number' ? func.output?.param as number : paramId;
                if (func.requireCustomImplementation || func.customImplementation) {

                    let methodEvaluation = CodemirrorRepository.evaluateCustomMethod(undefined, taskCreationComponentOutput.implementation ?? defaultImplementation);
                    if (methodEvaluation === MethodEvaluationStatus.ReturnValueFound) {

                        outputParam = {
                            'identifier': outputParamId,
                            'name': taskCreationComponentOutput.outputParamName ?? config.dynamicParamDefaultNaming,
                            'normalizedName': taskCreationComponentOutput.normalizedOutputParamName ?? ProcessBuilderRepository.normalizeName(taskCreationComponentOutput.outputParamName ?? config.dynamicParamDefaultNaming),
                            'value': taskCreationComponentOutput.outputParamValue ?? []
                        };
                        paramStore.dispatch(upsertIParam(outputParam));

                    } else if (outputParam && outputParam !== 'dynamic') paramStore.dispatch(removeIParam(outputParam));

                    f = {
                        'customImplementation': taskCreationComponentOutput.implementation ?? [],
                        'canFail': taskCreationComponentOutput.canFail ?? false,
                        'name': taskCreationComponentOutput.name ?? config.defaultFunctionName,
                        'identifier': func.requireCustomImplementation ? funcId : func.identifier,
                        'normalizedName': taskCreationComponentOutput.normalizedName ?? ProcessBuilderRepository.normalizeName(taskCreationComponentOutput.name ?? undefined),
                        'output': methodEvaluation === MethodEvaluationStatus.ReturnValueFound ? { param: outputParamId } : null,
                        'pseudoImplementation': () => { },
                        'inputParams': usedInputParams.map(x => {
                            return { 'optional': false, 'param': x.identifier }
                        }),
                        'requireCustomImplementation': false
                    };

                    func.requireCustomImplementation ? funcStore.dispatch(addIFunction(f)) : funcStore.dispatch(updateIFunction(f));

                }

                if (payload.configureActivity) {

                    BPMNJsRepository.updateBpmnElementSLPBExtension(bpmnJS, payload.configureActivity.businessObject, 'ActivityExtension', (e: any) => e.activityFunctionId = f.identifier);

                    getModelingModule(bpmnJS).updateLabel(payload.configureActivity, f.name);

                    payload.configureActivity.data = f.identifier;
                    payload.configureActivity.businessObject.data = f.identifier;

                    if (outputParam && outputParam !== 'dynamic') BPMNJsRepository.appendOutputParam(bpmnJS, payload.configureActivity!, outputParam);
                    else modelingModule.removeElements(payload.configureActivity.outgoing.filter(x => x.type === shapeTypes.DataOutputAssociation).map(x => x.target));

                    var gatewayShape = payload.configureActivity.outgoing.find(x => x.type === shapeTypes.SequenceFlow && x.target?.data?.gatewayType === 'error_gateway')?.target;
                    if (f.canFail && !gatewayShape) {

                        // remove outgoing sequence flows
                        let outgoingSequenceFlows = payload.configureActivity.outgoing.filter(x => x.type === shapeTypes.SequenceFlow);
                        let formerConnectedTargets = outgoingSequenceFlows.map(x => x.target);
                        modelingModule.removeElements(outgoingSequenceFlows);

                        gatewayShape = modelingModule.appendShape(payload.configureActivity, {
                            type: shapeTypes.ExclusiveGateway,
                            data: {
                                'gatewayType': 'error_gateway'
                            }
                        }, { x: payload.configureActivity.x + 200, y: payload.configureActivity.y + 40 });

                        BPMNJsRepository.updateBpmnElementSLPBExtension(bpmnJS, gatewayShape.businessObject, 'GatewayExtension', (e: any) => e.gatewayType = 'error_gateway');

                        modelingModule.updateLabel(gatewayShape, config.errorGatewayConfig.gatewayName);

                        // reconnect the former connected targets
                        for (let formerConnectedTarget of formerConnectedTargets) {
                            modelingModule.connect(gatewayShape, formerConnectedTarget);
                        }

                    } else if (!f.canFail && gatewayShape) modelingModule.removeElements([gatewayShape]);

                    modelingModule.removeElements(payload.configureActivity.incoming.filter(x => x.type === shapeTypes.DataInputAssociation));
                    if (f.inputParams) {
                        let inputParams = Array.isArray(f.inputParams) ? f.inputParams : [f.inputParams];
                        let availableInputParamsIElements = BPMNJsRepository.getAvailableInputParamsIElements(payload.configureActivity);
                        for (let param of inputParams.filter(x => !(payload.configureActivity as IElement).incoming.some(y => y.source.data?.outputParam === x.param))) {
                            let element = availableInputParamsIElements.find(x => x.data['outputParam'] === param.param);
                            if (!element) continue;
                            modelingModule.connect(element, payload.configureActivity);
                        }
                    }

                    validationFinishedSubject.next();
                }

            });

    }

    return validationFinishedSubject.pipe(debounceTime(500));

}
