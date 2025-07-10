import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: 'inicio',
    loadComponent: () => import('./inicio/inicio.page').then(m => m.InicioPage)
  },

  {
    path: 'login', // Nueva ruta para la página de login
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },

  {
    path: 'signup', 
    loadComponent: () => import('./loginup/loginup.page').then((m) => m.LoginupPage),
  },

  {
    path: 'perfil', 
    loadComponent: () => import('./perfil/perfil.page').then((m) => m.PerfilPage)
  },

  {
    path: 'home', // Nueva ruta para la página de inicio
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'skin-prediction', // Tu nueva página de predicción
    loadComponent: () => import('./pages/skin-prediction/skin-prediction.page').then((m) => m.SkinPredictionPage),
  },

  {
    path: 'patients-register', // <-- ¡Nueva ruta aquí!
    loadComponent: () => import('./patients-register/patients-register.page').then(m => m.PatientsRegisterPage)
  },
  
  {
    path: 'rf_extract', // <-- ¡Nueva ruta aquí!
    loadComponent: () => import('./rf_extract/rf_extract.page').then(m => m.RfExtractPage)
  },

  {
    path: 'lr_extract', // ¡Nueva ruta para el modelo LR!
    loadComponent: () => import('./lr_extract/lr_extract.page').then(m => m.LrExtractPage)
  },

  {
    path: '',
    redirectTo: 'login', // Cambiado de 'folder/inbox' a 'home'
    pathMatch: 'full',
  },
  {
    path: 'folder/:id',
    loadComponent: () =>
      import('./folder/folder.page').then((m) => m.FolderPage),
  },
];
