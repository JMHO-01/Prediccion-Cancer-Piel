// src/app/home/home.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importa CommonModule para directivas como *ngIf
import { FormsModule } from '@angular/forms'; // Importa FormsModule si usas formularios
import { IonicModule } from '@ionic/angular'; 
import { RouterModule, Router } from '@angular/router'; 
import { PredictionService, PredictionResponse } from '../service/prediction.service'; // ← IMPORTAR

import { Subscription } from 'rxjs'; // Necesario para gestionar la suscripción

// Importar AuthService y User
import { AuthService, User } from '../service/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true, // Esto es crucial para los componentes autónomos
  imports: [IonicModule, CommonModule, FormsModule, RouterModule] // Incluye los módulos necesarios
})
export class HomePage implements OnInit {

  selectedFile: File | null = null;
  predictionResult: PredictionResponse | null = null;
  isLoading = false;
  currentUser: User | null = null; // Para almacenar el usuario una vez que el observable lo emita
  private userSubscription: Subscription | undefined; // Para la suscripción al usuario

  constructor(
    private predictionService: PredictionService, // Tu servicio existente
    private authService: AuthService, // Inyectar AuthService
    private router: Router // Inyectar Router
  ) {}

  async ngOnInit() {
    // Suscribirse a los cambios del usuario actual
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
    this.currentUser = user; // Actualiza la propiedad local del componente
    });

    // Asegúrate de cargar el usuario al inicio
    await this.authService.loadCurrentUser();
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe(); // Importante para evitar fugas de memoria
    }
  }

  async logout() {
    await this.authService.logout();
    // AuthService ya maneja la navegación a la página de login
  }

  /**
   * Navega a la página de perfil del usuario.
   */
  goToProfile() {
    this.router.navigate(['/perfil']);
  }

  /**
   * Navega a la página de registro de pacientes.
   */
  goToPatientRegister() {
    this.router.navigate(['/patients-register']);
  }
}