import { Component, Inject, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, filter, map, Observable, of, ReplaySubject, switchMap, take } from 'rxjs';
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

@Component({
  selector: 'app-task-creation',
  templateUrl: './task-creation.component.html',
  styleUrls: ['./task-creation.component.sass']
})
export class TaskCreationComponent implements OnInit {

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
  steps$ = combineLatest([this._steps.asObservable(), this._hasCustomImplementation.asObservable()])
    .pipe(
      map(([steps, hasCustomImplementation]: [ITaskCreationConfig[], IElement | null]) => {
        let availableSteps: ITaskCreationConfig[] = [...steps];
        if (hasCustomImplementation) availableSteps.push({
          'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation,
          'element': hasCustomImplementation
        } as ITaskCreationConfig);
        return availableSteps;
      })
    ) as Observable<ITaskCreationConfig[]>;
  
  currentStep$ = combineLatest([this.steps$, this.currentStepIndex$]).pipe(map(([steps, index]) => steps[index]));

  constructor(
    private _ref: MatDialogRef<TaskCreationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ITaskCreationComponentInput,
    private _funcStore: Store<fromIFunction.State>,
    private _paramStore: Store<fromIParam.State>,
    private _httpClient: HttpClient
  ) {
    this._steps.next(data.steps);
  }

  abort = () => this._ref.close(this.values.map(x => {
    return { 'config': x.config, 'value': undefined } as ITaskCreationComponentOutput
  }));
  finish = () => this._ref.close(this.values);

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
        let component = arg as EmbeddedFunctionSelectionComponent;
        component.inputParams = BPMNJsRepository.getAvailableInputParams(element);
      }
    };
    for (let step of this.data.steps) {
      let preSelected: number | undefined = step.element?.data ?? undefined;
      this.values.push({ 'config': step, 'value': preSelected });
      if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection && preSelected) this.validateFunctionSelection(preSelected, step.element);
    }
    this.setStep(0);
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
      component.instance.valueChange.subscribe((value: any) => {

        this.values.find(x => x.config.taskCreationStep === step.taskCreationStep)!.value = value;
        let nextIndex = index + 1;

        if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection) this.validateFunctionSelection(value, step.element);

        if (this.stepRegistry[step.taskCreationStep].autoChangeTabOnValueEmission !== true) return;

        if (this.finished) this.finish();
        else if (nextIndex < steps.length) {
          this.setStep(nextIndex);
        }

      });
    });
  }

  testImplementation(){
    let customImplementation = this.values.find(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation);
    if(!customImplementation) return;
    ProcessBuilderRepository.testMethodAndGetResponse((customImplementation.value as IEmbeddedFunctionImplementationData).implementation, {
      'httpClient': this._httpClient
    });
  }

  validateFunctionSelection(preSelected: number, element: IElement) {

    this._funcStore.select(selectIFunction(preSelected)).pipe(
      take(1),
      filter(x => x ? true : false),
      switchMap((fun: IFunction | null | undefined) => combineLatest([of(fun), this._paramStore.select(selectIParam(fun?.output?.param))]))
    ).subscribe(([fun, outputParam]: [IFunction | null | undefined, IParam | null | undefined]) => {
      let hasCustomImplementation = fun && (fun.requireCustomImplementation === true || fun.customImplementation), existingImplementation = this.values.find(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation);
      this._hasCustomImplementation.next(hasCustomImplementation ? element : null);
      if (hasCustomImplementation && !existingImplementation) {
        this.values.push({
          'config': {
            'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation,
            'element': element
          } as ITaskCreationConfig,
          'value': {
            'implementation': fun?.customImplementation,
            'canFail': fun?.canFail,
            'name': fun?.name,
            'normalizedName': fun?.normalizedName,
            'outputParamName': outputParam?.name,
            'normalizedOutputParamName': outputParam?.normalizedName
          } as IEmbeddedFunctionImplementationData
        });
      }
      else if (!hasCustomImplementation && existingImplementation) {
        let index = this.values.indexOf(existingImplementation);
        if (index > -1) this.values.splice(index, 1);
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
