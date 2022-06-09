import { Component, Inject, OnDestroy, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, debounceTime, filter, interval, map, Observable, of, ReplaySubject, Subject, Subscription, switchMap, take } from 'rxjs';
import { IElement } from 'src/lib/bpmn-io/i-element';
import { BPMNJsRepository } from 'src/lib/core/bpmn-js-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { ITaskCreationConfig } from 'src/lib/process-builder/globals/i-task-creation-config';
import { TaskCreationStep } from 'src/lib/process-builder/globals/task-creation-step';
import { EmbeddedConfigureErrorGatewayEntranceConnectionComponent } from '../../embedded/embedded-configure-error-gateway-entrance-connection/embedded-configure-error-gateway-entrance-connection.component';
import { EmbeddedFunctionImplementationComponent } from '../../embedded/embedded-function-implementation/embedded-function-implementation.component';
import { EmbeddedFunctionSelectionComponent } from '../../embedded/embedded-function-selection/embedded-function-selection.component';
import { ITaskCreationComponentInput } from './i-task-creation-component-input';
import { ITaskCreationComponentOutput } from './i-task-creation-component-output';
import * as fromIFunction from 'src/lib/process-builder/store/reducers/i-function.reducer';
import * as fromIParam from 'src/lib/process-builder/store/reducers/i-param.reducer';
import { selectIFunction } from 'src/lib/process-builder/store/selectors/i-function.selector';
import { IEmbeddedFunctionImplementationData } from '../../embedded/embedded-function-implementation/i-embedded-function-implementation-output';
import { IFunction } from 'src/lib/process-builder/globals/i-function';
import { selectIParam } from 'src/lib/process-builder/store/selectors/i-param.selectors';
import { IParam } from 'src/lib/process-builder/globals/i-param';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { HttpClient } from '@angular/common/http';
import { EmbeddedParamEditorComponent } from '../../embedded/embedded-param-editor/embedded-param-editor.component';
import { CodemirrorRepository } from 'src/lib/core/codemirror-repository';
import { MethodEvaluationStatus } from 'src/lib/process-builder/globals/method-evaluation-status';
import { FormBuilder, FormGroup } from '@angular/forms';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';

@Component({
  selector: 'app-task-creation',
  templateUrl: './task-creation.component.html',
  styleUrls: ['./task-creation.component.sass']
})
export class TaskCreationComponent implements OnDestroy, OnInit {

  @ViewChild('dynamicInner', { static: true, read: ViewContainerRef }) dynamicInner!: ViewContainerRef;

  stepRegistry: {
    type: Type<IEmbeddedView<any>>,
    provideInputParams?: (component: IEmbeddedView<any>, element: IElement) => void,
    autoChangeTabOnValueEmission?: boolean
  }[] = [];
  values: ITaskCreationComponentOutput[] = [];

  private _currentStepIndex: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  currentStepIndex$ = this._currentStepIndex.asObservable();

  private _steps: ReplaySubject<ITaskCreationConfig[]> = new ReplaySubject<ITaskCreationConfig[]>(1);
  private _hasCustomImplementation = new BehaviorSubject<IElement | null>(null);
  private _hasOutputParam = new BehaviorSubject<boolean>(false);

  hasOutputParam$ = this._hasOutputParam.asObservable();
  steps$ = combineLatest([this._steps.asObservable(), this._hasCustomImplementation.asObservable()])
    .pipe(
      map(([steps, hasCustomImplementation]: [ITaskCreationConfig[], IElement | null]) => {
        let availableSteps: ITaskCreationConfig[] = [...steps];
        if (hasCustomImplementation) {
          availableSteps.push(...[
            {
              'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation,
              'element': hasCustomImplementation
            } as ITaskCreationConfig,
            {
              'taskCreationStep': TaskCreationStep.ConfigureFunctionOutput,
              'element': hasCustomImplementation,
              'disabled$': this.hasOutputParam$.pipe(map(x => x === true ? false : true))
            } as ITaskCreationConfig
          ]);
        }
        return availableSteps;
      })
    ) as Observable<ITaskCreationConfig[]>;

  currentStep$ = combineLatest([this.steps$, this.currentStepIndex$]).pipe(map(([steps, index]) => steps[index]));

  canAnalyzeCustomImplementation$ = this.currentStep$.pipe(map(x => x.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation || x.taskCreationStep === TaskCreationStep.ConfigureFunctionOutput));

  private _statusMessage: Subject<string> = new Subject<string>();
  statusMessage$ = combineLatest([this._statusMessage.asObservable(), this._statusMessage.pipe(switchMap(() => interval(1000)))])
    .pipe(map(([val, time]: [string, number]) => {
      return time < 5 ? val : null;
    }));

  formGroup!: FormGroup;

  private _lastStepSub: Subscription | undefined;
  private _subscriptions: Subscription[] = [];

  constructor(
    private _ref: MatDialogRef<TaskCreationComponent>,
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig,
    @Inject(MAT_DIALOG_DATA) public data: ITaskCreationComponentInput,
    private _funcStore: Store<fromIFunction.State>,
    private _paramStore: Store<fromIParam.State>,
    private _httpClient: HttpClient,
    private _formBuilder: FormBuilder
  ) {
    this.formGroup = this._formBuilder.group({
      'canFail': false,
      'implementation': null,
      'name': config.defaultFunctionName,
      'normalizedName': ProcessBuilderRepository.normalizeName(config.defaultFunctionName),
      'outputParamName': config.dynamicParamDefaultNaming,
      'normalizedOutputParamName': ProcessBuilderRepository.normalizeName(config.dynamicParamDefaultNaming),
      'outputParamValue': this._formBuilder.control(null),
    })
    this._steps.next(data.steps);
  }

  abort = () => this._ref.close(this.values.map(x => {
    return { 'config': x.config, 'value': undefined } as ITaskCreationComponentOutput
  }));
  finish() {
    for (let value of this.values.filter(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation || x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionOutput)) {
      value.value = this.formGroup.value;
    }
    this._ref.close(this.values);
  }

  ngOnDestroy(): void {
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  ngOnInit(): void {
    this.stepRegistry[TaskCreationStep.ConfigureErrorGatewayEntranceConnection] = {
      type: EmbeddedConfigureErrorGatewayEntranceConnectionComponent
    };
    this.stepRegistry[TaskCreationStep.ConfigureFunctionSelection] = {
      type: EmbeddedFunctionSelectionComponent,
      provideInputParams: (arg: IEmbeddedView<any>, element: IElement) => {
        let component = arg as EmbeddedFunctionSelectionComponent;
        component.inputParams = BPMNJsRepository.getAvailableInputParams(element);
      }
    };
    this.stepRegistry[TaskCreationStep.ConfigureFunctionImplementation] = {
      type: EmbeddedFunctionImplementationComponent,
      provideInputParams: (arg: IEmbeddedView<any>, element: IElement) => {
        let component = arg as EmbeddedFunctionImplementationComponent;
        component.inputParams = BPMNJsRepository.getAvailableInputParams(element);
        component.formGroup = this.formGroup;
      }
    };
    this.stepRegistry[TaskCreationStep.ConfigureFunctionOutput] = {
      type: EmbeddedParamEditorComponent,
      provideInputParams: (arg: IEmbeddedView<any>, element: IElement) => {
        let component = arg as EmbeddedParamEditorComponent;
        component.formGroup = this.formGroup;
      }
    };
    for (let step of this.data.steps) {
      let preSelected: number | undefined = step.element?.data ?? undefined;
      this.values.push({ 'config': step, 'value': preSelected });
      if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection && preSelected) this.validateFunctionSelection(preSelected, step.element);
    }
    this.setStep(0);

    this._subscriptions.push(...[
      this.formGroup.controls['implementation'].valueChanges.pipe(debounceTime(2000)).subscribe(() => {
          let value = this.formGroup.controls['implementation'].value;
          let inputs = CodemirrorRepository.getUsedInputParams(undefined, value).map(x => x.propertyName).filter((x, index, array) => array.indexOf(x) === index);
          this._statusMessage.next(`input params: ${inputs.length === 0 ? '-' : inputs.join(', ')}`);
        })
    ]);
  }

  setStep(index: number) {
    this.steps$.pipe(take(1)).subscribe((steps: ITaskCreationConfig[]) => {
      this.dynamicInner.clear();
      this._currentStepIndex.next(index);
      let step = steps[index];
      if (!this.stepRegistry[step.taskCreationStep]) {
        debugger;
        throw ('unregistered step');
      }
      let component = this.dynamicInner.createComponent(this.stepRegistry[step.taskCreationStep].type);
      if (typeof this.stepRegistry[step.taskCreationStep].provideInputParams === 'function') this.stepRegistry[step.taskCreationStep].provideInputParams!(component.instance, step.element);

      component.instance.initialValue = this.values[index].value;

      if (this._lastStepSub) {
        this._lastStepSub.unsubscribe();
        this._lastStepSub = undefined;
      }

      this._lastStepSub = component.instance.valueChange.subscribe((value: any) => {

        this.values.find(x => x.config.taskCreationStep === step.taskCreationStep)!.value = value;
        let nextIndex = index + 1;

        if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection) this.validateFunctionSelection(value, step.element);
        if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation) {
          let evaluationResult = CodemirrorRepository.evaluateCustomMethod(undefined, (value as IEmbeddedFunctionImplementationData).implementation);
          this._hasOutputParam.next(evaluationResult === MethodEvaluationStatus.ReturnValueFound);
        }

        if (this.stepRegistry[step.taskCreationStep].autoChangeTabOnValueEmission !== true) return;

        if (this.finished) this.finish();
        else if (nextIndex < steps.length) {
          this.setStep(nextIndex);
        }

      });
    });
  }

  testImplementation() {
    let customImplementation = this.values.find(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation);
    if (!customImplementation) return;
    let result = ProcessBuilderRepository.testMethodAndGetResponse((customImplementation.value as IEmbeddedFunctionImplementationData).implementation, {
      'httpClient': this._httpClient
    });
    result.subscribe({
      'next': (result: any) => {
        let parsed: string = typeof result === 'object' ? JSON.stringify(result) : typeof result === 'number' ? result.toString() : result;
        this._statusMessage.next(`succeeded! received: ${parsed}`);
        this.formGroup.controls['outputParamValue'].setValue(ProcessBuilderRepository.extractObjectIParams(result));
      }
    });
  }

  validateFunctionSelection(preSelected: number, element: IElement) {
    this._funcStore.select(selectIFunction(preSelected)).pipe(
      take(1),
      filter(x => x ? true : false),
      switchMap((fun: IFunction | null | undefined) => combineLatest([of(fun), this._paramStore.select(selectIParam(fun?.output?.param))]))
    ).subscribe(([fun, outputParam]: [IFunction | null | undefined, IParam | null | undefined]) => {
      this.formGroup.patchValue({
        'canFail': fun?.canFail,
        'implementation': fun?.customImplementation,
        'name': fun?.name,
        'normalizedName': fun?.normalizedName,
        'normalizedOutputParamName': outputParam?.normalizedName,
        'outputParamName': outputParam?.name,
        'outputParamValue': outputParam?.value
      } as IEmbeddedFunctionImplementationData);
      let hasCustomImplementation = fun && (fun.requireCustomImplementation === true || fun.customImplementation), existingImplementation = this.values.find(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation), existingOutputConfig = this.values.find(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionOutput);
      this._hasCustomImplementation.next(hasCustomImplementation ? element : null);
      if (hasCustomImplementation && !existingImplementation) {
        this.values.push(...[{
          'config': {
            'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation,
            'element': element
          } as ITaskCreationConfig,
          'value': null
        }, {
          'config': {
            'taskCreationStep': TaskCreationStep.ConfigureFunctionOutput,
            'element': element
          } as ITaskCreationConfig,
          'value': null
        }]);
      }
      else if (!hasCustomImplementation) {
        if (existingImplementation) {
          let index = this.values.indexOf(existingImplementation);
          if (index > -1) this.values.splice(index, 1);
        }
        if (existingOutputConfig) {
          let index = this.values.indexOf(existingOutputConfig);
          if (index > -1) this.values.splice(index, 1);
        }
      }
    });
  }

  TaskCreationStep = TaskCreationStep;

  get finished() {
    return !this.unfinished;
  }

  get unfinished() {
    return this.values.some(x => typeof x.value === 'undefined');
  }

}
