import { Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ErrorGatewayEvent } from 'src/lib/process-builder/globals/error-gateway-event';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';
import { IProcessBuilderConfig, PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';

@Component({
  selector: 'app-embedded-configure-error-gateway-entrance-connection',
  templateUrl: './embedded-configure-error-gateway-entrance-connection.component.html',
  styleUrls: ['./embedded-configure-error-gateway-entrance-connection.component.sass']
})
export class EmbeddedConfigureErrorGatewayEntranceConnectionComponent implements IEmbeddedView<ErrorGatewayEvent>, OnDestroy, OnInit {

  @Input() initialValue: ErrorGatewayEvent | undefined;
  @Output() valueChange: EventEmitter<ErrorGatewayEvent> = new EventEmitter<ErrorGatewayEvent>();

  selection: ErrorGatewayEvent | undefined;

  constructor(
    @Inject(PROCESS_BUILDER_CONFIG_TOKEN) public config: IProcessBuilderConfig
  ) { }

  ngOnDestroy(): void {

  }

  ngOnInit(): void {
    this.selection = this.initialValue;
  }

  setValue(value: ErrorGatewayEvent) {
    this.selection = value;
    this.valueChange.emit(value);
  }

  ErrorGatewayEvent = ErrorGatewayEvent;

}
