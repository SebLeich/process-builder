import { Inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { ParamEditorComponent } from '../components/dialog/param-editor/param-editor.component';
import { ITaskCreationComponentInput } from '../components/dialog/task-creation/i-task-creation-component-input';
import { ITaskCreationComponentOutput } from '../components/dialog/task-creation/i-task-creation-component-output';
import { TaskCreationComponent } from '../components/dialog/task-creation/task-creation.component';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from '../globals/i-function';
import { ITaskCreationConfig } from '../globals/i-task-creation-config';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(
    private _dialog: MatDialog,
    @Inject(FUNCTIONS_CONFIG_TOKEN) public funcs: IFunction[]
  ) { }

  configTaskCreation(steps: ITaskCreationConfig[], bpmnJS: any): Observable<ITaskCreationComponentOutput[]> {
    let ref = this._dialog.open(TaskCreationComponent, {
      panelClass: 'no-padding-dialog',
      data: {
        'steps': steps, 
        'bpmnJS': bpmnJS
      } as ITaskCreationComponentInput,
      disableClose: true
    });
    return ref.afterClosed();
  }

  editParam(paramCode: ParamCodes): Observable<Object> {
    let ref = this._dialog.open(ParamEditorComponent, {
      data: paramCode,
      panelClass: 'no-padding-dialog',
      disableClose: true
    });
    return ref.afterClosed();
  }

}
