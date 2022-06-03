import { Pipe, PipeTransform } from '@angular/core';
import { TaskCreationStep } from '../globals/task-creation-step';

@Pipe({
  name: 'taskCreationStep'
})
export class TaskCreationStepPipe implements PipeTransform {

  config: string[] = [];

  constructor(){
    this.config[TaskCreationStep.ConfigureErrorGatewayEntranceConnection] = 'error input: event type';
    this.config[TaskCreationStep.ConfigureFunctionSelection] = 'select functions';
    this.config[TaskCreationStep.ConfigureFunctionImplementation] = 'implementation';
  }

  transform(value: TaskCreationStep): string {
    return this.config[value];
  }

}
