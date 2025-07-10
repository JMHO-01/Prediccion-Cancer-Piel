// src/app/lr_extract/lr_extract.page.ts (o skin-prediction.page.ts si ese es tu nombre de archivo)
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
} from 'ionicons/icons';
import { Router, RouterLink } from '@angular/router';
// Importamos AuthService y Patient desde allí (esto es crucial)
import { AuthService, Patient } from '../service/auth.service'; // Asegúrate de que la ruta sea correcta
import { LrExtractService, PredictionResult, ValidationResponse } from '../service/lr_extract.service';
import { Subscription } from 'rxjs'; // Importar Subscription para gestionar la suscripción

@Component({
  selector: 'app-lr-extract', // Si es skin-prediction.page.ts, mantén 'app-skin-prediction'
  templateUrl: './lr_extract.page.html', // Si es skin-prediction.page.ts, mantén './skin-prediction.page.html'
  styleUrls: ['./lr_extract.page.scss'], // Si es skin-prediction.page.ts, mantén './skin-prediction.page.scss'
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, // Necesario para [(ngModel)] en ion-searchbar
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
export class LrExtractPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  selectedImageUrl: string | null = null;
  isLoading = false;
  isValidating = false;
  isImageValidForPrediction = false;

  predictionResult: PredictionResult | null = null;
  showModal = false;

  patients: Patient[] = [];
  selectedPatient: Patient | null = null;
  showPatientSelectionModal = false;
  patientSearchTerm: string = '';
  filteredPatients: Patient[] = [];

  private patientsSubscription: Subscription | undefined; // Para la suscripción de pacientes

  constructor(
    private lrExtractService: LrExtractService,
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
    });
  }

  async ngOnInit() {
    // La parte CRÍTICA para obtener los pacientes reactivamente
    this.patientsSubscription = this.authService.getPatientsForCurrentUser().subscribe(patients => {
      // Este bloque se ejecuta cada vez que la lista de pacientes cambia en AuthService
      console.log('LrExtractPage: Pacientes recibidos del AuthService:', patients); // Para depuración
      this.patients = patients; // Actualiza la lista de pacientes del componente
      this.filterPatients(); // Vuelve a filtrar para actualizar la lista mostrada en el modal

      // Opcional: Si el paciente seleccionado ya no está en la lista actualizada, deselecciónalo
      if (this.selectedPatient && !this.patients.find(p => p.id === this.selectedPatient?.id)) {
        this.selectedPatient = null;
        console.log('LrExtractPage: El paciente seleccionado ya no existe, deseleccionado.'); // Para depuración
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
      console.log('LrExtractPage: Suscripción a pacientes desuscrita.'); // Para depuración
    }
    // Revocar URL de imagen si existe para liberar recursos
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
    }
  }

  // --- Métodos de gestión de pacientes y modal ---

  filterPatients() {
    console.log('LrExtractPage: Filtrando pacientes con término:', this.patientSearchTerm); // Para depuración
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
      // Opcional: invierte también los resultados de búsqueda para que el más reciente aparezca primero
      this.filteredPatients.reverse();
    }
    console.log('LrExtractPage: Pacientes filtrados resultantes:', this.filteredPatients); // Para depuración
  }

  selectPatientFromModal(patient: Patient) {
    this.selectedPatient = patient;
    this.closePatientSelectionModal();
    console.log('LrExtractPage: Paciente seleccionado:', patient); // Para depuración
  }

  openPatientSelectionModal() {
    this.patientSearchTerm = ''; // Limpiar término de búsqueda al abrir
    this.filterPatients(); // Refiltrar para mostrar todos los pacientes (ordenados por fecha de adición)
    this.showPatientSelectionModal = true;
    console.log('LrExtractPage: Modal de selección de paciente abierto.'); // Para depuración
  }

  closePatientSelectionModal() {
    this.showPatientSelectionModal = false;
    console.log('LrExtractPage: Modal de selección de paciente cerrado.'); // Para depuración
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
      this.isImageValidForPrediction = false; // Por defecto, la imagen no es válida hasta que se valide
      this.isValidating = true; // Iniciar estado de validación

      // Validación básica del tipo de archivo en el cliente (antes de enviar al backend)
      if (!file.type.startsWith('image/')) {
        await this.presentToast('Tipo de archivo no permitido. Por favor, selecciona una imagen.', 'danger');
        this.isValidating = false;
        return;
      }

      this.selectedFile = file;
      this.selectedImageUrl = URL.createObjectURL(file);
      console.log('LrExtractPage: Imagen seleccionada y URL creada:', this.selectedImageUrl); // Para depuración

      const loadingValidation = await this.loadingController.create({
        message: 'Validando imagen con el servidor...',
        spinner: 'dots',
      });
      await loadingValidation.present();

      try {
        // --- LLAMADA AL NUEVO ENDPOINT DE VALIDACIÓN EN EL BACKEND ---
        const validationResult: ValidationResponse = await this.lrExtractService.validateImage(file);
        if (validationResult.success) {
          this.isImageValidForPrediction = true;
          await this.presentToast(validationResult.message || 'Imagen validada correctamente: ¡Parece piel!', 'success');
        } else {
          // Esto captura los errores específicos de Flask (ej. "La imagen no parece ser de piel.")
          this.isImageValidForPrediction = false;
          await this.presentToast(validationResult.error || 'Error desconocido al validar la imagen.', 'warning');
        }
      } catch (error: any) {
        // Esto captura los errores de red o errores lanzados por el servicio
        this.isImageValidForPrediction = false;
        await this.presentToast(error.message || 'Error de conexión al validar la imagen.', 'danger');
      } finally {
        await loadingValidation.dismiss();
        this.isValidating = false; // Finalizar estado de validación
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
    if (!this.isImageValidForPrediction) {
      await this.presentToast('La imagen seleccionada no ha sido validada como piel o la validación falló. Por favor, sube una imagen válida.', 'warning');
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
      const result: PredictionResult = await this.lrExtractService.predictImage(this.selectedFile, this.selectedPatient);
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
    console.log('LrExtractPage: Modal de predicción cerrado.'); // Para depuración
  }

  analyzeAnother() {
    this.closeModal();
    this.selectedFile = null;
    if (this.selectedImageUrl) {
      URL.revokeObjectURL(this.selectedImageUrl);
      this.selectedImageUrl = null;
    }
    this.predictionResult = null;
    this.isImageValidForPrediction = false; // Reinicia el estado de validación al analizar otra
    this.selectedPatient = null; // También reinicia el paciente seleccionado
    console.log('LrExtractPage: Preparado para otra análisis.'); // Para depuración
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