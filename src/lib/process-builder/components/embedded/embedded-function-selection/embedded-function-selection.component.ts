import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren, ViewContainerRef } from '@angular/core';
import { delay, map, ReplaySubject, Subscription, takeUntil } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { IFunction } from 'src/lib/process-builder/globals/i-function';
import { showAnimation } from 'src/lib/shared/animations/show';
import * as fromIFunctionState from 'src/lib/process-builder/store/reducers/i-function.reducer';
import { Store } from '@ngrx/store';
import { selectIFunctions } from 'src/lib/process-builder/store/selectors/i-function.selector';
import { FunctionPreviewComponent } from '../../function-preview/function-preview.component';

@Component({
  selector: 'app-embedded-function-selection',
  templateUrl: './embedded-function-selection.component.html',
  styleUrls: ['./embedded-function-selection.component.sass'],
  animations: [showAnimation]
})
export class EmbeddedFunctionSelectionComponent implements IEmbeddedView<number>, OnDestroy, OnInit {

  @Input() inputParams!: ParamCodes | ParamCodes[] | null;
  @Input() initialValue: number | undefined;

  @Output() valueChange: EventEmitter<number> = new EventEmitter<number>();

  @ViewChildren(FunctionPreviewComponent, { read: ViewContainerRef }) private activeFunctionWrappers!: QueryList<ViewContainerRef>;

  private _availableFunctions = new ReplaySubject<IFunction[]>(1);
  availableFunctions$ = this._availableFunctions.asObservable();

  selection: number | undefined;

  private _subscriptions: Subscription[] = [];

  constructor(
    private _store: Store<fromIFunctionState.State>
  ) { }

  ngOnDestroy(): void {
    this.valueChange.complete();
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  ngOnInit(): void {
    this.selection = this.initialValue;
    this._subscriptions.push(...[
      this._store.select(selectIFunctions()).pipe(map(funcs => {
        return funcs.filter(x => {
          if (!x) return false;
          let requiredInputs: ParamCodes[] = ((Array.isArray(x.inputParams) ? x.inputParams : [x.inputParams]).filter(y => y && !y.optional)).map(x => x?.param) as ParamCodes[];
          if (requiredInputs.length === 0) return true;
          let availableInputParams: ParamCodes[] = Array.isArray(this.inputParams) ? this.inputParams : this.inputParams ? [this.inputParams] : [];
          return !requiredInputs.some(x => availableInputParams.indexOf(x) === -1);
        })
      })).subscribe((availableFunctions) => {
        this._availableFunctions.next(availableFunctions as IFunction[]);
      }),
      this.availableFunctions$.pipe(delay(800), takeUntil(this.valueChange)).subscribe(() => {
        let ref = this.activeFunctionWrappers.find(x => (x.element.nativeElement as HTMLDivElement).hasAttribute('active'));
        if(ref) ref.element.nativeElement.scrollIntoView({ behavior: 'smooth' });
      })
    ])
  }

  selectFunction(func: IFunction) {
    this.selection = func.identifier;
    this.valueChange.emit(func.identifier);
  }

}
