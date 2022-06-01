import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ITaskCreationComponentOutput } from '../components/dialog/task-creation/i-task-creation-component-output';
import { TaskCreationComponent } from '../components/dialog/task-creation/task-creation.component';
import { ITaskCreationConfig } from '../globals/i-task-creation-config';

@Injectable({
  providedIn: 'root'
})
export class DialogService {

  constructor(
    private _dialog: MatDialog
  ) { }

  configTaskCreation(steps: ITaskCreationConfig[]): Observable<ITaskCreationComponentOutput[]> {
    let ref = this._dialog.open(TaskCreationComponent, {
      panelClass: 'no-padding-dialog',
      data: steps
    });
    return ref.afterClosed();
  }

}
