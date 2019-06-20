
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


import * as angular from 'angular';
import 'angular-mocks';
import 'angular-ui-router';

import {IXosConfigHelpersService, ConfigHelpers, IXosModelDefsField} from './config.helpers';
import {IXosModeldef} from '../../../datasources/rest/modeldefs.rest';
import {IXosTableCfg} from '../../table/table';
import {IXosFormInput, IXosFormCfg} from '../../form/form';
import {BehaviorSubject} from 'rxjs';
import {XosFormHelpers} from '../../form/form-helpers';

let service: IXosConfigHelpersService;

const model: IXosModeldef = {
  name: 'Test',
  app: 'test',
  fields: [
    {
      type: 'number',
      name: 'id',
      validators: [],
      read_only: false
    },
    {
      type: 'string',
      name: 'name',
      validators: [
        {
          bool_value: true,
          name: 'required'
        }
      ],
      read_only: false
    },
    {
      type: 'string',
      name: 'something',
      validators: [
        {
          int_value: 30,
          name: 'maxlength'
        }
      ],
      read_only: false
    },
    {
      type: 'number',
      name: 'else',
      validators: [
        {
          int_value: 20,
          name: 'min'
        },
        {
          int_value: 40,
          name: 'max'
        }
      ],
      read_only: false
    },
    {
      type: 'date',
      name: 'updated',
      validators: [],
      read_only: false
    },
  ],
  description: '',
  verbose_name: '',
  policy_implemented: 'True',
  sync_implemented: 'True'
};

describe('The ConfigHelpers service', () => {

  beforeEach(() => {
    angular
      .module('test', ['toastr'])
      .service('ConfigHelpers', ConfigHelpers)
      .value('AuthService', {
        getUser: () => {
          return {id: 1};
        }
      })
      .value('XosModelStore', {

      })
      .service('XosFormHelpers', XosFormHelpers)
      .value('$state', {
        get: () => {
          return [
            {
              name: 'xos.core.tests',
              data: {model: 'Test'}
            },
            {
              name: 'xos.core.slices',
              data: {model: 'Slices'}
            }
          ];
        }
      });
    angular.mock.module('test');
  });

  beforeEach(angular.mock.inject((
    ConfigHelpers: IXosConfigHelpersService,
  ) => {
    service = ConfigHelpers;
  }));

  describe('The pluralize function', () => {
    it('should pluralize string', () => {
      expect(service.pluralize('test')).toEqual('tests');
      expect(service.pluralize('test', 1)).toEqual('test');
      expect(service.pluralize('xos')).toEqual('xoses');
      expect(service.pluralize('slice')).toEqual('slices');
      expect(service.pluralize('Slice', 1)).toEqual('Slice');
      expect(service.pluralize('kubernetesdata')).toEqual('kubernetesdatas');
    });

    it('should preprend count to string', () => {
      expect(service.pluralize('test', 6, true)).toEqual('6 tests');
      expect(service.pluralize('test', 1, true)).toEqual('1 test');
    });
  });

  describe('the label formatter', () => {
    it('should format a camel case string', () => {
      expect(service.toLabel('camelCase')).toEqual('Camel case');
    });

    it('should format a snake case string', () => {
      expect(service.toLabel('snake_case')).toEqual('Snake case');
    });

    it('should format a kebab case string', () => {
      expect(service.toLabel('kebab-case')).toEqual('Kebab case');
    });

    it('should set plural', () => {
      expect(service.toLabel('kebab-case', true)).toEqual('Kebab cases');
    });

    it('should format an array of strings', () => {
      let strings: string[] = ['camelCase', 'snake_case', 'kebab-case'];
      let labels = ['Camel case', 'Snake case', 'Kebab case'];
      expect(service.toLabels(strings)).toEqual(labels);
    });

    it('should set plural on an array of strings', () => {
      let strings: string[] = ['camelCase', 'snake_case', 'kebab-case'];
      let labels = ['Camel cases', 'Snake cases', 'Kebab cases'];
      expect(service.toLabels(strings, true)).toEqual(labels);
    });
  });

  describe('the navigation methods', () => {
    describe('stateFromCoreModels', () => {

      let state: ng.ui.IStateService;

      beforeEach(angular.mock.inject(($state) => {
        state = $state;
      }));

      it('should return the state for a given model', () => {
        expect(service.stateFromCoreModel('Test')).toBe('xos.core.tests');
      });
    });
    describe('stateWithParams', () => {
      it('should return the state with params for a given model', () => {
        expect(service.stateWithParams('Test', {id: 1})).toBe('xos.core.tests({id: 1})');
      });
      it('should return the state with params for a given relation', () => {
        expect(service.relatedStateWithParams('Test', '1')).toBe('xos.core.tests({id: 1})');
      });

      it('should return the state with params for usage in js', () => {
        expect(service.stateWithParamsForJs('Test', 1)).toEqual({ name: 'xos.core.tests', params: Object({ id: 1 }) });
      });
    });
  });

  describe('the modelFieldsToColumnsCfg method', () => {
    it('should return an array of columns', () => {

      const cols = service.modelFieldsToColumnsCfg({fields: model.fields, name: 'testUrl', app: 'test', description: '', verbose_name: ''});
      expect(cols[0].label).toBe('Id');
      expect(cols[0].prop).toBe('id');
      expect(cols[0].link).toBeDefined();

      expect(cols[1].label).toBe('Name');
      expect(cols[1].prop).toBe('name');
      expect(cols[1].link).toBeDefined();

      expect(cols[2].label).toBe('Something');
      expect(cols[2].prop).toBe('something');
      expect(cols[2].link).not.toBeDefined();

      expect(cols[3].label).toBe('Else');
      expect(cols[3].prop).toBe('else');
      expect(cols[3].link).not.toBeDefined();

      expect(cols[4]).not.toBeDefined();
    });

    describe('it should handle sync_implemented and policy_implemented options', () => {

      const modelFields: IXosModelDefsField[] = [
        {
          type: 'string',
          name: 'policy_status',
          validators: [],
          read_only: false
        },
        {
          type: 'string',
          name: 'name',
          validators: [],
          read_only: false
        },
        {
          type: 'string',
          name: 'backend_status',
          validators: [],
          read_only: false
        }
      ];

      const model: IXosModeldef = {
        fields: modelFields,
        name: 'testUrl',
        app: 'test',
        description: '',
        verbose_name: ''
      };

      it('should not create columns for policy and sync status unless defined', () => {
        model.policy_implemented = '';
        model.sync_implemented = '';
        const cols = service.modelFieldsToColumnsCfg(model);
        expect(cols.length).toBe(1); // we strip backend_status and policy_status
      });

      it('should create columns for policy and sync status unless defined', () => {
        model.policy_implemented = 'True';
        model.sync_implemented = 'True';
        const cols = service.modelFieldsToColumnsCfg(model);
        expect(cols.length).toBe(3); // we DO NOT strip backend_status and policy_status
      });

    });
  });

  describe('the modelToTableCfg method', () => {
    it('should return a table config', () => {
      service.excluded_fields = ['foo', 'bar'];
      const cfg: IXosTableCfg = service.modelToTableCfg(model, 'testUrl/:id?');
      expect(cfg.columns).toBeDefined();
      expect(cfg.filter).toBe('fulltext');
      expect(cfg.order).toEqual({field: 'id', reverse: false});
      expect(cfg.actions.length).toBe(2);
      expect(cfg.actions[0].label).toEqual('details');
      expect(cfg.actions[1].label).toEqual('delete');
      expect(service.excluded_fields).toEqual(service.base_excluded_fields);
    });
  });

  describe('the modelFieldToInputConfig', () => {
    it('should return an array of inputs', () => {
      const inputs: IXosFormInput[] = service.modelFieldToInputCfg(model.fields);

      expect(inputs[0].name).toBe('name');
      expect(inputs[0].type).toBe('string');
      expect(inputs[0].label).toBe('Name');
      expect(inputs[0].validators.required).toBe(true);

      expect(inputs[1].name).toBe('something');
      expect(inputs[1].type).toBe('string');
      expect(inputs[1].label).toBe('Something');
      expect(inputs[1].validators.maxlength).toBe(30);

      expect(inputs[2].name).toBe('else');
      expect(inputs[2].type).toBe('number');
      expect(inputs[2].label).toBe('Else');
      expect(inputs[2].validators.min).toBe(20);
      expect(inputs[2].validators.max).toBe(40);
    });

    it('should convert boolean defaults to real booleans', () => {
      const fields: IXosModelDefsField[] = [
        {
          type: 'boolean',
          name: 'active',
          default: '"True"',
          validators: [],
          read_only: false
        },
        {
          type: 'boolean',
          name: 'disabled',
          default: '"False"',
          validators: [],
          read_only: false
        },
      ];
      const form_fields = service.modelFieldToInputCfg(fields);
      expect(form_fields[0].default).toBe(true);
      expect(form_fields[1].default).toBe(false);
    });
  });

  describe('the modelToFormCfg method', () => {
    it('should return a form config', () => {
      const config: IXosFormCfg = service.modelToFormCfg(model);
      expect(config.formName).toBe('TestForm');
      expect(config.actions.length).toBe(1);
      expect(config.actions[0].label).toBe('Save');
      expect(config.actions[0].class).toBe('success');
      expect(config.actions[0].icon).toBe('ok');
      expect(config.actions[0].cb).toBeDefined();
      // NOTE 'id' and 'updated' are hidden fields
      expect(config.inputs.length).toBe(3);
    });
  });

  describe('the private methods', () => {
    let modelStoreMock, q, toastr, auth, stateMock, XosFormHelpersMock;

    beforeEach(angular.mock.inject(($q, _toastr_, AuthService, XosFormHelpers) => {
      modelStoreMock = {
        query: () => {
          const subject = new BehaviorSubject([
            {id: 1, humanReadableName: 'test'},
            {id: 2, humanReadableName: 'second'}
          ]);
          return subject.asObservable();
        }
      };
      toastr = _toastr_;
      auth = AuthService;
      XosFormHelpersMock = XosFormHelpers;
      stateMock = {
        get: ''
      };
      q = $q;
    }));

    const field: IXosModelDefsField = {
      name: 'test',
      type: 'number',
      relation: {
        model: 'Test',
        type: 'many_to_one'
      },
      read_only: false
    };

    describe('the populateRelated method', () => {
      const item = {
        test: 2
      };
      it('should add the formatted data to the column definition', () => {
        service = new ConfigHelpers(q, stateMock, toastr, modelStoreMock, XosFormHelpersMock);
        service['populateRelated'](item, item.test, field);
        expect(item['test-formatted']).toBe('second');
      });
    });

    describe('the populateSelectField', () => {

      const input: IXosFormInput = {
        name: 'test',
        label: 'Test',
        type: 'select',
        validators: {},
        read_only: false
      };

      it('should add the available choice to the select', () => {
        service = new ConfigHelpers(q, stateMock, toastr, modelStoreMock, XosFormHelpersMock);
        service['populateSelectField'](field, input);
        expect(input.options).toEqual([
          {id: 1, label: 'test'},
          {id: 2, label: 'second'}
        ]);
      });
    });

    describe('the removeExtraFields method', () => {
      beforeEach(() => {
        service = new ConfigHelpers(q, stateMock, toastr, modelStoreMock, XosFormHelpersMock);
      });

      it('should remove properties not defined in xProto', () => {
        const model: IXosModeldef = {
          name: 'Test',
          app: 'test',
          fields: [
            {
              type: 'number',
              name: 'foo',
              validators: [],
              read_only: false
            },
            {
              type: 'string',
              name: 'bar',
              validators: [],
              read_only: false
            }
          ],
          description: '',
          verbose_name: ''
        };

        const item: any = {
          foo: 1,
          bar: 'existing',
          baz: 'remove me'
        };

        const res = service['removeExtraFields'](item, model);

        expect(res).not.toHaveProp('baz');
      });

      it('should remove properties marked as read_only', () => {
        const model: IXosModeldef = {
          name: 'Test',
          app: 'test',
          fields: [
            {
              type: 'number',
              name: 'write_allowed',
              validators: [],
              read_only: false
            },
            {
              type: 'string',
              name: 'read_only',
              validators: [],
              read_only: true
            }
          ],
          description: '',
          verbose_name: ''
        };

        const item: any = {
          write_allowed: 'existing',
          read_only: 'remove me'
        };

        const res = service['removeExtraFields'](item, model);

        expect(res).not.toHaveProp('read_only');
      });
    });
  });
});

