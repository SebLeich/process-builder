import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProcessBuilderRepository } from 'src/lib/core/process-builder-repository';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import { IEmbeddedFunctionImplementationData } from '../embedded-function-implementation/i-embedded-function-implementation-output';

@Component({
  selector: 'app-embedded-param-editor',
  templateUrl: './embedded-param-editor.component.html',
  styleUrls: ['./embedded-param-editor.component.sass']
})
export class EmbeddedParamEditorComponent implements IEmbeddedView<IEmbeddedFunctionImplementationData>, OnDestroy, OnInit {

  @Output() valueChange: EventEmitter<IEmbeddedFunctionImplementationData> = new EventEmitter<IEmbeddedFunctionImplementationData>();

  initialValue: IEmbeddedFunctionImplementationData | undefined;

  formGroup!: FormGroup;

  private _subscriptions: Subscription[] = [];

  constructor(
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig,
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

  ngOnDestroy() {
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  ngOnInit(): void {
    if (this.initialValue) this.formGroup.patchValue(this.initialValue);
    console.log(this.initialValue);
  }

}
