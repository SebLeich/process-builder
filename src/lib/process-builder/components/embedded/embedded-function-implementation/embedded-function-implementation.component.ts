import { AfterViewInit, Component, ElementRef, EventEmitter, Inject, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest, debounceTime, filter, ReplaySubject, startWith, Subject, Subscription, take, tap } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { State } from 'src/lib/process-builder/store/reducers/i-param.reducer';
import { selectIParams } from 'src/lib/process-builder/store/selectors/i-param.selectors';
import { syntaxTree } from "@codemirror/language";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { EditorState, Text } from '@codemirror/state';
import { basicSetup, EditorView } from '@codemirror/basic-setup';
import { javascript } from '@codemirror/lang-javascript';
import { CodemirrorRepository } from 'src/lib/core/codemirror-repository';
import { MethodEvaluationStatus } from 'src/lib/process-builder/globals/method-evaluation-status';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { IEmbeddedFunctionImplementationData } from './i-embedded-function-implementation-output';
import { FormBuilder, FormGroup } from '@angular/forms';

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
    'main()': { type: 'function', apply: 'function main(){\n  // your code here\n}' },
    'let': { type: 'variable' },
    'parseInt()': { type: 'function' },
    'var': { type: 'variable' },
  };
  paramInjector: any = {};
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
    private _store: Store<State>,
    private _formBuilder: FormBuilder
  ) {
    this.formGroup = this._formBuilder.group({
      'canFail': false,
      'name': config.defaultFunctionName,
      'normalizedName': ProcessBuilderRepository.normalizeName(config.defaultFunctionName),
      'outputParamName': config.dynamicParamDefaultNaming,
      'normalizedOutputParamName': ProcessBuilderRepository.normalizeName(config.dynamicParamDefaultNaming),
    });
  }

  ngAfterViewInit(): void {
    if(this.initialValue) this.formGroup.patchValue(this.initialValue);
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
        .pipe(debounceTime(500)).subscribe(([implementation, formValue]: [Text, any]) => {
          this.valueChange.emit({
            'canFail': formValue['canFail'],
            'implementation': implementation,
            'name': formValue['name'],
            'normalizedName': formValue['normalizedName'],
            'outputParamName': formValue['outputParamName'],
            'normalizedOutputParamName': formValue['normalizedOutputParamName'],
          });
        }),
      this.formGroup.controls['name'].valueChanges.pipe(debounceTime(200)).subscribe(name => this.formGroup.controls['normalizedName'].setValue(ProcessBuilderRepository.normalizeName(name))),
      this.formGroup.controls['outputParamName'].valueChanges.pipe(debounceTime(200)).subscribe(name => this.formGroup.controls['normalizedOutputParamName'].setValue(ProcessBuilderRepository.normalizeName(name))),
      this._implementationChanged.pipe(
        tap(() => this._returnValueStatus.next(MethodEvaluationStatus.Calculating)),
        debounceTime(500)
      ).subscribe(() => this._returnValueStatus.next(CodemirrorRepository.evaluateCustomMethod(this.codeMirror.state)))
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
      this._store.select(selectIParams(inputParams))
        .pipe(take(1), filter(x => x ? true : false))
        .subscribe(allParams => {
          for (let key of Object.keys(this.paramInjector)) delete this.paramInjector[key];
          for (let param of allParams) this.paramInjector[param!.name] = ProcessBuilderRepository.convertIParamKeyValuesToPseudoObject(param!.value);
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
    doc: this.initialValue?.implementation ?? "/**\n * write your custom code in the main method\n * use javascript notation\n */\n\nfunction main() {\n  // your code\n}\n",
    extensions: [
      basicSetup,
      autocompletion({ override: [this.complete] }),
      javascript(),
      EditorView.updateListener.of((evt) => {
        if (evt.docChanged) this._implementationChanged.next(this.codeMirror.state.doc);
      })
    ]
  });

  MethodEvaluationStatus = MethodEvaluationStatus;

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
