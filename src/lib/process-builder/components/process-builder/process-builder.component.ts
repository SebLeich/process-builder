import { AfterContentInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { showAnimation } from 'src/lib/shared/animations/show';
import { ProcessBuilderService } from '../../services/process-builder.service';
import { ProcessBuilderComponentService } from './process-builder-component.service';

@Component({
  selector: 'app-process-builder',
  templateUrl: './process-builder.component.html',
  styleUrls: ['./process-builder.component.sass'],
  animations: [
    showAnimation
  ],
  providers: [
    ProcessBuilderComponentService
  ]
})
export class ProcessBuilderComponent implements AfterContentInit, OnInit {

  @ViewChild('diagramWrapper', { static: true }) private diagramWrapper!: ElementRef<HTMLDivElement>;

  constructor(
    public processBuilderService: ProcessBuilderService,
    private _processBuilderComponentService: ProcessBuilderComponentService
  ) { }

  ngAfterContentInit(): void {
    // attach BpmnJS instance to DOM element
    this._processBuilderComponentService.bpmnJS.attachTo(this.diagramWrapper.nativeElement);
    this._processBuilderComponentService.setDefaultModel();
  }

  ngOnInit(): void {

  }

}
