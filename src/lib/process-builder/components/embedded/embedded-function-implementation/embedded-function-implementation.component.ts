import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { debounceTime, filter, ReplaySubject, Subject, Subscription, take } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { State } from 'src/lib/process-builder/store/reducers/i-param-reducer';
import { selectIParams } from 'src/lib/process-builder/store/selectors/i-param.selectors';
import { syntaxTree } from "@codemirror/language";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { EditorState, Text } from '@codemirror/state';
import { basicSetup, EditorView } from '@codemirror/basic-setup';
import { javascript } from '@codemirror/lang-javascript';

@Component({
  selector: 'app-embedded-function-implementation',
  templateUrl: './embedded-function-implementation.component.html',
  styleUrls: ['./embedded-function-implementation.component.sass']
})
export class EmbeddedFunctionImplementationComponent implements IEmbeddedView<Text>, AfterViewInit, OnDestroy {

  @Input() inputParams!: ParamCodes | ParamCodes[] | null;
  @Input() initialValue: Text | undefined;

  @Output() valueChange: EventEmitter<Text> = new EventEmitter<Text>();

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

  private _implementationChanged = new ReplaySubject<Text>(1);
  implementationChanged$ = this._implementationChanged.asObservable();

  private _subscriptions: Subscription[] = [];

  constructor(
    private _store: Store<State>,
  ) { }

  ngAfterViewInit(): void {
    this._subscriptions.push(...[
      this.prepareInjector().subscribe({
        complete: () => {
          this.codeMirror = new EditorView({
            state: this.state(),
            parent: this.codeBody.nativeElement
          });
        }
      }),
      this.implementationChanged$.pipe(debounceTime(100)).subscribe(v => {
        console.log(v);
        this.valueChange.emit(v);
      })
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
          for (let param of allParams) this.paramInjector[ProcessBuilderRepository.normalizeIParamName(param!.name)] = ProcessBuilderRepository.convertIParamKeyValuesToPseudoObject(param!.value);
          subject.next();
          subject.complete();
        })
    ]);
    return subject.asObservable();
  }

  complete = (context: CompletionContext) => {
    let nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
    console.log(nodeBefore.name, nodeBefore.parent?.name, this.paramInjector);

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
    doc: this.initialValue ?? "/**\n * write your custom code in the main method\n */\n\nfunction main() {\n  // your code\n}\n",
    extensions: [
      basicSetup,
      autocompletion({ override: [this.complete] }),
      javascript(),
      EditorView.updateListener.of(() => this._implementationChanged.next(this.codeMirror.state.doc))
    ]
  });

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
