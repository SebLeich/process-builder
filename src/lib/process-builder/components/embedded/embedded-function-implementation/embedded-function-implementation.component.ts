import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, debounceTime, filter, interval, ReplaySubject, startWith, Subject, Subscription, take, tap } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import * as fromIParam from 'src/lib/process-builder/store/reducers/i-param.reducer';
import { selectIParams } from 'src/lib/process-builder/store/selectors/i-param.selectors';
import { syntaxTree } from "@codemirror/language";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { EditorState, Text } from '@codemirror/state';
import { basicSetup, EditorView } from '@codemirror/basic-setup';
import { esLint, javascript } from '@codemirror/lang-javascript';
import { CodemirrorRepository } from 'src/lib/core/codemirror-repository';
import { MethodEvaluationStatus } from 'src/lib/process-builder/globals/method-evaluation-status';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { IEmbeddedFunctionImplementationData } from './i-embedded-function-implementation-output';
import { FormControl, FormGroup } from '@angular/forms';
import { linter, lintGutter } from '@codemirror/lint';
// @ts-ignore
import Linter from "eslint4b-prebuilt";

@Component({
  selector: 'app-embedded-function-implementation',
  templateUrl: './embedded-function-implementation.component.html',
  styleUrls: ['./embedded-function-implementation.component.sass']
})
export class EmbeddedFunctionImplementationComponent implements IEmbeddedView<IEmbeddedFunctionImplementationData>, AfterViewInit, OnDestroy {

  @Input() inputParams!: ParamCodes | ParamCodes[] | null;
  @Input() initialValue: IEmbeddedFunctionImplementationData | undefined;

  @Output() valueChange: EventEmitter<IEmbeddedFunctionImplementationData> = new EventEmitter<IEmbeddedFunctionImplementationData>();

  @ViewChild('codeBody', { static: true, read: ElementRef }) codeBody!: ElementRef<HTMLDivElement>;
  codeMirror!: EditorView;

  globalsInjector: any = {
    'const': { type: 'variable' },
    'injector': { type: 'variable', apply: 'injector' },
    'main': { type: 'function', apply: 'async () => {\n  // your code\n}\n', hint: 'async' },
    'let': { type: 'variable' },
    'parseInt()': { type: 'function' },
    'var': { type: 'variable' },
  };
  paramInjector: any = { injector: {} };
  staticParams = [
    {
      normalizedName: 'httpClient', value: {
        'get()': { type: 'function', apply: 'get(/*url*/).toPromise()', info: 'asynchronously' },
        'post()': { type: 'function', apply: 'post(/*url*/, /*data*/).toPromise()', info: 'asynchronously' },
        'put()': { type: 'function', apply: 'put(/*url*/, /*data*/).toPromise()', info: 'asynchronously' },
        'delete()': { type: 'function', apply: 'delete(/*url*/).toPromise()', info: 'asynchronously' }
      }
    }
  ]

  varNameInjector: any = {
    'var1': { type: 'variable' },
    'var2': { type: 'variable' }
  };

  formGroup!: FormGroup;

  private _implementationChanged = new ReplaySubject<Text>(1);
  implementationChanged$ = this._implementationChanged.asObservable();

  private _returnValueStatus: BehaviorSubject<MethodEvaluationStatus> = new BehaviorSubject<MethodEvaluationStatus>(MethodEvaluationStatus.Initial);
  returnValueStatus$ = this._returnValueStatus.asObservable();

  private _subscriptions: Subscription[] = [];

  constructor(
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig,
    private _paramStore: Store<fromIParam.State>
  ) { }

  blockTabPressEvent(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  ngAfterViewInit(): void {
    this._subscriptions.push(...[
      this.prepareInjector().subscribe({
        complete: () => {
          this.codeMirror = new EditorView({
            state: this.state(),
            parent: this.codeBody.nativeElement
          });
          this._implementationChanged.next(this.codeMirror.state.doc);
        }
      }),
      combineLatest([this.implementationChanged$, this.formGroup.valueChanges.pipe(startWith(this.formGroup.value))])
        .pipe(debounceTime(500))
        .subscribe(([implementation, formValue]: [Text, any]) => {
          this.formGroup.controls['implementation'].setValue(implementation);
          this.valueChange.emit(this.formGroup.value);
        }),
      this.formGroup.controls['name'].valueChanges.pipe(debounceTime(200)).subscribe(name => this.formGroup.controls['normalizedName'].setValue(ProcessBuilderRepository.normalizeName(name))),
      this.formGroup.controls['outputParamName'].valueChanges.pipe(debounceTime(200)).subscribe(name => this.formGroup.controls['normalizedOutputParamName'].setValue(ProcessBuilderRepository.normalizeName(name))),
      this._implementationChanged.pipe(
        tap(() => this._returnValueStatus.next(MethodEvaluationStatus.Calculating)),
        debounceTime(500)
      ).subscribe(() => this._returnValueStatus.next(CodemirrorRepository.evaluateCustomMethod(this.codeMirror.state))),
      this.returnValueStatus$.subscribe(status => status === MethodEvaluationStatus.ReturnValueFound ? this.formGroup.controls['outputParamName'].enable() : this.formGroup.controls['outputParamName'].disable())
    ]);
  }

  ngOnDestroy(): void {
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  prepareInjector() {
    let subject = new Subject<void>();
    let inputParams = Array.isArray(this.inputParams) ? this.inputParams : this.inputParams ? [this.inputParams] : [];
    this._subscriptions.push(...[
      this._paramStore.select(selectIParams(inputParams))
        .pipe(take(1), filter(x => x ? true : false))
        .subscribe(allParams => {
          for (let key of Object.keys(this.paramInjector.injector)) delete this.paramInjector.injector[key];
          for (let param of allParams) this.paramInjector.injector[param!.normalizedName] = ProcessBuilderRepository.convertIParamKeyValuesToPseudoObject(param!.value);
          for (let param of this.staticParams) this.paramInjector.injector[param.normalizedName] = param.value;
          subject.next();
          subject.complete();
        })
    ]);
    return subject.asObservable();
  }

  complete = (context: CompletionContext) => {
    let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);

    if (completePropertyAfter.includes(nodeBefore.name) && nodeBefore.parent?.name === "MemberExpression") {
      let object = nodeBefore.parent.getChild("Expression");
      if (object?.name === 'VariableName' || object?.name === 'MemberExpression') {
        let from = /\./.test(nodeBefore.name) ? nodeBefore.to : nodeBefore.from;
        let variableName = context.state.sliceDoc(object.from, object.to);
        if (typeof byString(this.paramInjector, variableName) === "object")
          return completeProperties(from, byString(this.paramInjector, variableName) as any)
      }
    } else if (nodeBefore.name == "VariableName") {
      return completeProperties(nodeBefore.from, this.globalsInjector);
    } else if (/*context.explicit && */!dontCompleteIn.includes(nodeBefore.name)) {
      return completeProperties(context.pos, this.paramInjector);
    }

    return null
  }

  state = () => EditorState.create({
    doc: this.formGroup.controls['implementation'].value ?? `/**\n * write your custom code in the method\n * use javascript notation\n * all params available via the injector instance\n */\n\n\async (injector) => {\n  // your code\n}\n`,
    extensions: [
      basicSetup,
      autocompletion({ override: [this.complete] }),
      javascript(),
      EditorView.updateListener.of((evt) => {
        if (evt.docChanged) this._implementationChanged.next(this.codeMirror.state.doc);
      }),
      linter(esLint(new Linter())),
      lintGutter()
    ]
  });

  MethodEvaluationStatus = MethodEvaluationStatus;

  get canFailControl(): FormControl {
    return this.formGroup.controls['canFail'] as FormControl;
  }

}

const completePropertyAfter = [
  ".",
  "?."
]

const dontCompleteIn = [
  "(",
  "{",
  ";",
  "PropertyName",
  "TemplateString",
  "LineComment",
  "BlockComment",
  //"VariableDefinition",
  "PropertyDefinition"
]

function completeProperties(from: number, object: { type: string, apply?: string }) {
  let options = []
  for (let name in object) {
    let option = {
      label: name,
      type: (object as any)[name].type,
      apply: (object as any)[name].apply ?? name
    };
    options.push(option);
  }
  return {
    from,
    options,
    validFor: /^[\w$]*$/
  }
}

function byString(o: object, s: string) {
  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, '');           // strip a leading dot
  var a = s.split('.');
  for (var i = 0, n = a.length; i < n; ++i) {
    var k = a[i];
    if (k in o) {
      o = (o as any)[k];
    } else {
      return;
    }
  }
  return o;
}
