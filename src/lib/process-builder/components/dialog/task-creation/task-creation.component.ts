import { Component, Inject, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject, combineLatest, map, Observable, of, ReplaySubject, switchMap, take } from 'rxjs';
import { IElement } from 'src/lib/bpmn-io/i-element';
import { BPMNJsRepository } from 'src/lib/core/bpmn-js-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { IFunction } from 'src/lib/process-builder/globals/i-function';
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

  stepRegistry: { type: Type<IEmbeddedView<any>>, provideInputParams?: (component: IEmbeddedView<any>, element: IElement) => void }[] = [];
  values: ITaskCreationComponentOutput[] = [];

  currentStepIndex: number = 0;

  private _steps: ReplaySubject<ITaskCreationConfig[]> = new ReplaySubject<ITaskCreationConfig[]>(1);
  private _requireCustomFunctionImplementation = new BehaviorSubject<boolean>(false);
  steps$ = combineLatest([this._steps.asObservable(), this._requireCustomFunctionImplementation.asObservable()])
    .pipe(
      map(([steps, requireCustomFunctionImplementation]: [ITaskCreationConfig[], boolean]) => {
        let availableSteps: ITaskCreationConfig[] = [...steps];
        if (requireCustomFunctionImplementation) availableSteps.push({ 'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation } as ITaskCreationConfig);
        return availableSteps;
      })
    ) as Observable<ITaskCreationConfig[]>;

  constructor(
    private _ref: MatDialogRef<TaskCreationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ITaskCreationComponentInput
  ) {
    this._steps.next(data.steps);
  }

  abort = () => this._ref.close(this.values.map(x => {
    return { 'config': x.config, 'value': undefined } as ITaskCreationComponentOutput
  }));
  finish = () => this._ref.close(this.values);

  ngOnInit(): void {
    this.stepRegistry[TaskCreationStep.ConfigureErrorGatewayEntranceConnection] = { type: EmbeddedConfigureErrorGatewayEntranceConnectionComponent };
    this.stepRegistry[TaskCreationStep.ConfigureFunctionSelection] = {
      type: EmbeddedFunctionSelectionComponent,
      provideInputParams: (arg: IEmbeddedView<any>, element: IElement) => {
        let component = arg as EmbeddedFunctionSelectionComponent;
        component.inputParams = BPMNJsRepository.getAvailableInputParams(element)
      }
    };
    this.stepRegistry[TaskCreationStep.ConfigureFunctionImplementation] = { type: EmbeddedFunctionImplementationComponent };
    for (let step of this.data.steps) this.values.push({ 'config': step, 'value': undefined });
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

        this.values.find(x => x.config === step)!.value = value;
        let nextIndex = index + 1;

        if (step.taskCreationStep === TaskCreationStep.ConfigureFunctionSelection) {
          let requireCustomImplementation = (value as IFunction).requireCustomImplementation === true, existingImplementation = this.values.find(x => x.config.taskCreationStep === TaskCreationStep.ConfigureFunctionImplementation);
          this._requireCustomFunctionImplementation.next(requireCustomImplementation);
          if (requireCustomImplementation && !existingImplementation) this.values.push({ 'config': { 'taskCreationStep': TaskCreationStep.ConfigureFunctionImplementation } as ITaskCreationConfig, 'value': undefined });
          else if (!requireCustomImplementation && existingImplementation) {
            let index = this.values.indexOf(existingImplementation);
            if (index > -1) this.values.splice(index, 1);
          }
          if (requireCustomImplementation) this.setStep(nextIndex);
          else if (this.finished) this.finish();
        }
        else {
          if (this.finished) this.finish();
          else if (nextIndex < steps.length) {
            this.setStep(nextIndex);
          }
        }
      });
    });
  }

  get finished() {
    return !this.unfinished;
  }

  get unfinished() {
    console.log(this.values.map(x => x.value));
    return this.values.some(x => typeof x.value === 'undefined');
  }

}
