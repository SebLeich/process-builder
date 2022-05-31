import { Component, Input, OnInit } from '@angular/core';
import { IFunction } from '../../globals/i-function';

@Component({
  selector: 'app-function-preview',
  templateUrl: './function-preview.component.html',
  styleUrls: ['./function-preview.component.sass']
})
export class FunctionPreviewComponent implements OnInit {

  @Input() function!: IFunction;

  constructor() { }

  ngOnInit(): void {
  }

}
