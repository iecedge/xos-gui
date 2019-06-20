
/*
 * Copyright 2017-present Open Networking Foundation

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import * as _ from 'lodash';
import * as pluralize from 'pluralize';
import {IXosTableColumn, IXosTableCfg} from '../../table/table';
import {IXosModeldef} from '../../../datasources/rest/modeldefs.rest';
import {IXosFormCfg, IXosFormInput, IXosFormInputValidator, IXosFormInputOptions} from '../../form/form';
import {IXosModelStoreService} from '../../../datasources/stores/model.store';
import {IXosState} from '../runtime-states';
import {IXosFormHelpersService} from '../../form/form-helpers';

export interface IXosModelDefsFieldValidators {
  name: string;
  bool_value?: boolean;
  int_value?: number;
}

export interface IXosModelDefsField {
  name: string;
  type: string;
  read_only: boolean;
  validators?: IXosModelDefsFieldValidators[];
  hint?: string;
  relation?: {
    model: string;
    type: string;
  };
  options?: IXosFormInputOptions[];
  default?: any | null;
}

export interface IXosConfigHelpersService {
  base_excluded_fields: string[];
  excluded_fields: string[];
  form_excluded_fields: string[];
  modelFieldsToColumnsCfg(model: IXosModeldef): IXosTableColumn[];
  modelToTableCfg(model: IXosModeldef, modelName: string): IXosTableCfg;
  modelFieldToInputCfg(fields: IXosModelDefsField[]): IXosFormInput[];
  modelToFormCfg(model: IXosModeldef): IXosFormCfg;
  pluralize(string: string, quantity?: number, count?: boolean): string;
  toLabel(string: string, pluralize?: boolean): string;
  toLabels(string: string[], pluralize?: boolean): string[];
  stateFromCoreModel(name: string): string;
  stateWithParams(name: string, model: any): string;
  relatedStateWithParams(name: string, id: string): string;
  stateWithParamsForJs(name: string, model: any): any;
}

export class ConfigHelpers implements IXosConfigHelpersService {
  static $inject = [
    '$q',
    '$state',
    'toastr',
    'XosModelStore',
    'XosFormHelpers'
  ];

  public base_excluded_fields = [
    'created',
    'updated',
    'enacted',
    'policed',
    'backend_register',
    'deleted',
    'write_protect',
    'lazy_blocked',
    'no_sync',
    'no_policy',
    'omf_friendly',
    'enabled',
    'validators',
    'password',
    'backend_need_delete',
    'backend_need_delete_policy',
    'backend_need_reap',
    'leaf_model_name',
    'link_deleted_count',
    'policy_code',
    'backend_code'
  ];

  public excluded_fields = angular.copy(this.base_excluded_fields);

  public form_excluded_fields = this.excluded_fields.concat([
    'id',
    'policy_status',
    'backend_status'
  ]);

  constructor(
    private $q: ng.IQService,
    private $state: ng.ui.IStateService,
    private toastr: ng.toastr.IToastrService,
    private XosModelStore: IXosModelStoreService,
    private XosFormHelpers: IXosFormHelpersService
  ) {
    pluralize.addIrregularRule('xos', 'xoses');
    pluralize.addPluralRule(/slice$/i, 'slices');
    pluralize.addPluralRule(/data/i, 'datas');
    pluralize.addSingularRule(/slice$/i, 'slice');
    pluralize.addPluralRule(/imagedeployments/i, 'imagedeploymentss');
    pluralize.addPluralRule(/controllerimages/i, 'controllerimageses');
    pluralize.addPluralRule(/servicedependency/i, 'servicedependencys');
  }

  public pluralize(string: string, quantity?: number, count?: boolean): string {
    return pluralize(string, quantity, count);
  }

  public toLabels(strings: string[], pluralize?: boolean): string[] {
    if (angular.isArray(strings)) {
      return _.map(strings, s => {
        return this.toLabel(s, pluralize);
      });
    }
  }

  public toLabel(string: string, pluralize?: boolean): string {

    if (pluralize) {
      string = this.pluralize(string);
    }

    string = this.fromCamelCase(string);
    string = this.fromSnakeCase(string);
    string = this.fromKebabCase(string);

    return this.capitalizeFirst(string);
  }

  public modelToTableCfg(model: IXosModeldef, baseUrl: string): IXosTableCfg {
    this.reset_excluded_fields();
    const cfg = {
      columns: this.modelFieldsToColumnsCfg(model),
      filter: 'fulltext',
      order: {field: 'id', reverse: false},
      pagination: {
        pageSize: 10
      },
      actions: [
        {
          label: 'details',
          icon: 'search',
          cb: (item) => {
            const state = this.stateWithParamsForJs(item.leaf_model_name, item.id);
            this.$state.go(state.name, state.params);
          }
        },
        {
          label: 'delete',
          icon: 'remove',
          color: 'red',
          cb: (item) => {
            let obj = angular.copy(item);
            const objName = (angular.isUndefined(obj.name)) ? 'instance' : obj.name;

            item.$delete()
              .then((res) => {
                if (res.status === 404) {
                  // TODO understand why it does not go directly in catch
                  throw new Error();
                }
                this.toastr.info(`Requested removal for ${model.name} ${objName}`);
              })
              .catch(() => {
                this.toastr.error(`Error while deleting ${objName}`);
              });
          }
        }
      ]
    };
    return cfg;
  }

  public modelFieldsToColumnsCfg(model: IXosModeldef): IXosTableColumn[] {
    const fields: IXosModelDefsField[] = model.fields;
    const modelName: string = model.name;
    const columns =  _.map(fields, (f) => {
      if (model.sync_implemented !== 'True') {
        this.excluded_fields.push('backend_status');
      }

      if (model.policy_implemented !== 'True') {
        this.excluded_fields.push('policy_status');
      }

      if (!angular.isDefined(f) || this.excluded_fields.indexOf(f.name) > -1) {
        return;
      }
      const col: IXosTableColumn =  {
        label: this.toLabel(f.name),
        prop: f.name
      };

      if (f.name === 'id' || f.name === 'name') {
        col.link = item => this.stateWithParamsForJs(modelName, item.id);
      }

      // if the field identify a relation, create a link
      if (f.relation && f.relation.type === 'manytoone') {
        col.type = 'custom';
        col.formatter = item => {
          this.populateRelated(item, item[f.name], f);
          return item[f.name];
        };
        col.link = item => this.stateWithParamsForJs(f.relation.model, item[col.prop]);
      }

      if (f.name === 'backend_status' || f.name === 'policy_status') {

        const statusCol = f.name === 'backend_status' ? 'backend_code' : 'policy_code';

        col.type = 'icon';
        col.hover = (item) => {
          return item[f.name];
        };
        col.formatter = (item) => {
          if (parseInt(item[statusCol], 10) === 1) {
            return 'check';
          }
          if (parseInt(item[statusCol], 10) === 2) {
            return 'exclamation-circle';
          }
          if (parseInt(item[statusCol], 10) === 0) {
            return 'clock-o';
          }
        };
      }

      return col;
    })
      .filter(v => angular.isDefined(v));

    return columns;
  };

  public stateFromCoreModel(name: string): string {
    const state: ng.ui.IState = _.find(this.$state.get(), (s: IXosState) => {
      if (s.data) {
        return s.data.model === name;
      }
      return false;
    });
    return state ? state.name : null;
  }

  public stateWithParams(name: string, model: any): string {
    const state = this.stateFromCoreModel(name);
    return `${state}({id: ${model['id']}})`;
  }

  public relatedStateWithParams(name: string, id: string): string {
    const state = this.stateFromCoreModel(name);
    return `${state}({id: ${id}})`;
  }

  public stateWithParamsForJs(name: string, id: number): any {
    const state = this.stateFromCoreModel(name);
    return {name: state, params: {id: id}};
  }

  public modelFieldToInputCfg(fields: IXosModelDefsField[]): IXosFormInput[] {

    return _.map(fields, (f: IXosModelDefsField) => {
      const input: IXosFormInput = {
        name: f.name,
        label: this.toLabel(f.name),
        type: f.type,
        validators: this.formatValidators(f.validators),
        hint: f.hint,
        default: this.formatDefaultValues(f.default),
        read_only: f.read_only
      };

      // NOTE populate drop-downs based on relation
      if (f.relation) {
        input.type = 'select';
        this.populateSelectField(f, input);
      }
      // NOTE if static options are defined in modeldefs
      // the f.options field is already populated,
      // we just need to move it to the input
      else if (f.options && f.options.length > 0) {
        input.options = f.options;
      }
      return input;
    })
      .filter(f => this.form_excluded_fields.indexOf(f.name) === -1);
  }

  public modelToFormCfg(model: IXosModeldef): IXosFormCfg {

    const formCfg: IXosFormCfg = {
      formName: `${model.name}Form`,
      exclude: this.form_excluded_fields,
      actions: [{
        label: 'Save',
        class: 'success',
        icon: 'ok',
        cb: null
      }],
      inputs: this.modelFieldToInputCfg(model.fields)
    };

    formCfg.actions[0].cb = (item, form: angular.IFormController) => {
      const d = this.$q.defer();
      if (!form.$valid) {
        formCfg.feedback = {
          show: true,
          message: 'Form is invalid',
          type: 'danger',
          closeBtn: true
        };

        return;
      }
      // remove fields that are not part of the model
      item = this.removeExtraFields(item, model);

      const itemCopy = angular.copy(item);
      const itemName = (angular.isUndefined(itemCopy.name)) ? model.name : itemCopy.name;

      item.$save()
        .then((res) => {
          formCfg.feedback = {
            show: true,
            message: `${itemName} successfully saved`,
            type: 'success',
            closeBtn: true
          };
          this.toastr.success(`${itemName} successfully saved`);
          d.resolve(res);
        })
        .catch(err => {
          const errorMsg = err.specific_error || err.error || 'Internal Server Error';
          formCfg.feedback = {
            show: true,
            message: `Error while saving ${itemName}: ${errorMsg}.`,
            type: 'danger',
            closeBtn: true
          };
          this.toastr.error(err.specific_error || '', `Error while saving ${itemName}: ${errorMsg}`);
          d.reject(err);
        });

      return d.promise;
    };

    return formCfg;
  }

  private removeExtraFields(item: any, modelDef: IXosModeldef) {
    _.forEach(Object.keys(item), prop => {
      const field = _.find(modelDef.fields, {name: prop});
      const hasField = angular.isDefined(field);
      if (!hasField || field.read_only) {
        delete item[prop];
      }
    });
    return item;
  }

  private formatDefaultValues(val: any): any {

    if (angular.isString(val)) {
      const unquoted = val.split('"').join('').toLowerCase();
      if (unquoted === 'true') {
        return true;
      }
      else if (unquoted === 'false') {
        return false;
      }
    }

    return val || undefined;
  }

  private formatValidators(validators: IXosModelDefsFieldValidators[]): IXosFormInputValidator {
    // convert validators as expressed from modelDefs,
    // to the object required by xosForm
    return _.reduce(validators, (formValidators: IXosFormInputValidator, v: IXosModelDefsFieldValidators) => {
      formValidators[v.name] = v.bool_value ? v.bool_value : v.int_value;
      return formValidators;
    }, {});
  }

  private fromCamelCase(string: string): string {
    return string.split(/(?=[A-Z])/).map(w => w.toLowerCase()).join(' ');
  }

  private fromSnakeCase(string: string): string {
    return string.split('_').join(' ').trim();
  }

  private fromKebabCase(string: string): string {
    return string.split('-').join(' ').trim();
  }

  private capitalizeFirst(string: string): string {
    return string.slice(0, 1).toUpperCase() + string.slice(1);
  }

  private populateRelated(item: any, fk: string, field: IXosModelDefsField): any {
    // if the relation is not defined return
    if (!fk || angular.isUndefined(fk) || fk === null) {
      return;
    }
    this.XosModelStore.query(field.relation.model)
      .subscribe(res => {
        if (angular.isDefined(res) && angular.isDefined(fk)) {
          let ri = _.find(res, {id: fk});
          if (angular.isDefined(ri)) {
            if (angular.isDefined(ri.name)) {
              item[`${field.name}-formatted`] = ri.name;
            }
            else if (angular.isDefined(ri.humanReadableName)) {
              item[`${field.name}-formatted`] = ri.humanReadableName;
            }
            else {
              item[`${field.name}-formatted`] = ri.id;
            }
          }
        }
      });
  }

  // augment a select field with related model informations
  private populateSelectField(field: IXosModelDefsField, input: IXosFormInput): void {
    this.XosModelStore.query(field.relation.model)
      .subscribe(res => {
        input.options = _.map(res, item => {
          let opt = {id: item.id, label: item.humanReadableName ? item.humanReadableName : item.name};
          if (!angular.isDefined(item.humanReadableName) && !angular.isDefined(item.name)) {
            opt.label = item.id;
          }
          return opt;
        });
      });
  }

  private reset_excluded_fields() {
    this.excluded_fields = angular.copy(this.base_excluded_fields);
  }
}
