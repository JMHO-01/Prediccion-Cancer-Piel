// src/app/rf_extract/rf_extract.page.ts
import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
  IonButtons,
  IonBackButton,
  IonModal,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonProgressBar,
  IonNote,
  ToastController,
  LoadingController,
  NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  imageOutline,
  analyticsOutline,
  close,
  personCircleOutline,
  personAddOutline,
  checkmarkCircle,
  medicalOutline,
  checkmarkOutline,
  warningOutline,
  closeCircleOutline
} from 'ionicons/icons';
import { Router, RouterLink } from '@angular/router';
// Importamos AuthService y Patient desde allí (esto es crucial y evita duplicación de Patient)
import { AuthService, Patient } from '../service/auth.service'; // Asegúrate de que la ruta sea correcta
import { RfExtractService, PredictionResult, ImageValidationResult } from '../service/rf_extract.service';
import { Subscription } from 'rxjs'; // Importar Subscription para gestionar la suscripción

@Component({
  selector: 'app-rf-extract',
  templateUrl: './rf_extract.page.html',
  styleUrls: ['./rf_extract.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
    IonButtons,
    IonBackButton,
    IonModal,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonProgressBar,
    IonNote,
    RouterLink,
  ],
})
export class RfExtractPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  selectedImageUrl: string | null = null;
  isLoading = false;
  isValidating = false;
  isImageValidForPrediction: boolean | null = null;
  validationMessage: string | null = null;

  predictionResult: PredictionResult | null = null;
  showModal = false;

  patients: Patient[] = [];
  selectedPatient: Patient | null = null;
  showPatientSelectionModal = false;
  patientSearchTerm: string = '';
  filteredPatients: Patient[] = [];

  private patientsSubscription: Subscription | undefined; // Para la suscripción de pacientes

  constructor(
    private rfExtractService: RfExtractService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private router: Router,
    private authService: AuthService // ¡Inyectar AuthService para acceder a los pacientes!
  ) {
    addIcons({
      imageOutline,
      analyticsOutline,
      close,
      personCircleOutline,
      personAddOutline,
      checkmarkCircle,
      medicalOutline,
      checkmarkOutline,
      warningOutline,
      closeCircleOutline,
    });
  }

  async ngOnInit() {
    // La parte CRÍTICA para obtener los pacientes reactivamente desde AuthService
    this.patientsSubscription = this.authService.getPatientsForCurrentUser().subscribe(patients => {
      // Este bloque se ejecuta cada vez que la lista de pacientes cambia en AuthService
      console.log('RfExtractPage: Pacientes recibidos del AuthService:', patients); // Para depuración
      this.patients = patients; // Actualiza la lista de pacientes del componente
      this.filterPatients(); // Vuelve a filtrar para actualizar la lista mostrada en el modal

      // Opcional: Si el paciente seleccionado ya no está en la lista actualizada, deselecciónalo
      if (this.selectedPatient && !this.patients.find(p => p.id === this.selectedPatient?.id)) {
        this.selectedPatient = null;
        console.log('RfExtractPage: El paciente seleccionado ya no existe, deseleccionado.'); // Para depuración
      }
    });

    // Asegurarse de que el usuario actual esté cargado. Esto es importante
    // para que el AuthService pueda proporcionar la lista de pacientes correcta al inicio
    // (ya que getPatientsForCurrentUser() depende de currentUser$).
    await this.authService.loadCurrentUser();
  }

  ngOnDestroy() {
    // Desuscribirse para evitar fugas de memoria. Esto es CRÍTICO.
    if (this.patientsSubscription) {
      this.patientsSubscription.unsubscribe();
      console.log('RfExtractPage: Suscripción a pacientes desuscrita.'); // Para depuración
    }
    // Revocar URL de imagen si existe para liberar recursos
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
    }
  }

  // --- Métodos de gestión de pacientes y modal ---

  filterPatients() {
    console.log('RfExtractPage: Filtrando pacientes con término:', this.patientSearchTerm); // Para depuración
    if (!this.patientSearchTerm) {
      // Si no hay término de búsqueda, muestra todos los pacientes,
      // invierte el orden para que el último ingresado aparezca primero.
      this.filteredPatients = [...this.patients].reverse(); // Crea una copia y la invierte
    } else {
      const lowerCaseSearchTerm = this.patientSearchTerm.toLowerCase();
      this.filteredPatients = this.patients.filter(
        (patient) =>
          patient.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
          patient.apellidos.toLowerCase().includes(lowerCaseSearchTerm)
      );
      // Opcional: invierte también los resultados de búsqueda si quieres el más reciente primero
      this.filteredPatients.reverse();
    }
    console.log('RfExtractPage: Pacientes filtrados resultantes:', this.filteredPatients); // Para depuración
  }

  selectPatientFromModal(patient: Patient) {
    this.selectedPatient = patient;
    this.closePatientSelectionModal();
    console.log('RfExtractPage: Paciente seleccionado:', patient); // Para depuración
  }

  openPatientSelectionModal() {
    this.patientSearchTerm = ''; // Limpiar término de búsqueda al abrir
    this.filterPatients(); // Refiltrar para mostrar todos los pacientes (ordenados por fecha de adición)
    this.showPatientSelectionModal = true;
    console.log('RfExtractPage: Modal de selección de paciente abierto.'); // Para depuración
  }

  closePatientSelectionModal() {
    this.showPatientSelectionModal = false;
    console.log('RfExtractPage: Modal de selección de paciente cerrado.'); // Para depuración
  }

  // --- Métodos de selección de imagen y predicción ---

  selectImage() {
    this.fileInput.nativeElement.click();
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Reiniciar estados al seleccionar una nueva imagen
      this.selectedFile = null;
      if (this.selectedImageUrl) {
        URL.revokeObjectURL(this.selectedImageUrl);
        this.selectedImageUrl = null;
      }
      this.predictionResult = null;
      this.isImageValidForPrediction = null; // Por defecto, la imagen no es válida hasta que se valide
      this.validationMessage = null; // Reinicia el mensaje de validación

      this.isValidating = true; // Iniciar estado de validación

      // Validación básica del tipo de archivo en el cliente (antes de enviar al backend)
      if (!file.type.startsWith('image/')) {
        await this.presentToast('Tipo de archivo no permitido. Por favor, selecciona una imagen.', 'danger');
        this.isValidating = false;
        return;
      }

      this.selectedFile = file;
      this.selectedImageUrl = URL.createObjectURL(file);
      console.log('RfExtractPage: Imagen seleccionada y URL creada:', this.selectedImageUrl); // Para depuración

      const validationLoading = await this.loadingController.create({
        message: 'Validando imagen con el servidor...',
        spinner: 'dots',
      });
      await validationLoading.present();

      try {
        // --- LLAMADA AL NUEVO ENDPOINT DE VALIDACIÓN EN EL BACKEND ---
        const validationResponse: ImageValidationResult = await this.rfExtractService.validateImage(file);

        if (validationResponse.success) {
          this.isImageValidForPrediction = validationResponse.is_skin;
          this.validationMessage = validationResponse.message;

          const messageToDisplay: string = this.validationMessage || 'Mensaje de validación no disponible.';

          if (!validationResponse.is_skin) {
            await this.presentToast(messageToDisplay, 'warning');
          } else {
            await this.presentToast(messageToDisplay, 'success');
          }
        } else {
          this.isImageValidForPrediction = false;
          this.validationMessage = validationResponse.error || 'Error desconocido al validar la imagen.';
          await this.presentToast(this.validationMessage, 'danger');
        }
      } catch (error: any) {
        console.error('Error al validar imagen con la API:', error);
        this.isImageValidForPrediction = false;
        this.validationMessage = error.message || 'Error de red o del servidor al validar la imagen. Intenta de nuevo.';
        // FIX: Use nullish coalescing operator (??) to provide a fallback string
        await this.presentToast(this.validationMessage ?? 'Mensaje de error no disponible.', 'danger');
      } finally {
        await validationLoading.dismiss();
        this.isValidating = false;
      }
    }
  }

  async predictImage() {
    if (!this.selectedFile) {
      await this.presentToast('Por favor, selecciona una imagen primero.', 'danger');
      return;
    }
    if (!this.selectedPatient) {
      await this.presentToast('Por favor, selecciona un paciente primero.', 'danger');
      return;
    }
    // --- VERIFICAR SI LA IMAGEN YA FUE VALIDADA EXITOSAMENTE POR EL BACKEND ---
    if (this.isImageValidForPrediction === false) {
      const messageToDisplay: string = this.validationMessage || 'La imagen seleccionada no es adecuada para el análisis de piel.';
      await this.presentToast(messageToDisplay, 'danger');
      return;
    }

    if (this.isImageValidForPrediction === null) {
      await this.presentToast('Por favor, espera a que la imagen sea validada antes de predecir.', 'warning');
      return;
    }
    // --- FIN VERIFICACIÓN ---

    this.isLoading = true; // Iniciar estado de carga de predicción
    const loadingPrediction = await this.loadingController.create({
      message: 'Analizando imagen y generando recomendación...',
      spinner: 'crescent',
    });
    await loadingPrediction.present();

    try {
      // Si la validación previa fue exitosa, procedemos con la predicción
      const result: PredictionResult = await this.rfExtractService.predictImage(this.selectedFile, this.selectedPatient);
      this.predictionResult = result;
      this.showModal = true;
      await this.presentToast('Predicción completada exitosamente.', 'success');
    } catch (error: any) {
      console.error('Error durante la predicción:', error);
      let errorMessage = 'Ocurrió un error inesperado al realizar la predicción.';
      if (error && error.message) {
        errorMessage = error.message;
      }
      await this.presentToast(errorMessage, 'danger');
    } finally {
      this.isLoading = false; // Finalizar estado de carga de predicción
      loadingPrediction.dismiss();
    }
  }

  closeModal() {
    this.showModal = false;
    this.predictionResult = null;
    console.log('RfExtractPage: Modal de predicción cerrado.'); // Para depuración
  }

  analyzeAnother() {
    this.closeModal();
    this.selectedFile = null;
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
      this.selectedImageUrl = null;
    }
    this.predictionResult = null;
    this.isImageValidForPrediction = null; // Reinicia el estado de validación al analizar otra
    this.validationMessage = null; // Reinicia el mensaje de validación
    this.selectedPatient = null; // También reinicia el paciente seleccionado
    console.log('RfExtractPage: Preparado para otra análisis.'); // Para depuración
  }

  getResultClass(): string {
    if (!this.predictionResult) return '';
    return this.predictionResult.prediction === 'Maligno' ? 'malignant-result' : 'benign-result';
  }

  getProgressColor(): string {
    if (!this.predictionResult || this.predictionResult.confidence === undefined) return 'medium';
    if (this.predictionResult.confidence * 100 >= 80) {
      return 'success';
    } else if (this.predictionResult.confidence * 100 >= 50) {
      return 'warning';
    } else {
      return 'danger';
    }
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color,
    });
    toast.present();
  }
}