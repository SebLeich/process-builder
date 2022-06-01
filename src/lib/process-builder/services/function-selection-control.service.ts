import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { FunctionSelectionComponent } from '../components/dialog/function-selection/function-selection.component';
import { ParamEditorComponent } from '../components/dialog/param-editor/param-editor.component';
import { IFunction } from '../globals/i-function';

/**
 * @deprecated
 */
@Injectable({
  providedIn: 'root'
})
export class FunctionSelectionControlService {

  constructor(private _dialog: MatDialog) { }

  editParam(paramCode: ParamCodes): Observable<Object> {

    let ref = this._dialog.open(ParamEditorComponent, {
      data: paramCode,
      panelClass: 'no-padding-dialog',
      disableClose: true
    });
    return ref.afterClosed();

  }

  selectFunction(inputParam: ParamCodes[] | ParamCodes | null): Observable<IFunction | null | undefined> {
    
    let ref = this._dialog.open(FunctionSelectionComponent, {
      data: inputParam,
      panelClass: 'no-padding-dialog',
      disableClose: true
    });
    return ref.afterClosed();

  }

}
