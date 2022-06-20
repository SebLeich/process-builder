import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import JSONEditor from 'jsoneditor';
import { combineLatest, debounceTime, Observable, of, ReplaySubject, Subject, Subscription, switchMap, take } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { IParam } from 'src/lib/process-builder/globals/i-param';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { updateIParam } from 'src/lib/process-builder/store/actions/i-param.actions';
import * as fromIParam from 'src/lib/process-builder/store/reducers/i-param.reducer';
import * as fromIFunction from 'src/lib/process-builder/store/reducers/i-function.reducer';
import { selectIParam } from 'src/lib/process-builder/store/selectors/i-param.selectors';
import { selectIFunctionsByOutputParam } from 'src/lib/process-builder/store/selectors/i-function.selector';
import { IFunction } from 'src/lib/process-builder/globals/i-function';

@Component({
  selector: 'app-param-editor',
  templateUrl: './param-editor.component.html',
  styleUrls: ['./param-editor.component.sass']
})
export class ParamEditorComponent implements AfterViewInit, OnDestroy, OnInit {

  @ViewChild('parameterBody', { static: true, read: ElementRef }) parameterBody!: ElementRef<HTMLDivElement>;

  formGroup!: FormGroup;

  private _editor = new ReplaySubject<JSONEditor>(1);
  editor$ = this._editor.asObservable();

  private _jsonChanged = new Subject<object>();
  jsonChanged$ = this._jsonChanged.pipe(debounceTime(100));

  paramObject$: Observable<IParam | null | undefined> = this._paramStore.select(selectIParam(() => this.data));
  producingFunctions$: Observable<IFunction[]> = this.paramObject$.pipe(switchMap(param => {
    if (!param) return of([]);
    return this._functionStore.select(selectIFunctionsByOutputParam(param));
  }));

  private _subscriptions: Subscription[] = [];

  constructor(
    private _paramStore: Store<fromIParam.State>,
    private _functionStore: Store<fromIFunction.State>,
    private _ref: MatDialogRef<ParamEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParamCodes | 'dynamic',
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig,

    private _formBuilder: FormBuilder
  ) {
    this.formGroup = this._formBuilder.group({
      'name': null,
      'identifier': null,
      'value': null,
      'normalizedName': null
    });
  }

  calculateFunctionOutput(func: IFunction) {
    if (func.customImplementation) {
      let jsText = func.customImplementation.join('\n');
      var bed = { test: 1000 };
      let result = eval.call(window, `(${jsText})`)(bed);
      console.log(result);
    } else {
      let result = func.pseudoImplementation();
      console.log(result);
    }
  }

  close() {
    this.editor$.pipe(take(1)).subscribe(editor => {
      let parsedValue = ProcessBuilderRepository.extractObjectIParams(editor.get());
      this.valueControl.setValue(parsedValue);
      this.normalizedNameControl.setValue(ProcessBuilderRepository.normalizeName(this.nameControl.value));
      this._paramStore.dispatch(updateIParam(this.formGroup.value));
      console.log(this.formGroup.value);
      this._ref.close();
    });
  }

  ngAfterViewInit(): void {
    this._subscriptions.push(...[
      combineLatest([this.editor$, this.paramObject$])
        .pipe(take(1))
        .subscribe(([editor, param]: [JSONEditor, IParam | null | undefined]) => {
          let converted = param ? ProcessBuilderRepository.convertIParamKeyValuesToPseudoObject(param.value) : {};
          editor.set(converted);
          editor.expandAll();
        })
    ]);
    let instance = new JSONEditor(this.parameterBody.nativeElement, {
      'onChangeJSON': (value: object) => this._jsonChanged.next(value)
    });
    this._editor.next(instance);
  }

  ngOnDestroy(): void {
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  ngOnInit(): void {
    this._paramStore.select(selectIParam(this.data)).subscribe(param => {
      if (!param) return;
      this.formGroup.patchValue(param);
    });
  }

  get nameControl() {
    return this.formGroup.controls['name'];
  }
  get normalizedNameControl() {
    return this.formGroup.controls['normalizedName'];
  }
  get processTypeIdentifierControl() {
    return this.formGroup.controls['processTypeIdentifier'];
  }
  get valueControl() {
    return this.formGroup.controls['value'];
  }

}
