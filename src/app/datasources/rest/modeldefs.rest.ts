
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


import {IXosModelDefsField} from '../../core/services/helpers/config.helpers';
import {IXosAppConfig} from '../../../index';
import IPromise = angular.IPromise;

export interface IXosModelDefsRelation {
  model: string; // model name
  type: string; // relation type
  on_field: string; // the field that is containing the relation
}

export interface IXosModeldef {
  fields: IXosModelDefsField[];
  relations?: IXosModelDefsRelation[];
  name: string;
  app: string;
  description: string;
  verbose_name: string;
  sync_implemented?: string;
  policy_implemented?: string;
}

export interface IXosModeldefsService {
  get(): IPromise<IXosModeldef[]>;
}

export class XosModeldefsService implements IXosModeldefsService {

  static $inject = ['$http', '$q', 'AppConfig'];

  constructor(
    private $http: angular.IHttpService,
    private $q: angular.IQService,
    private AppConfig: IXosAppConfig
  ) {
  }

  public get(): IPromise<IXosModeldef[]> {
    const d = this.$q.defer();
    this.$http.get(`${this.AppConfig.apiEndpoint}/modeldefs`, {timeout: 10 * 1000})
      .then((res: any) => {
        d.resolve(res.data.items);
      })
      .catch(e => {
        d.reject(e);
      });
    return d.promise;
  }
}
