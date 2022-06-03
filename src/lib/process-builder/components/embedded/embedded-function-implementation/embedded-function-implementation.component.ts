import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParamCodes } from 'src/config/param-codes';
import { IEmbeddedView } from 'src/lib/process-builder/globals/i-embedded-view';

@Component({
  selector: 'app-embedded-function-implementation',
  templateUrl: './embedded-function-implementation.component.html',
  styleUrls: ['./embedded-function-implementation.component.sass']
})
export class EmbeddedFunctionImplementationComponent implements IEmbeddedView<string>, OnInit {

  @Input() inputParams!: ParamCodes | ParamCodes[] | null;
  @Input() initialValue: string | undefined;

  @Output() valueChange: EventEmitter<string> = new EventEmitter<string>();

  private _subscriptions: Subscription[] = [];

  constructor() { }

  ngOnDestroy(): void {
    for (let sub of this._subscriptions) sub.unsubscribe();
    this._subscriptions = [];
  }

  ngOnInit(): void {
  }

}
