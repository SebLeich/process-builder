import { Component, Input, OnInit } from '@angular/core';
import { IFunction } from '../../globals/i-function';
import { IInputParam } from '../../globals/i-input-param';

@Component({
  selector: 'app-function-preview',
  templateUrl: './function-preview.component.html',
  styleUrls: ['./function-preview.component.sass']
})
export class FunctionPreviewComponent implements OnInit {

  @Input() func!: IFunction;

  inputParams: IInputParam[] = [];

  constructor() { }

  ngOnInit(): void {
    this.inputParams = Array.isArray(this.func.inputParams) ? this.func.inputParams : this.func.inputParams ? [this.func.inputParams] : [];
  }

}
