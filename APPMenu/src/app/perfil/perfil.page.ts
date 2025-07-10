// src/app/perfil/perfil.page.ts
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core'; // Añadido OnDestroy
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonImg,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonButtons,
  IonMenuButton,
  ToastController,
  IonSpinner
} from '@ionic/angular/standalone';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { personCircleOutline, cameraOutline, addCircleOutline } from 'ionicons/icons';
import { AuthService, UserProfile, User } from '../service/auth.service'; // Asegúrate de que la ruta sea correcta y añade 'User'
import { Subscription } from 'rxjs'; // Importar Subscription

@Component({
  selector: 'app-profile',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonImg, IonIcon, IonItem, IonLabel, IonInput, IonButton, IonText,
    IonButtons,
    IonMenuButton,
    IonSpinner
  ],
})
export class PerfilPage implements OnInit, OnDestroy { // Implementar OnDestroy

  profileForm!: FormGroup;
  profileImageUrl: string | undefined;
  isLoading: boolean = false;
  private userSubscription: Subscription | undefined; // Para almacenar la suscripción
  currentUser: User | null = null; // Para almacenar la referencia al usuario actual en el componente

  constructor(
    private fb: FormBuilder,
    private zone: NgZone,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    addIcons({ cameraOutline, addCircleOutline, personCircleOutline });
  }

  async ngOnInit() {
    this.profileForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellidos: ['', [Validators.required, Validators.minLength(2)]],
      edad: ['', [Validators.required, Validators.min(1), Validators.max(80), Validators.pattern(/^\d+$/)]],
      // El correo es deshabilitado en el formulario, pero su valor se obtendrá del currentUser
      correo: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      especialidad: ['', [Validators.required, Validators.minLength(3)]],
    });

    // Suscribirse a los cambios del usuario actual
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user; // Actualizar la propiedad local del componente
      this.populateFormWithUserProfile(user); // Rellenar el formulario con los datos del perfil
    });

    // Cargar el usuario actual al inicializar el componente.
    // Esto disparará la suscripción y rellenará el formulario.
    await this.authService.loadCurrentUser();
  }

  ngOnDestroy(): void {
    // Desuscribirse para evitar fugas de memoria cuando el componente se destruya
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Rellena el formulario con los datos del perfil del usuario.
   * Se llama cada vez que el `currentUser` cambia.
   */
  private populateFormWithUserProfile(user: User | null): void {
    if (user && user.profile) {
      this.profileForm.patchValue({
        nombre: user.profile.nombre,
        apellidos: user.profile.apellidos,
        edad: user.profile.edad,
        correo: user.profile.correo, // Establece el correo para el campo deshabilitado
        especialidad: user.profile.especialidad,
      });
      this.profileImageUrl = user.profile.profileImageUrl;
    } else if (user) {
      // Si el usuario existe pero no tiene perfil, pre-rellena el correo y el nombre de usuario
      this.profileForm.patchValue({
        correo: user.email,
        nombre: user.username || '' // Usar username como nombre por defecto si no hay perfil
      });
      this.profileImageUrl = undefined; // Asegurarse de que no haya imagen si no hay perfil
    } else {
      // Si no hay usuario logeado, resetear el formulario y la imagen
      this.profileForm.reset();
      this.profileImageUrl = undefined;
    }
  }

  // --- Logic for Profile Photo Selection (Capacitor Camera) ---
  async selectProfileImage() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl, // Cambiado a DataUrl para almacenar en localStorage más fácilmente
        source: CameraSource.Photos
      });

      if (image.dataUrl) { // Ahora usamos dataUrl
        this.zone.run(() => {
          this.profileImageUrl = image.dataUrl;
        });
      }
    } catch (error) {
      console.error('Error al seleccionar la imagen:', error);
      await this.presentToast('No se pudo seleccionar la imagen.', 'danger');
    }
  }

  // --- Logic to Save Profile ---
  async saveProfile() {
    if (this.profileForm.invalid) {
      console.log('Formulario inválido. Por favor, revisa los campos.');
      this.profileForm.markAllAsTouched();
      await this.presentToast('Por favor, completa todos los campos requeridos correctamente.', 'danger');
      return;
    }

    if (!this.currentUser) {
      await this.presentToast('No hay un usuario logeado para actualizar el perfil.', 'danger');
      return;
    }

    this.isLoading = true; // Activar spinner

    const profileData: UserProfile = {
      ...this.profileForm.getRawValue(), // Usa getRawValue() para obtener valores de campos deshabilitados (como 'correo')
      // Asegúrate de que el correo sea el del usuario actual del AuthService, no el del formulario
      correo: this.currentUser.email,
      profileImageUrl: this.profileImageUrl
    };

    const success = await this.authService.updateUserProfile(profileData);
    this.isLoading = false; // Desactivar spinner

    if (!success) {
      await this.presentToast('Error al guardar el perfil. Inténtalo de nuevo.', 'danger');
    }
    // El mensaje de éxito ya lo maneja el AuthService
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  getErrorMessage(controlName: string): string {
    const control = this.profileForm.get(controlName);
    if (control?.invalid && (control.dirty || control.touched)) {
      if (control.errors?.['required']) {
        return 'Este campo es requerido.';
      }
      if (control.errors?.['minlength']) {
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres.`;
      }
      if (control.errors?.['email']) {
        return 'Formato de correo inválido.';
      }
      if (control.errors?.['min'] || control.errors?.['max']) {
        return 'Edad debe ser entre 1 y 80.';
      }
      if (control.errors?.['pattern']) {
        return 'Solo números son permitidos.';
      }
    }
    return '';
  }

  async logout() {
    await this.authService.logout();
  }
}