import { Component, Inject, OnInit, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from 'src/lib/process-builder/globals/i-function';
import { ITaskCreationConfig } from 'src/lib/process-builder/globals/i-task-creation-config';
import { TaskCreationStep } from 'src/lib/process-builder/globals/task-creation-step';
import { EmbeddedConfigureErrorGatewayEntranceConnectionComponent } from '../../embedded/embedded-configure-error-gateway-entrance-connection/embedded-configure-error-gateway-entrance-connection.component';
import { EmbeddedFunctionSelectionComponent } from '../../embedded/embedded-function-selection/embedded-function-selection.component';
import { ITaskCreationComponentOutput } from './i-task-creation-component-output';

@Component({
  selector: 'app-task-creation',
  templateUrl: './task-creation.component.html',
  styleUrls: ['./task-creation.component.sass']
})
export class TaskCreationComponent implements OnInit {

  @ViewChild('dynamicInner', { static: true, read: ViewContainerRef }) dynamicInner!: ViewContainerRef;

  stepRegistry: Type<IEmbeddedView<any>>[] = [];
  values: ITaskCreationComponentOutput[] = [];

  constructor(
    private _ref: MatDialogRef<TaskCreationComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ITaskCreationConfig[]
  ) { }

  abort = () => this._ref.close();
  finish = () => this._ref.close(this.values);

  ngOnInit(): void {
    this.stepRegistry[TaskCreationStep.ConfigureErrorGatewayEntranceConnection] = EmbeddedConfigureErrorGatewayEntranceConnectionComponent;
    this.stepRegistry[TaskCreationStep.ConfigureFunctionSelection] = EmbeddedFunctionSelectionComponent;
    for (let i = 0; i < this.data.length; i++) this.values[i] = { 'config': this.data[i], 'value': undefined };
    this.setStep(0);
  }

  setStep(index: number) {
    this.dynamicInner.clear();
    let step = this.data[index];
    if (!this.stepRegistry[step.taskCreationStep]) {
      debugger;
      throw ('unregistered step');
    }
    let component = this.dynamicInner.createComponent(this.stepRegistry[step.taskCreationStep]);
    component.instance.valueChange.subscribe((value: any) => this.values[index].value = value);
  }

}
