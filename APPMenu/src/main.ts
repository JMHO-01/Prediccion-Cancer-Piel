import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core'; // <-- Asegúrate de que este import exista

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

// *** NUEVAS LÍNEAS AQUÍ ***
import { addIcons } from 'ionicons';
import {
  scanCircleOutline,
  informationCircleOutline,
  cameraOutline,
  flaskOutline,
  personAddOutline, // <-- ¡Nuevo ícono para registrar paciente!
  close, // <-- Nuevo ícono si lo usas en el modal
  medicalOutline, // <-- Nuevo ícono si lo usas en el modal
  analyticsOutline, // <-- Asegúrate de que este también esté
  checkmarkOutline // <-- Asegúrate de que este también esté
} from 'ionicons/icons'; // Agrega todos los íconos que uses

// Asegúrate de añadir todos los íconos que usas en tu app
addIcons({
  scanCircleOutline,
  informationCircleOutline,
  cameraOutline,
  flaskOutline,
  personAddOutline, // <-- Añadir este ícono
  close,
  medicalOutline,
  analyticsOutline,
  checkmarkOutline
});
// *** FIN DE NUEVAS LÍNEAS ***

// --- Módulos a importar para tus componentes standalone ---
import { IonicStorageModule } from '@ionic/storage-angular'; // <-- ¡Importar esto!
import { ReactiveFormsModule } from '@angular/forms'; // <-- ¡Importar esto!

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(), // Proveedor para HttpClient
    // --- IMPORTAR MÓDULOS PARA COMPONENTES STANDALONE ---
    importProvidersFrom(
      IonicStorageModule.forRoot(), // <-- Añadir el módulo de Storage
      ReactiveFormsModule // <-- Añadir el módulo de formularios reactivos
    ),
  ],
});