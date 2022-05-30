import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ProcessBuilderModule } from 'src/lib/process-builder/process-builder.module';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';

import PROCESS_BUILDER_CONFIG from 'src/config/process-builder-config';
import PARAMS_CONFIG from 'src/config/params-config';
import FUNCTIONS_CONFIG from 'src/config/function-config';

import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { reducers, metaReducers } from './store/reducers';
import { PARAMS_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-param';
import { FUNCTIONS_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-function';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ProcessBuilderModule,
    BrowserAnimationsModule,
    StoreModule.forRoot(reducers, { metaReducers }),
    EffectsModule.forRoot(),
  ],
  providers: [
    { provide: PROCESS_BUILDER_CONFIG_TOKEN, useValue: PROCESS_BUILDER_CONFIG },
    { provide: PARAMS_CONFIG_TOKEN, useValue: PARAMS_CONFIG },
    { provide: FUNCTIONS_CONFIG_TOKEN, useValue: FUNCTIONS_CONFIG },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
