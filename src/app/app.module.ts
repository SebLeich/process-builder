import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ProcessBuilderModule } from 'src/lib/process-builder/process-builder.module';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PROCESS_BUILDER_CONFIG_TOKEN } from 'src/lib/process-builder/globals/i-process-builder-config';
import PROCESS_BUILDER_CONFIG from 'src/config/process-builder-config';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ProcessBuilderModule,
    BrowserAnimationsModule
  ],
  providers: [
    { provide: PROCESS_BUILDER_CONFIG_TOKEN, useValue: PROCESS_BUILDER_CONFIG }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
