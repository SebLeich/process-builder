import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';

@Component({
  selector: 'app-embedded-configure-error-gateway-entrance-connection',
  templateUrl: './embedded-configure-error-gateway-entrance-connection.component.html',
  styleUrls: ['./embedded-configure-error-gateway-entrance-connection.component.sass']
})
export class EmbeddedConfigureErrorGatewayEntranceConnectionComponent implements IEmbeddedView<any>, OnDestroy, OnInit {

  @Output() valueChange: EventEmitter<any> = new EventEmitter<any>();

  constructor() { }

  ngOnDestroy(): void {
    
  }

  ngOnInit(): void {
  }

}
