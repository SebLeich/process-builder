import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessBuilderComponent } from './components/process-builder/process-builder.component';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import * as fromState from './store/reducers/i-param-reducer';
import { EffectsModule } from '@ngrx/effects';
import { IParamEffects } from './store/effects/i-param.effects';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { FunctionSelectionComponent } from './components/function-selection/function-selection.component';
import { FunctionPreviewComponent } from './components/function-preview/function-preview.component';


@NgModule({
  declarations: [
    ProcessBuilderComponent,
    FunctionSelectionComponent,
    FunctionPreviewComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    RouterModule.forChild([
      { path: '**', component: ProcessBuilderComponent }
    ]),
    StoreModule.forFeature(fromState.featureKey, fromState.reducer),
    EffectsModule.forFeature([IParamEffects]),
  ]
})
export class ProcessBuilderModule { }
