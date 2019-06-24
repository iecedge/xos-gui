
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


// TODO test me hard!!!

import * as _ from 'lodash';
import {IXosModeldefsService, IXosModeldef, IXosModelDefsRelation} from '../rest/modeldefs.rest';
import {IXosTableCfg} from '../../core/table/table';
import {IXosFormCfg} from '../../core/form/form';
import {IXosNavigationService} from '../../core/services/navigation';
import {IXosConfigHelpersService, IXosModelDefsField} from '../../core/services/helpers/config.helpers';
import {IXosRuntimeStatesService, IXosState} from '../../core/services/runtime-states';
import {IXosModelStoreService} from '../stores/model.store';
import {IXosAuthService} from '../rest/auth.rest';
import {IXosModeldefsCache} from './modeldefs.service';

export interface IXosModel {
  name: string; // the model name
  app: string; // the service to wich it belong
  fields: IXosModelDefsField[];
  relations?: IXosModelDefsRelation[];
  backendUrl?: string; // the api endpoint
  clientUrl?: string; // the view url
  tableCfg?: IXosTableCfg;
  formCfg?: IXosFormCfg;
  description: string;
  verbose_name: string;
}

// Service
export interface IXosModelDiscovererService {
  discover(): ng.IPromise<string>;
  getApiUrlFromModel(model: IXosModel): string;
  areModelsLoaded(): boolean;
  getStatusMessage(): string;
}

export class XosModelDiscovererService implements IXosModelDiscovererService {
  static $inject = [
    '$log',
    '$q',
    '$interval',
    'XosModelDefs',
    'ConfigHelpers',
    'XosRuntimeStates',
    'XosNavigationService',
    'XosModelStore',
    'ngProgressFactory',
    'AuthService',
    'XosModeldefsCache'
  ];

  private xosServices: string[] = []; // list of loaded services
  private progressBar;
  private modelsLoaded: boolean = false;
  private statusMessage: string = 'Loading models definition';

  constructor (
    private $log: ng.ILogService,
    private $q: ng.IQService,
    private $interval: ng.IIntervalService,
    private XosModelDefs: IXosModeldefsService,
    private ConfigHelpers: IXosConfigHelpersService,
    private XosRuntimeStates: IXosRuntimeStatesService,
    private XosNavigationService: IXosNavigationService,
    private XosModelStore: IXosModelStoreService,
    private ngProgressFactory: any, // check for type defs
    private AuthService: IXosAuthService,
    private XosModeldefsCache: IXosModeldefsCache
  ) {
    this.progressBar = this.ngProgressFactory.createInstance();
    this.progressBar.setColor('#f6a821');
  }

  public areModelsLoaded(): boolean {
    return this.modelsLoaded;
  }

  public getApiUrlFromModel(model: IXosModel): string {
    if (model.app === 'core') {
      return `/core/${this.ConfigHelpers.pluralize(model.name.toLowerCase())}`;
    }
    else {
      const serviceName = this.XosModeldefsCache.serviceNameFromAppName(model.app);
      return `/${serviceName}/${this.ConfigHelpers.pluralize(model.name.toLowerCase())}`;
    }
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public discover() {
    const d = this.$q.defer();
    // loading stats
    let loadingSince = 0;
    const modelDefInerval = this.$interval(() => {
      loadingSince += 1;
      this.setModelDefTimeMsg(loadingSince);
    }, 1000);
    this.progressBar.set(1);

    // start loading data
    this.XosModelDefs.get()
      .then((modelsDef: IXosModeldef[]) => {
        const pArray = [];

        // Setting up counters for the status message
        this.$interval.cancel(modelDefInerval);
        const modelsTotal = modelsDef.length;
        let modelsLoaded = 0;
        this.setModelsCountMsg(modelsLoaded, modelsTotal);

        // Setting up counters for the loading bar
        this.progressBar.set(10);
        const progressBarStep = 90 / modelsTotal;

        _.forEach(modelsDef, (model: IXosModeldef) => {
          this.$log.debug(`[XosModelDiscovererService] Loading: ${model.name}`);
          let p = this.cacheModelEntries(model)
            .then(model => {
              return this.addState(model);
            })
            .then(model => {
              return this.addNavItem(model);
            })
            .then(model => {
              return this.getTableCfg(model);
            })
            .then(model => {
              return this.getFormCfg(model);
            })
            .then(model => {
              return this.storeModel(model);
            })
            .then(model => {
              // Updating the status message
              modelsLoaded = modelsLoaded + 1;
              this.setModelsCountMsg(modelsLoaded, modelsTotal);

              // Updating the progress bar
              this.progressBar.set(10 + (modelsLoaded * progressBarStep));

              this.$log.debug(`[XosModelDiscovererService] Model ${model.name} stored`);
              return this.$q.resolve('true');
            })
            .catch(err => {
              this.$log.warn(`[XosModelDiscovererService] Model ${model.name} NOT stored`, err);
              const isAuthError = this.AuthService.isAuthError(err);
              if (isAuthError) {
                this.$log.warn(`[XosModelDiscovererService] User is not authentincated`);
                return this.$q.reject(err);
              }
              return this.$q.resolve('false');
            });
            pArray.push(p);
        });


        this.$q.all(pArray)
          .then((res) => {
            // the ModelLoader promise won't ever be reject, in case it will be resolve with value false,
            // that's because we want to wait anyway for all the models to be loaded
            if (res.indexOf('false') > -1) {
              return d.resolve(false);
            }
            d.resolve(true);
            this.modelsLoaded = true;
          })
          .catch((e) => {
            this.XosModelStore.clean(); // reset all the observable otherwise they'll store login errors
            this.$log.warn(`[XosModelDiscovererService]`, e);
            // the ModelLoader promise will be rejected in case of authentication error
            d.reject(e);
          })
          .finally(() => {
            this.progressBar.complete();
          });
      })
      .catch(err => {
        this.progressBar.complete();
        this.$log.error(`[XosModelDiscovererService] Cannot load model defs`, err);
        return d.resolve('chameleon');
      });
    return d.promise;
  }

  private setModelDefTimeMsg(seconds: number) {
    this.statusMessage = `Loading models definition for ${seconds} seconds...`;
  }

  private setModelsCountMsg(loaded: number, modelsTotal: number) {
    const percent = Math.round((100 * loaded) / modelsTotal);
    this.statusMessage = `Loading data.... ${percent}% completed (${loaded} of ${modelsTotal} models)`;
  }

  private stateNameFromModel(model: IXosModel): string {
    return `xos.${this.XosModeldefsCache.serviceNameFromAppName(model.app)}.${model.name.toLowerCase()}`;
  }

  private getParentStateFromModel(model: IXosModel): string {
    let parentState: string;
    if (model.app === 'core') {
      parentState = 'xos.core';
    }
    else {
      const serviceName = this.addService(model);
      parentState = `xos.${serviceName}`;
    }
    return parentState;
  }

  // add a service state and navigation item if it is not already there
  private addService(model: IXosModel): string {
    const serviceName: string = this.XosModeldefsCache.serviceNameFromAppName(model.app);
    if (!_.find(this.xosServices, n => n === serviceName)) {
      const serviceState = {
        url: serviceName,
        parent: 'xos',
        abstract: true,
        template: '<div ui-view></div>'
      };
      this.XosRuntimeStates.addState(`xos.${serviceName}`, serviceState);

      this.XosNavigationService.add({
        label: this.ConfigHelpers.toLabel(serviceName),
        state: `xos.${serviceName}`,
      });
      this.xosServices.push(serviceName);
    }
    return serviceName;
  }

  private addState(model: IXosModel): ng.IPromise<IXosModel> {
    const d = this.$q.defer();
    const clientUrl = `/${this.ConfigHelpers.pluralize(model.name.toLowerCase())}/:id?`;
    const state: IXosState = {
      parent: this.getParentStateFromModel(model),
      url: clientUrl,
      params: {
        id: null
      },
      data: {
        model: model.name,
      },
      component: 'xosCrud',
    };

    if (angular.isDefined(model.relations)) {
      state.data.relations = model.relations;
    }

    try {
      this.XosRuntimeStates.addState(
        this.stateNameFromModel(model),
        state
      );

      // extend model
      model.clientUrl = `${this.XosModeldefsCache.serviceNameFromAppName(model.app)}${clientUrl}`;

      d.resolve(model);
    } catch (e) {
      d.reject(e);
    }
    return d.promise;
  }

  private addNavItem(model: IXosModel): ng.IPromise<IXosModel> {
    const d = this.$q.defer();

    const stateName = this.stateNameFromModel(model);

    const parentState: string = this.getParentStateFromModel(model);

    try {
      const name = model.verbose_name ? model.verbose_name : model.name;
      this.XosNavigationService.add({
        label: this.ConfigHelpers.pluralize(name),
        state: stateName,
        parent: parentState
      });
      d.resolve(model);
    } catch (e) {
      d.reject(e);
    }


    return d.promise;
  }

  private cacheModelEntries(model: IXosModel): ng.IPromise<IXosModel> {

    const d = this.$q.defer();

    const apiUrl = this.getApiUrlFromModel(model);
    this.XosModelStore.query(model.name, apiUrl)
      .skip(1) // NOTE observables returns as first an empty array, so skip it
      .subscribe(
        () => {
          return d.resolve(model);
        },
        err => {
          return d.reject(err);
        }
      );

    return d.promise;
  }

  private getTableCfg(model: IXosModel): ng.IPromise<IXosModel> {

    const d = this.$q.defer();

    const stateUrl = this.stateNameFromModel(model);

    model.tableCfg = this.ConfigHelpers.modelToTableCfg(model, stateUrl);

    d.resolve(model);

    return d.promise;
  }

  private getFormCfg(model: IXosModel): ng.IPromise<IXosModel> {

    const d = this.$q.defer();

    model.formCfg = this.ConfigHelpers.modelToFormCfg(model);

    d.resolve(model);

    return d.promise;
  }

  private storeModel(model: IXosModel): ng.IPromise<IXosModel> {

    const d = this.$q.defer();

    this.XosModeldefsCache.cache(model);

    d.resolve(model);

    return d.promise;
  }
}
