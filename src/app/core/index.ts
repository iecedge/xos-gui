import {xosHeader} from './header/header';
import {xosFooter} from './footer/footer';
import {xosNav} from './nav/nav';
import routesConfig from './routes';
import {xosLogin} from './login/login';
import {xosTable} from './table/table';
import {RuntimeStates} from './services/runtime-states';
import {NavigationService} from './services/navigation';
import {PageTitle} from './services/page-title';

export const xosCore = 'xosCore';

angular
  .module('xosCore', ['ui.router'])
  .config(routesConfig)
  .provider('RuntimeStates', RuntimeStates)
  .service('NavigationService', NavigationService)
  .service('PageTitle', PageTitle)
  .component('xosHeader', xosHeader)
  .component('xosFooter', xosFooter)
  .component('xosNav', xosNav)
  .component('xosLogin', xosLogin)
  .component('xosTable', xosTable);
