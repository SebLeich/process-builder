import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import JSONEditor from 'jsoneditor';
import { combineLatest, debounceTime, ReplaySubject, startWith, Subject, Subscription, switchMap, take, tap } from 'rxjs';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { IEmbeddedFunctionImplementationData } from '../embedded-function-implementation/i-embedded-function-implementation-output';

@Component({
  selector: 'app-embedded-param-editor',
  templateUrl: './embedded-param-editor.component.html',
  styleUrls: ['./embedded-param-editor.component.sass']
})
export class EmbeddedParamEditorComponent implements IEmbeddedView, AfterViewInit, OnDestroy, OnInit {

  @ViewChild('parameterBody', { static: true, read: ElementRef }) parameterBody!: ElementRef<HTMLDivElement>;

  formGroup!: FormGroup;

  private _instance: JSONEditor | undefined;
  private _editor = new ReplaySubject<JSONEditor>(1);
  editor$ = this._editor.asObservable();

  private _editorBlurred = new Subject<void>();
  private _jsonChanged = new ReplaySubject<object>(1);
  jsonChanged$ = this._jsonChanged.pipe(debounceTime(500));

  private _subscriptions: Subscription[] = [];

  constructor(
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig
  ) { }

  editorBlurred = () => this._editorBlurred.next();

  ngAfterViewInit(): void {
    this._subscriptions.push(...[
      combineLatest([this.editor$, this.formGroup.controls['outputParamValue'].valueChanges.pipe(startWith(this.formGroup.controls['outputParamValue'].value))])
        .subscribe(([editor, param]: [JSONEditor, any]) => {
          editor.set(ProcessBuilderRepository.convertIParamKeyValuesToPseudoObject(param));
          editor.expandAll();
        })
    ]);
    this._instance = new JSONEditor(this.parameterBody.nativeElement, {
      'onChangeJSON': (value: object) => this._jsonChanged.next(value),
    });
    this._editor.next(this._instance);
  }

  ngOnDestroy() {
    let obj = this._instance?.get();
    this.formGroup.controls['outputParamValue'].setValue(ProcessBuilderRepository.extractObjectIParams(obj));
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  ngOnInit(): void {

  }

}
