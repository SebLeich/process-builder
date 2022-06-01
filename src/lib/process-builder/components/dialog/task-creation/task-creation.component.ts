import { Component, Inject, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IElement } from 'src/lib/bpmn-io/i-element';
import { BPMNJsRepository } from 'src/lib/core/bpmn-js-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { TaskCreationStep } from 'src/lib/process-builder/globals/task-creation-step';
import { EmbeddedConfigureErrorGatewayEntranceConnectionComponent } from '../../embedded/embedded-configure-error-gateway-entrance-connection/embedded-configure-error-gateway-entrance-connection.component';
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

  constructor(
    private _ref: MatDialogRef<TaskCreationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ITaskCreationComponentInput
  ) { }

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
    for (let i = 0; i < this.data.steps.length; i++) this.values[i] = { 'config': this.data.steps[i], 'value': undefined };
    this.setStep(this.currentStepIndex);
  }

  setStep(index: number) {
    this.dynamicInner.clear();
    this.currentStepIndex = index;
    let step = this.data.steps[index];
    if (!this.stepRegistry[step.taskCreationStep]) {
      debugger;
      throw ('unregistered step');
    }
    let component = this.dynamicInner.createComponent(this.stepRegistry[step.taskCreationStep].type);
    if (typeof this.stepRegistry[step.taskCreationStep].provideInputParams === 'function') this.stepRegistry[step.taskCreationStep].provideInputParams!(component.instance, step.element);
    component.instance.initialValue = this.values[index].value;
    component.instance.valueChange.subscribe((value: any) => {
      this.values[index].value = value;
      let nextIndex = index + 1;
      if (this.finished) this.finish();
      else if (nextIndex < this.data.steps.length) {
        this.setStep(nextIndex);
      }
    });
  }

  get finished() {
    return !this.unfinished;
  }

  get unfinished() {
    return this.values.some(x => typeof x.value === 'undefined');
  }

}
