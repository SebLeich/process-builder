import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import JSONEditor from 'jsoneditor';
import { combineLatest, debounceTime, ReplaySubject, startWith, Subject, Subscription, take } from 'rxjs';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { IEmbeddedFunctionImplementationData } from '../embedded-function-implementation/i-embedded-function-implementation-output';

@Component({
  selector: 'app-embedded-param-editor',
  templateUrl: './embedded-param-editor.component.html',
  styleUrls: ['./embedded-param-editor.component.sass']
})
export class EmbeddedParamEditorComponent implements IEmbeddedView<IEmbeddedFunctionImplementationData>, AfterViewInit, OnDestroy, OnInit {

  @Output() valueChange: EventEmitter<IEmbeddedFunctionImplementationData> = new EventEmitter<IEmbeddedFunctionImplementationData>();

  @ViewChild('parameterBody', { static: true, read: ElementRef }) parameterBody!: ElementRef<HTMLDivElement>;

  initialValue: IEmbeddedFunctionImplementationData | undefined;

  formGroup!: FormGroup;

  private _editor = new ReplaySubject<JSONEditor>(1);
  editor$ = this._editor.asObservable();

  private _jsonChanged = new Subject<object>();
  jsonChanged$ = this._jsonChanged.pipe(debounceTime(100));

  private _subscriptions: Subscription[] = [];

  constructor(
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig
  ) { }

  ngAfterViewInit(): void {
    this._subscriptions.push(...[
      combineLatest([this.editor$, this.formGroup.controls['outputParamValue'].valueChanges.pipe(startWith(this.formGroup.controls['outputParamValue'].value))])
        .subscribe(([editor, param]: [JSONEditor, any]) => {
          console.log(param);
          editor.set(param);
          editor.expandAll();
        })
    ]);
    let instance = new JSONEditor(this.parameterBody.nativeElement, {
      'onChangeJSON': (value: object) => this._jsonChanged.next(value)
    });
    this._editor.next(instance);
  }

  ngOnDestroy() {
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  ngOnInit(): void {
    if (this.initialValue) this.formGroup.patchValue(this.initialValue);
    console.log(this.initialValue);
  }

}
