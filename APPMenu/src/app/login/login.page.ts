// src/app/login/login.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Importa Router
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonLabel,
  IonText,
  IonSpinner,
  ToastController // Importar ToastController para mensajes
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  medical, // No usado en este diseño pero lo mantengo por si es parte de tu app general
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline, medkitOutline, personOutline
} from 'ionicons/icons';
import { AuthService } from '../service/auth.service'; // Importar AuthService

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonLabel,
    IonText,
    IonSpinner
  ]
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false; // Puedes usar esto para mostrar un spinner en el botón al iniciar sesión

  constructor(
    private formBuilder: FormBuilder,
    private router: Router, // Inyecta Router
    private authService: AuthService, // Inyectar AuthService
    private toastController: ToastController // Inyectar ToastController
  ) {
    this.addIcons();
    this.initializeForm();
  }

  async ngOnInit() {
    // Verifica si ya está autenticado, si es así, redirige a la página principal
    this.authService.isAuthenticated().then(isAuth => {
      if (isAuth) {
        this.router.navigate(['/home']);
      }
    });
  }

  /**
   * Registra los iconos necesarios para la página
   */
  private addIcons() {
    addIcons({
      medical,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline
    });
  }

  /**
   * Inicializa el formulario reactivo con validaciones
   */
  private initializeForm() {
    this.loginForm = this.formBuilder.group({
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(50)
        ]
      ],
      rememberMe: [false]
    });
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Verifica si un campo del formulario es inválido y ha sido tocado
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);

    if (!field || !field.errors) {
      return '';
    }

    const errors = field.errors;

    switch (fieldName) {
      case 'email':
        if (errors['required']) return 'El correo electrónico es requerido';
        if (errors['email'] || errors['pattern']) return 'Ingresa un correo electrónico válido';
        break;

      case 'password':
        if (errors['required']) return 'La contraseña es requerida';
        if (errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
        if (errors['maxlength']) return 'La contraseña no puede exceder 50 caracteres';
        break;
    }

    return 'Campo inválido';
  }

  /**
   * Maneja el envío del formulario de login
   */
  async onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true; // Mostrar spinner
      const formData = this.loginForm.value;

      // Usar el servicio de autenticación para el login
      const success = await this.authService.login(formData);
      this.isLoading = false;

      if (success) {
        this.router.navigate(['/home']); // Navega a la página principal si el login fue exitoso
      }
      // El mensaje Toast es manejado por el AuthService
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      this.markAllFieldsAsTouched();
      await this.presentToast('Por favor, completa todos los campos correctamente.', 'danger');
    }
  }

  /**
   * Marca todos los campos del formulario como "tocados"
   */
  private markAllFieldsAsTouched() {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  /**
   * Muestra un mensaje Toast en la parte inferior de la pantalla.
   * @param message El mensaje a mostrar.
   * @param color El color del Toast.
   */
  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  /**
   * Maneja la recuperación de contraseña
   */
  forgotPassword() {
    console.log('Recuperar contraseña clickeado');
    // Aquí puedes navegar a tu página de recuperación
    // this.router.navigate(['/forgot-password']);
  }

  /**
   * Navega a la página de registro
   */
  goToRegister() {
    console.log('Ir a registro clickeado');
    this.router.navigate(['/signup']); // Navega a la ruta de registro
  }
}