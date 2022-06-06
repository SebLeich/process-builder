import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import JSONEditor from 'jsoneditor';
import { combineLatest, debounceTime, ReplaySubject, Subject, Subscription, take } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { FUNCTIONS_CONFIG_TOKEN, IFunction } from 'src/lib/process-builder/globals/i-function';
import { IParam } from 'src/lib/process-builder/globals/i-param';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { updateIParam } from 'src/lib/process-builder/store/actions/i-param.actions';
import { State } from 'src/lib/process-builder/store/reducers/i-param.reducer';
import { selectIParam } from 'src/lib/process-builder/store/selectors/i-param.selectors';

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

  private _subscriptions: Subscription[] = [];

  constructor(
    private _store: Store<State>,
    private _ref: MatDialogRef<ParamEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParamCodes | 'dynamic',
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig,
    @Inject(FUNCTIONS_CONFIG_TOKEN) private _functions: IFunction[],
    private _formBuilder: FormBuilder
  ) {
    this.formGroup = this._formBuilder.group({
      'name': null,
      'processTypeIdentifier': null,
      'value': null
    });
  }

  close() {
    this.editor$.pipe(take(1)).subscribe(editor => {
      let parsedValue = ProcessBuilderRepository.extractObjectIParams(editor.get());
      this.valueControl.setValue(parsedValue);
      this._store.dispatch(updateIParam(this.formGroup.value))
      this._ref.close();
    });
  }

  ngAfterViewInit(): void {
    this._subscriptions.push(...[
      this._store.select(selectIParam(this.data)).subscribe(param => {
        let functions = this._functions.filter(x => x.output?.param === param ?? false);
        for(let func of functions){
          
        }
      }),
      combineLatest([this.editor$, this._store.select(selectIParam(this.data))])
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
    /*
    if (this.data === 'dynamic') {
      this.nameControl.setValue('unnamed dynamic param');
      this.processTypeIdentifierControl.setValue(Math.max(...(Object.values(ParamCodes).filter(x => typeof x === 'number') as number[]), -1) + 1);
      return;
    }
    */
    this._store.select(selectIParam(this.data)).subscribe(param => {
      if (!param) return;
      this.formGroup.patchValue(param);
    });
  }

  get nameControl() {
    return this.formGroup.controls['name'];
  }
  get processTypeIdentifierControl() {
    return this.formGroup.controls['processTypeIdentifier'];
  }
  get valueControl() {
    return this.formGroup.controls['value'];
  }

}
