import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { FunctionSelectionComponent } from '../components/function-selection/function-selection.component';
import { IFunction } from '../globals/i-function';
import { IParam } from '../globals/i-param';

@Injectable({
  providedIn: 'root'
})
export class FunctionSelectionControlService {

  constructor(private _dialog: MatDialog) { }

  selectFunction(inputParam: IParam | IParam | null): Observable<IFunction | null | undefined> {
    
    let ref = this._dialog.open(FunctionSelectionComponent, {
      data: inputParam,
      panelClass: 'no-padding-dialog',
      disableClose: true
    });
    return ref.afterClosed();

  }

}
