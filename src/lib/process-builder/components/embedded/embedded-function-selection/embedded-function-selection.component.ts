import { Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from 'src/lib/process-builder/globals/i-function';
import { showAnimation } from 'src/lib/shared/animations/show';

@Component({
  selector: 'app-embedded-function-selection',
  templateUrl: './embedded-function-selection.component.html',
  styleUrls: ['./embedded-function-selection.component.sass'],
  animations: [showAnimation]
})
export class EmbeddedFunctionSelectionComponent implements IEmbeddedView<IFunction>, OnDestroy, OnInit {

  @Input() inputParams!: ParamCodes | ParamCodes[] | null;
  @Input() initialValue: IFunction | undefined;

  @Output() valueChange: EventEmitter<IFunction> = new EventEmitter<IFunction>();

  private _availableFunctions = new ReplaySubject<IFunction[]>(1);
  availableFunctions$ = this._availableFunctions.asObservable();

  selection: IFunction | undefined;

  constructor(
    @Inject(FUNCTIONS_CONFIG_TOKEN) private _functions: IFunction[],
  ) { }

  ngOnDestroy(): void {
    this.valueChange.complete();
  }

  ngOnInit(): void {
    this.selection = this.initialValue;
    this._setFunctions();
  }

  selectFunction(func: IFunction) {
    this.selection = func;
    this.valueChange.emit(func);
  }

  private _setFunctions() {
    let availableFunctions = this._functions;
    let availableInputParams: ParamCodes[] = Array.isArray(this.inputParams) ? this.inputParams : this.inputParams ? [this.inputParams] : [];
    availableFunctions = availableFunctions.filter(x => {
      if (!x) return true;
      let requiredInputs: ParamCodes[] = ((Array.isArray(x.inputParams) ? x.inputParams : [x.inputParams]).filter(y => y && !y.optional)).map(x => x?.param) as ParamCodes[];
      if (requiredInputs.length === 0) return true;
      return !requiredInputs.some(x => availableInputParams.indexOf(x) === -1);
    });
    this._availableFunctions.next(availableFunctions);
  }

}
