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
import { BehaviorSubject, combineLatest, debounceTime, delay, distinctUntilChanged, map, Observable, of, Subject, Subscription, switchMap, take, timer } from 'rxjs';
import { Store } from '@ngrx/store';

import * as fromIParamState from '../../store/reducers/i-param.reducer';
import * as fromIFuncState from '../../store/reducers/i-function.reducer';
import * as fromIBpmnJSModelState from '../../store/reducers/i-bpmn-js-model.reducer';

import { selectIParams } from '../../store/selectors/i-param.selectors';
import { IEvent } from 'src/lib/bpmn-io/i-event';
import { validateBPMNConfig } from 'src/lib/core/config-validator';
import { selectIFunctions } from '../../store/selectors/i-function.selector';
import { IBpmnJS } from '../../globals/i-bpmn-js';
import { addIBpmnJSModel, removeIBpmnJSModel, upsertIBpmnJSModel } from '../../store/actions/i-bpmn-js-model.actions';
import * as moment from 'moment';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from '../../globals/i-process-builder-config';
import { Guid } from '../../globals/guid';
import { selectIBpmnJSModels, selectRecentlyUsedIBpmnJSModel } from '../../store/selectors/i-bpmn-js-model.selectors';
import { IBpmnJSModel } from '../../globals/i-bpmn-js-model';
import sebleichProcessBuilderExtension from '../../globals/sebleich-process-builder-extension';
import { getCanvasModule } from 'src/lib/bpmn-io/bpmn-modules';
import { IViewbox } from 'src/lib/bpmn-io/i-viewbox';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class ProcessBuilderComponentService {

  private _init: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  /**
   * @deprecated
   */
  private _shapeCreated = new Subject<IEvent>();
  private _currentIBpmnJSModelGuid = new BehaviorSubject<string | null>(null);

  // instantiate BpmnJS with component
  public bpmnJS!: IBpmnJS;
  public elementFactory: any;
  public elementRegistry: any;
  public modeling: any;
  public eventBus: any;

  public params$ = this._paramStore.select(selectIParams());
  public funcs$ = this._funcStore.select(selectIFunctions());
  public models$ = this._bpmnJSModelStore.select(selectIBpmnJSModels());
  public init$ = this._init.pipe(delay(1));

  /**
   * @deprecated
   */
  public shapeCreated$ = this._shapeCreated.asObservable();
  public currentIBpmnJSModelGuid$ = this._currentIBpmnJSModelGuid.pipe(distinctUntilChanged());
  public currentIBpmnJSModel$ = combineLatest(
    [
      this._bpmnJSModelStore.select(selectIBpmnJSModels()),
      this.currentIBpmnJSModelGuid$
    ]
  ).pipe(
    debounceTime(10),
    map(([bpmnJSModels, bpmnJSModelGuid]: [IBpmnJSModel[], string | null]) => bpmnJSModels.find(x => x.guid === bpmnJSModelGuid))
  );

  private _subscriptions: Subscription[] = [];

  constructor(
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) private _config: IProcessBuilderConfig,
    private _snackBar: MatSnackBar,
    private _injector: Injector,
    private _paramStore: Store<fromIParamState.State>,
    private _funcStore: Store<fromIFuncState.State>,
    private _bpmnJSModelStore: Store<fromIBpmnJSModelState.State>,
    private _processBuilderService: ProcessBuilderService
  ) {
    this._setUp();
  }

  createModel() {
    this._processBuilderService.defaultBPMNModel$
      .pipe(take(1))
      .subscribe({
        next: (xml: string) => {
          let defaultBpmnModel = {
            'guid': Guid.generateGuid(),
            'created': moment().format('yyyy-MM-ddTHH:mm:ss'),
            'description': null,
            'name': this._config.defaultBpmnModelName,
            'xml': xml,
            'lastModified': moment().format('yyyy-MM-ddTHH:mm:ss')
          };
          this._bpmnJSModelStore.dispatch(addIBpmnJSModel(defaultBpmnModel));
          this._currentIBpmnJSModelGuid.next(defaultBpmnModel.guid);
        }
      });
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

          this._init.next(true);
        }
      });
  }

  removeModel() {
    this._currentIBpmnJSModelGuid.pipe(take(1))
      .subscribe((bpmnJSModelGuid: string | null) => {
        if (typeof bpmnJSModelGuid !== 'string') return;
        this._bpmnJSModelStore.dispatch(removeIBpmnJSModel(bpmnJSModelGuid));
        this.setNextModel();
      });
  }

  saveModel() {
    this.currentIBpmnJSModel$.pipe(take(1)).subscribe((model: IBpmnJSModel | undefined) => {
      this.bpmnJS.saveXML()
        .then(({ xml }) => {

          if (!model) return;

          this._bpmnJSModelStore.dispatch(upsertIBpmnJSModel({
            'guid': model.guid,
            'created': model.created,
            'description': model.description,
            'name': model.name,
            'xml': xml,
            'lastModified': moment().format('yyyy-MM-ddTHH:mm:ss'),
            'viewbox': getCanvasModule(this.bpmnJS).viewbox()
          }));

          this._snackBar.open(`the state was successfully saved`, 'Ok', {
            duration: 2000
          });

        });
    })
  }

  setDefaultModel(): Observable<void> {
    let subject = new Subject<void>();

    this._bpmnJSModelStore.select(selectRecentlyUsedIBpmnJSModel())
      .pipe(
        switchMap((model: IBpmnJSModel | undefined) => model ? of(model) : this._processBuilderService.defaultBPMNModel$),
        take(1)
      )
      .subscribe({
        next: (model: IBpmnJSModel | string) => {
          if (typeof model === 'string') {
            model = {
              'guid': Guid.generateGuid(),
              'created': moment().format('yyyy-MM-ddTHH:mm:ss'),
              'description': null,
              'name': this._config.defaultBpmnModelName,
              'xml': model,
              'lastModified': moment().format('yyyy-MM-ddTHH:mm:ss')
            };
            this._bpmnJSModelStore.dispatch(addIBpmnJSModel(model));
          }
          this._currentIBpmnJSModelGuid.next(model.guid);
          subject.next();
        },
        complete: () => subject.complete()
      });

    return subject.asObservable();
  }

  setNextModel() {
    combineLatest([
      this._bpmnJSModelStore.select(selectIBpmnJSModels()),
      this._currentIBpmnJSModelGuid.asObservable()
    ]).pipe(
      take(1)
    ).subscribe(([models, modelGuid]: [IBpmnJSModel[], string | null]) => {
      if (models.length < 2 || typeof modelGuid !== 'string') return;
      let index = models.findIndex(x => x.guid === modelGuid);
      index = index >= (models.length - 1) ? 0 : index + 1;
      this._currentIBpmnJSModelGuid.next(models[index].guid);
    });
  }

  setBpmnModel(xml: string, viewbox: IViewbox | null = null) {
    this.bpmnJS.importXML(xml)
      .then(() => {
        if (viewbox) getCanvasModule(this.bpmnJS).viewbox(viewbox);
      })
      .catch((err) => console.log('error rendering', err));
  }

  undo = () => (window as any).cli.undo();
  redo = () => (window as any).cli.redo();

  private _setUp() {

    this.bpmnJS = new BpmnJS({
      additionalModules: [gridModule, CliModule],
      cli: {
        bindTo: 'cli'
      },
      moddleExtensions: {
        processBuilderExtension: sebleichProcessBuilderExtension
      }
    });

    this._subscriptions.push(...[
      this.currentIBpmnJSModel$.subscribe((model: IBpmnJSModel | undefined) => {
        if (!model) return;
        this.setBpmnModel(model.xml, model.viewbox);
      }),
      validateBPMNConfig(this.bpmnJS, this._injector).subscribe()
    ]);

  }

}
