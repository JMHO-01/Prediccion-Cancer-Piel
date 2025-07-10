// src/app/loginup/loginup.page.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router'; // Importa Router
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner, // Por si quieres añadir un spinner al botón de registro
  ToastController // Importar ToastController para mensajes
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  lockClosedOutline,
  personOutline,
  keyOutline,
  eyeOutline,
  eyeOffOutline
} from 'ionicons/icons';
import { AuthService } from '../service/auth.service'; // Importar AuthService

@Component({
  selector: 'app-loginup',
  templateUrl: './loginup.page.html',
  styleUrls: ['./loginup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner
  ]
})
export class LoginupPage implements OnInit {
  signupForm!: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false; // Puedes usar esto para mostrar un spinner en el botón

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService, // Inyectar AuthService
    private toastController: ToastController // Inyectar ToastController
  ) {
    this.addIcons();
    this.initializeForm();
  }

  ngOnInit() {
    // Inicialización adicional si es necesaria
  }

  /**
   * Registra los iconos necesarios para la página
   */
  private addIcons() {
    addIcons({
      mailOutline,
      lockClosedOutline,
      personOutline,
      keyOutline,
      eyeOutline,
      eyeOffOutline
    });
  }

  /**
   * Inicializa el formulario reactivo con validaciones
   */
  private initializeForm() {
    this.signupForm = this.formBuilder.group({
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*$/) // Solo letras, números, puntos y guiones bajos
        ]
      ],
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
          Validators.maxLength(50),
          Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/) // Al menos una letra, un número y 6 caracteres
        ]
      ],
      confirmPassword: [
        '',
        Validators.required
      ]
    }, { validators: this.passwordMatchValidator }); // Añade el validador personalizado a nivel de grupo
  }

  /**
   * Validador personalizado para confirmar que las contraseñas coinciden
   */
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  /**
   * Alterna la visibilidad de la contraseña
   */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  /**
   * Alterna la visibilidad de la confirmación de contraseña
   */
  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Verifica si un campo del formulario es inválido y ha sido tocado
   */
  isFieldInvalidSignup(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getErrorMessageSignup(fieldName: string): string {
    const field = this.signupForm.get(fieldName);

    if (!field || !field.errors) {
      return '';
    }

    const errors = field.errors;

    switch (fieldName) {
      case 'username':
        if (errors['required']) return 'El nombre de usuario es requerido';
        if (errors['minlength']) return 'El nombre de usuario debe tener al menos 3 caracteres';
        if (errors['maxlength']) return 'El nombre de usuario no puede exceder 50 caracteres';
        if (errors['pattern']) return 'Solo letras, números, puntos o guiones bajos';
        break;

      case 'email':
        if (errors['required']) return 'El correo electrónico es requerido';
        if (errors['email'] || errors['pattern']) return 'Ingresa un correo electrónico válido';
        break;

      case 'password':
        if (errors['required']) return 'La contraseña es requerida';
        if (errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres';
        if (errors['maxlength']) return 'La contraseña no puede exceder 50 caracteres';
        if (errors['pattern']) return 'Debe contener letras y números';
        break;

      case 'confirmPassword':
        if (errors['required']) return 'La confirmación de la contraseña es requerida';
        // El error de passwordMismatch se maneja a nivel de formulario
        break;
    }

    return 'Campo inválido';
  }

  /**
   * Maneja el envío del formulario de registro
   */
  async onSignup() {
    // Si la validación del formulario es correcta y no hay error de passwordMismatch
    if (this.signupForm.valid && !this.signupForm.errors?.['passwordMismatch']) {
      this.isLoading = true; // Mostrar spinner
      const formData = this.signupForm.value;

      // Usar el servicio de autenticación para el registro
      const success = await this.authService.register(formData);
      this.isLoading = false;

      if (success) {
        this.router.navigate(['/login']); // Redirige al login después del registro exitoso
      }
      // El mensaje Toast es manejado por el AuthService
    } else {
      // Marcar todos los campos como tocados para mostrar errores
      this.markAllFieldsAsTouchedSignup();
      if (this.signupForm.errors?.['passwordMismatch']) {
        await this.presentToast('Las contraseñas no coinciden.', 'danger');
      } else {
        await this.presentToast('Por favor, completa todos los campos correctamente.', 'danger');
      }
    }
  }

  /**
   * Marca todos los campos del formulario como "tocados"
   */
  private markAllFieldsAsTouchedSignup() {
    Object.keys(this.signupForm.controls).forEach(key => {
      this.signupForm.get(key)?.markAsTouched();
    });
    // Marcar el formulario completo también si hay validadores a nivel de grupo
    this.signupForm.markAsTouched();
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
   * Navega a la página de inicio de sesión
   */
  goToSignIn() {
    console.log('Ir a inicio de sesión clickeado');
    this.router.navigate(['/login']); // Asegúrate de que esta sea la ruta correcta para tu login
  }
}
