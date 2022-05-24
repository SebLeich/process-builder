import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessBuilderComponent } from './components/process-builder/process-builder.component';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';


@NgModule({
  declarations: [
    ProcessBuilderComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild([
      { path: '**', component: ProcessBuilderComponent }
    ]),
  ]
})
export class ProcessBuilderModule { }
