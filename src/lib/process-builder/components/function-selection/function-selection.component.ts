import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReplaySubject } from 'rxjs';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from '../../globals/i-function';
import { IInputParam } from '../../globals/i-input-param';

@Component({
  selector: 'app-function-selection',
  templateUrl: './function-selection.component.html',
  styleUrls: ['./function-selection.component.sass']
})
export class FunctionSelectionComponent implements OnInit {

  private _availableFunctions = new ReplaySubject<IFunction[]>(1);
  availableFunctions$ = this._availableFunctions.asObservable();

  constructor(
    private _ref: MatDialogRef<FunctionSelectionComponent>,
    @Inject(MAT_DIALOG_DATA) private _data: IInputParam | IInputParam[] | null,
    @Inject(FUNCTIONS_CONFIG_TOKEN) private _functions: IFunction[],
  ) { }

  abort = () => this._ref.close();

  ngOnInit(): void {
    this._setFunctions();
  }

  selectFunction = (func: IFunction) => this._ref.close(func);

  private _setFunctions() {
    let availableFunctions = this._functions;
    let availableInputParams: IInputParam[] = Array.isArray(this._data) ? this._data : this._data ? [this._data] : [];
    availableFunctions = availableFunctions.filter(x => {
      if (!x) return true;
      let requiredInputs: IInputParam[] = ((Array.isArray(x.inputParams) ? x.inputParams : [x.inputParams]).filter(y => y && !y.optional)) as IInputParam[];
      if (requiredInputs.length === 0) return true;
      // TODO
      return false;
    });
    this._availableFunctions.next(availableFunctions);
  }

}
