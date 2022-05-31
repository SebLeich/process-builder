import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ReplaySubject } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from '../../globals/i-function';

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
    @Inject(MAT_DIALOG_DATA) private _data: ParamCodes | ParamCodes[] | null,
    @Inject(FUNCTIONS_CONFIG_TOKEN) private _functions: IFunction[],
  ) { }

  abort = () => this._ref.close();

  ngOnInit(): void {
    this._setFunctions();
  }

  selectFunction = (func: IFunction) => this._ref.close(func);

  private _setFunctions() {
    let availableFunctions = this._functions;
    let availableInputParams: ParamCodes[] = Array.isArray(this._data) ? this._data : this._data ? [this._data] : [];
    availableFunctions = availableFunctions.filter(x => {
      if (!x) return true;
      let requiredInputs: ParamCodes[] = ((Array.isArray(x.inputParams) ? x.inputParams : [x.inputParams]).filter(y => y && !y.optional)).map(x => x?.param) as ParamCodes[];
      if (requiredInputs.length === 0) return true;
      return !requiredInputs.some(x => availableInputParams.indexOf(x) === -1);
    });
    this._availableFunctions.next(availableFunctions);
  }

}
