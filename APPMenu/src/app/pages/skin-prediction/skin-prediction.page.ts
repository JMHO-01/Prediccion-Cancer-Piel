// src/app/skin-prediction/skin-prediction.page.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormsModule, // ¡Importar FormsModule para [(ngModel)]!
  ReactiveFormsModule
} from '@angular/forms'; // Asegúrate de que FormsModule esté aquí
import { IonicModule, ToastController, NavController, ModalController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService, Patient } from '../../service/auth.service'; // Ruta ajustada: '../../service/auth.service'
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-skin-prediction',
  templateUrl: './skin-prediction.page.html',
  styleUrls: ['./skin-prediction.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule, // ¡Añadido aquí!
    ReactiveFormsModule // Mantenido si hay otros formularios reactivos o para consistencia
  ]
})
export class SkinPredictionPage implements OnInit, OnDestroy {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  selectedPatient: Patient | null = null;
  showPatientSelectionModal: boolean = false;
  patientSearchTerm: string = '';

  selectedImageUrl: string | null = null;
  isValidating: boolean = false;
  isLoading: boolean = false;
  showModal: boolean = false;
  predictionResult: any = null;

  private patientsSubscription: Subscription | undefined;

  constructor(
    private authService: AuthService,
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private navCtrl: NavController
  ) {}

  async ngOnInit() {
    // Suscribirse a la lista de pacientes del AuthService
    this.patientsSubscription = this.authService.getPatientsForCurrentUser().subscribe(patients => {
      this.patients = patients;
      this.filterPatients(); // Volver a filtrar la lista cuando cambian los pacientes

      // Opcional: Si el paciente seleccionado ya no está en la lista (ej. eliminado, o usuario diferente),
      // deselecciónalo para evitar un estado inconsistente.
      if (this.selectedPatient && !this.patients.find(p => p.id === this.selectedPatient?.id)) {
        this.selectedPatient = null;
      }
    });

    // Asegúrate de que el usuario actual esté cargado al iniciar el componente
    // para que el `getPatientsForCurrentUser` tenga los datos correctos iniciales.
    await this.authService.loadCurrentUser();
  }

  ngOnDestroy(): void {
    if (this.patientsSubscription) {
      this.patientsSubscription.unsubscribe(); // Desuscribe para limpiar recursos
    }
  }

  // --- Lógica de Selección de Pacientes ---

  async openPatientSelectionModal() {
    this.patientSearchTerm = ''; // Limpiar el término de búsqueda al abrir el modal
    this.filterPatients(); // Filtrar inicialmente
    this.showPatientSelectionModal = true;
  }

  closePatientSelectionModal() {
    this.showPatientSelectionModal = false;
  }

  filterPatients() {
    const searchTermLower = this.patientSearchTerm.toLowerCase();
    this.filteredPatients = this.patients.filter(patient =>
      patient.nombre.toLowerCase().includes(searchTermLower) ||
      patient.apellidos.toLowerCase().includes(searchTermLower)
    );
  }

  selectPatientFromModal(patient: Patient) {
    this.selectedPatient = patient;
    this.closePatientSelectionModal();
  }

  // --- Lógica de Selección de Imagen (existente) ---

  async selectImage() {
    try {
      this.isValidating = true;
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      if (image.dataUrl) {
        this.selectedImageUrl = image.dataUrl;
        setTimeout(() => {
          this.isValidating = false;
        }, 1000);
      } else {
        this.isValidating = false;
        await this.presentToast('No se seleccionó ninguna imagen.', 'warning');
      }
    } catch (error) {
      this.isValidating = false;
      console.error('Error al seleccionar la imagen:', error);
      // await this.presentToast('Error al seleccionar la imagen.', 'danger'); // Habilitar si deseas un toast para errores de cámara
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.isValidating = true;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImageUrl = reader.result as string;
        setTimeout(() => {
          this.isValidating = false;
        }, 1000);
      };
      reader.readAsDataURL(file);
    }
  }

  // --- Lógica de Predicción (placeholder) ---

  async predictImage() {
    if (!this.selectedImageUrl || !this.selectedPatient) {
      await this.presentToast('Por favor, selecciona un paciente y una imagen antes de predecir.', 'warning');
      return;
    }

    this.isLoading = true;
    // Simula una llamada a la API para la predicción
    setTimeout(async () => {
      this.predictionResult = {
        prediction: 'Piel Normal', // Resultado de ejemplo
        confidence: 0.95, // Confianza de ejemplo
        recommendation: 'Mantener una rutina de limpieza e hidratación diaria.' // Recomendación de ejemplo
      };
      this.isLoading = false;
      this.showModal = true;
    }, 2000); // Simula el retardo de red
  }

  // --- Lógica del Modal ---

  closeModal() {
    this.showModal = false;
    this.predictionResult = null; // Limpiar el resultado al cerrar
  }

  analyzeAnother() {
    this.closeModal();
    this.selectedImageUrl = null;
    this.predictionResult = null;
  }

  // --- Métodos de Ayuda para Estilos del Resultado ---

  getResultClass(): string {
    if (this.predictionResult?.prediction === 'Piel Normal') {
      return 'normal-skin';
    } else if (this.predictionResult?.prediction === 'Riesgo de Acné') {
      return 'acne-risk';
    }
    return ''; // Valor por defecto
  }

  getProgressColor(): string {
    if (this.predictionResult?.confidence > 0.8) {
      return 'success';
    } else if (this.predictionResult?.confidence > 0.5) {
      return 'warning';
    }
    return 'danger';
  }

  // --- Controlador de Toast (existente) ---
  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}