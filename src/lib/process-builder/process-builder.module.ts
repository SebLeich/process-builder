import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessBuilderComponent } from './components/process-builder/process-builder.component';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { Store, StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import * as fromIParamState from './store/reducers/i-param.reducer';
import { IParamEffects } from './store/effects/i-param.effects';

import * as fromIFunctionState from './store/reducers/i-function.reducer';
import { IFunctionEffects } from './store/effects/i-function.effects';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FunctionPreviewComponent } from './components/function-preview/function-preview.component';
import { ParamPipe } from './pipes/param.pipe';
import { ParamEditorComponent } from './components/dialog/param-editor/param-editor.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TaskCreationComponent } from './components/dialog/task-creation/task-creation.component';
import { TaskCreationStepPipe } from './pipes/task-creation-step.pipe';
import { EmbeddedFunctionSelectionComponent } from './components/embedded/embedded-function-selection/embedded-function-selection.component';
import { EmbeddedConfigureErrorGatewayEntranceConnectionComponent } from './components/embedded/embedded-configure-error-gateway-entrance-connection/embedded-configure-error-gateway-entrance-connection.component';
import { DynamicInputParamsPipe } from './pipes/dynamic-input-params.pipe';
import { EmbeddedFunctionImplementationComponent } from './components/embedded/embedded-function-implementation/embedded-function-implementation.component';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { ReturnValueStatusPipe } from './pipes/return-value-status.pipe';
import { loadIFunctions } from './store/actions/i-function.actions';


@NgModule({
  declarations: [
    ProcessBuilderComponent,
    FunctionPreviewComponent,
    ParamPipe,
    ParamEditorComponent,
    TaskCreationComponent,
    TaskCreationStepPipe,
    EmbeddedFunctionSelectionComponent,
    EmbeddedConfigureErrorGatewayEntranceConnectionComponent,
    DynamicInputParamsPipe,
    EmbeddedFunctionImplementationComponent,
    ReturnValueStatusPipe
  ],
  imports: [
    CodemirrorModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    
    ReactiveFormsModule,
    RouterModule.forChild([
      { path: '**', component: ProcessBuilderComponent }
    ]),

    StoreModule.forFeature(fromIParamState.featureKey, fromIParamState.reducer),
    EffectsModule.forFeature([IParamEffects]),

    StoreModule.forFeature(fromIFunctionState.featureKey, fromIFunctionState.reducer),
    EffectsModule.forFeature([IFunctionEffects]),

  ],
  providers: [
    ParamPipe,
    { provide: fromIParamState.PARAM_STORE_TOKEN, useExisting: Store },
    { provide: fromIFunctionState.I_FUNCTION_STORE_TOKEN, useExisting: Store }
  ]
})
export class ProcessBuilderModule {

  constructor(private _iFunctionStore: Store<fromIFunctionState.State>) {
    this._iFunctionStore.dispatch(loadIFunctions());
  }

}
