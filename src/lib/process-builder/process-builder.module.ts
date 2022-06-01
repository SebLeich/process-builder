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
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';

import { FunctionSelectionComponent } from './components/dialog/function-selection/function-selection.component';
import { FunctionPreviewComponent } from './components/function-preview/function-preview.component';
import { ParamPipe } from './pipes/param.pipe';
import { ParamEditorComponent } from './components/dialog/param-editor/param-editor.component';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskCreationComponent } from './components/dialog/task-creation/task-creation.component';
import { TaskCreationStepPipe } from './pipes/task-creation-step.pipe';
import { EmbeddedFunctionSelectionComponent } from './components/embedded/embedded-function-selection/embedded-function-selection.component';
import { EmbeddedConfigureErrorGatewayEntranceConnectionComponent } from './components/embedded/embedded-configure-error-gateway-entrance-connection/embedded-configure-error-gateway-entrance-connection.component';


@NgModule({
  declarations: [
    ProcessBuilderComponent,
    FunctionSelectionComponent,
    FunctionPreviewComponent,
    ParamPipe,
    ParamEditorComponent,
    TaskCreationComponent,
    TaskCreationStepPipe,
    EmbeddedFunctionSelectionComponent,
    EmbeddedConfigureErrorGatewayEntranceConnectionComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '**', component: ProcessBuilderComponent }
    ]),
    StoreModule.forFeature(fromState.featureKey, fromState.reducer),
    EffectsModule.forFeature([IParamEffects]),
  ],
  providers: [
    ParamPipe
  ]
})
export class ProcessBuilderModule { }
