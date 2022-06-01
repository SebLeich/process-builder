import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { select, Store } from '@ngrx/store';
import { ParamCodes } from 'src/config/param-codes';
import { IParam } from 'src/lib/process-builder/globals/i-param';
import { updateIParam } from 'src/lib/process-builder/store/actions/i-param.actions';
import { State } from 'src/lib/process-builder/store/reducers/i-param-reducer';
import { selectIParam } from 'src/lib/process-builder/store/selectors/i-param.selectors';

@Component({
  selector: 'app-param-editor',
  templateUrl: './param-editor.component.html',
  styleUrls: ['./param-editor.component.sass']
})
export class ParamEditorComponent implements OnInit {

  formGroup!: FormGroup;

  constructor(
    private _store: Store<State>,
    private _ref: MatDialogRef<ParamEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParamCodes,
    private _formBuilder: FormBuilder
  ) {
    this.formGroup = this._formBuilder.group({
      'name': null,
      'processTypeIdentifier': null,
      'value': null
    });
  }

  close(){
    this._store.dispatch(updateIParam(this.formGroup.value))
    this._ref.close();
  }

  ngOnInit(): void {
    this._store.select(selectIParam(this.data)).subscribe(param => {
      if (!param) return;
      this.formGroup.patchValue(param);
    });
  }

}
