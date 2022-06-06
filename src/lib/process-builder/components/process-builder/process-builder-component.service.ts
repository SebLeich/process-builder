import { Inject, Injectable, Injector } from '@angular/core';

import BPMNJSModules from 'src/lib/bpmn-io/bpmn-js-modules';
import BPMNJSEventTypes from 'src/lib/bpmn-io/bpmn-js-event-types';

// @ts-ignore
import * as BpmnJS from 'bpmn-js/dist/bpmn-modeler.production.min.js';

// @ts-ignore
import gridModule from "diagram-js/lib/features/grid-snapping/visuals";

// @ts-ignore
import CliModule from 'bpmn-js-cli';
import { ProcessBuilderService } from '../../services/process-builder.service';
import { BehaviorSubject, delay, Observable, Subject, Subscription, take } from 'rxjs';
import { Store } from '@ngrx/store';
import { State } from '../../store/reducers/i-param.reducer';
import { loadIParams } from '../../store/actions/i-param.actions';
import { selectIParams } from '../../store/selectors/i-param.selectors';
import { startEventFilter } from 'src/lib/bpmn-io/rxjs-operators';
import { IEvent } from 'src/lib/bpmn-io/i-event';
import { validateBPMNConfig } from 'src/lib/core/config-validator';

@Injectable()
export class ProcessBuilderComponentService {

  private _init: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _shapeCreated = new Subject<IEvent>();

  // instantiate BpmnJS with component
  public bpmnJS: BpmnJS;
  public elementFactory: any;
  public elementRegistry: any;
  public modeling: any;
  public eventBus: any;

  public params$ = this._store.select(selectIParams());
  public init$ = this._init.pipe(delay(1));
  public shapeCreated$ = this._shapeCreated.asObservable();

  private _subscriptions: Subscription[] = [];

  constructor(
    private _injector: Injector,
    private _store: Store<State>,
    private _processBuilderService: ProcessBuilderService
  ) {
    this._setUp();
  }

  dispose() {
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  init(parent: HTMLDivElement) {
    // attach BpmnJS instance to DOM element
    this.bpmnJS.attachTo(parent);
    this.setDefaultModel().pipe(delay(1))
      .subscribe({
        complete: () => {
          this.elementFactory = this.bpmnJS.get(BPMNJSModules.ElementFactory);
          this.elementRegistry = this.bpmnJS.get(BPMNJSModules.ElementRegistry);
          this.modeling = this.bpmnJS.get(BPMNJSModules.Modeling);
          this.eventBus = this.bpmnJS.get(BPMNJSModules.EventBus);

          this.eventBus.on(BPMNJSEventTypes.ShapeAdded, (evt: any) => this._shapeCreated.next(evt));

          // (2) Get the existing process and the start event
          //const process = elementRegistry.get('ROOT');

          //const shape = modeling.createShape({ type: ShapeTypes.Task }, { x: 200, y: 300 }, process);

          this._init.next(true);
        }
      });
  }

  setDefaultModel(): Observable<void> {
    let subject = new Subject<void>();
    this._processBuilderService.defaultBPMNModel$.pipe(take(1))
      .subscribe({
        next: (model) => {
          this.setXML(model);
          subject.next();
        },
        complete: () => subject.complete()
      });
    return subject.asObservable();
  }

  setXML(xml: string) {
    try {
      const { warnings } = this.bpmnJS.importXML(xml);
      console.log('rendered');
    } catch (err) {
      console.log('error rendering', err);
    }
  }

  undo = () => (window as any).cli.undo();
  redo = () => (window as any).cli.redo();

  private _setUp() {
    this.bpmnJS = new BpmnJS({
      additionalModules: [gridModule, CliModule],
      cli: {
        bindTo: 'cli'
      }
    });

    validateBPMNConfig(this.bpmnJS, this._injector);

    this._store.dispatch(loadIParams());
    this._subscriptions.push(...[
      this._shapeCreated.subscribe(x => {
        //console.log(x)
      }),
      this._shapeCreated.pipe(startEventFilter).subscribe(e => {
        //debugger;
      })
    ])
  }

}
