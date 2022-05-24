import { Injectable } from '@angular/core';

// @ts-ignore
import * as BpmnJS from 'bpmn-js/dist/bpmn-modeler.production.min.js';

// @ts-ignore
import gridModule from "diagram-js/lib/features/grid-snapping/visuals";

// @ts-ignore
import CliModule from 'bpmn-js-cli';
import { ProcessBuilderService } from '../../services/process-builder.service';
import { take } from 'rxjs';

@Injectable()
export class ProcessBuilderComponentService {

  // instantiate BpmnJS with component
  public bpmnJS: BpmnJS;

  constructor(
    private _processBuilderService: ProcessBuilderService
  ) {
    this._setUp();
  }

  setDefaultModel() {
    this._processBuilderService.defaultBPMNModel$
      .pipe(take(1))
      .subscribe(model => this.setXML(model));
  }

  setXML(xml: string) {
    try {
      const { warnings } = this.bpmnJS.importXML(xml);
      console.log('rendered');
    } catch (err) {
      console.log('error rendering', err);
    }
  }

  private _setUp() {
    this.bpmnJS = new BpmnJS({
      additionalModules: [gridModule, CliModule],
      cli: {
        bindTo: 'cli'
      }
    });
  }

}
