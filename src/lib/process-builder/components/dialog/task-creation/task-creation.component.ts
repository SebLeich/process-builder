import { Component, Inject, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, map, Observable, of, ReplaySubject, switchMap, take } from 'rxjs';
import { IElement } from 'src/lib/bpmn-io/i-element';
import { BPMNJsRepository } from 'src/lib/core/bpmn-js-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from 'src/lib/process-builder/globals/i-function';
import { IFunctionSelectionModelingData } from 'src/lib/process-builder/globals/i-function-selection-modeling-data';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { ITaskCreationConfig } from 'src/lib/process-builder/globals/i-task-creation-config';
import { TaskCreationStep } from 'src/lib/process-builder/globals/task-creation-step';
import { EmbeddedConfigureErrorGatewayEntranceConnectionComponent } from '../../embedded/embedded-configure-error-gateway-entrance-connection/embedded-configure-error-gateway-entrance-connection.component';
import { EmbeddedFunctionImplementationComponent } from '../../embedded/embedded-function-implementation/embedded-function-implementation.component';
import { EmbeddedFunctionSelectionComponent } from '../../embedded/embedded-function-selection/embedded-function-selection.component';
import { ITaskCreationComponentInput } from './i-task-creation-component-input';
import { ITaskCreationComponentOutput } from './i-task-creation-component-output';

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

  currentStepIndex: number = 0;

  private _steps: ReplaySubject<ITaskCreationConfig[]> = new ReplaySubject<ITaskCreationConfig[]>(1);
  private _requireCustomFunctionImplementation = new BehaviorSubject<IElement | null>(null);
  steps$ = combineLatest([this._steps.asObservable(), this._requireCustomFunctionImplementation.asObservable()])
    .pipe(
      map(([steps, requireCustomFunctionImplementation]: [ITaskCreationConfig[], IElement | null]) => {
        let availableSteps: ITaskCreationConfig[] = [...steps];
        if (requireCustomFunctionImplementation) availableSteps.push({
          'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation,
          'element': requireCustomFunctionImplementation
        } as ITaskCreationConfig);
        return availableSteps;
      })
    ) as Observable<ITaskCreationConfig[]>;

  constructor(
    private _ref: MatDialogRef<TaskCreationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ITaskCreationComponentInput,
    @Inject(FUNCTIONS_CONFIG_TOKEN) private _functionsConfig: IFunction[]
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
      let preSelected: IFunctionSelectionModelingData | undefined = step.element?.data ?? undefined;
      this.values.push({ 'config': step, 'value': preSelected?.functionIdentifier });
      if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection && preSelected) this.validateFunctionSelection(preSelected, step.element);
    }
    this.setStep(this.currentStepIndex);
  }

  setStep(index: number) {
    this.steps$.pipe(take(1)).subscribe((steps: ITaskCreationConfig[]) => {
      this.dynamicInner.clear();
      this.currentStepIndex = index;
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

        if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection) this.validateFunctionSelection({ functionIdentifier: value }, step.element);

        if (this.stepRegistry[step.taskCreationStep].autoChangeTabOnValueEmission !== true) return;

        if (this.finished) this.finish();
        else if (nextIndex < steps.length) {
          this.setStep(nextIndex);
        }

      });
    });
  }

  validateFunctionSelection(preSelected: IFunctionSelectionModelingData, element: IElement) {
    let fun: IFunction = this._functionsConfig.find(x => x.identifier === preSelected.functionIdentifier)!;
    let requireCustomImplementation = fun && fun.requireCustomImplementation === true, existingImplementation = this.values.find(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation);
    this._requireCustomFunctionImplementation.next(requireCustomImplementation? element: null);
    if (requireCustomImplementation && !existingImplementation) {
      this.values.push({
        'config': {
          'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation,
          'element': element
        } as ITaskCreationConfig,
        'value': preSelected.customImplementation
      });
    }
    else if (!requireCustomImplementation && existingImplementation) {
      let index = this.values.indexOf(existingImplementation);
      if (index > -1) this.values.splice(index, 1);
    }
  }

  get finished() {
    return !this.unfinished;
  }

  get unfinished() {
    return this.values.some(x => typeof x.value === 'undefined');
  }

}
