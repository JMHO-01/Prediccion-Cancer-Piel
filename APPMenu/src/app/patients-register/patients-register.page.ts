// src/app/patients-register/patients-register.page.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms';
import { IonicModule, ToastController, NavController } from '@ionic/angular';
// import { Storage } from '@ionic/storage-angular'; // Ya no se usa directamente aquí, lo gestiona AuthService

import { AuthService, Patient } from '../service/auth.service'; // Importar AuthService y la interfaz Patient

@Component({
  selector: 'app-patients-register',
  templateUrl: './patients-register.page.html',
  styleUrls: ['./patients-register.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    ReactiveFormsModule // <-- ¡Importar ReactiveFormsModule aquí!
  ]
})
export class PatientsRegisterPage implements OnInit {
  patientForm!: FormGroup; // <-- ¡Declaración del FormGroup!
  today: string; // Para establecer la fecha máxima en el selector de fecha

  // private _storage: Storage | null = null; // Ya no se necesita aquí
  // private PATIENTS_STORAGE_KEY = 'registered_patients'; // Ya no se necesita aquí

  constructor(
    private fb: FormBuilder, // <-- ¡Inyectar FormBuilder!
    private toastController: ToastController,
    private navCtrl: NavController,
    private authService: AuthService // Inyectar AuthService
    // private storage: Storage // Ya no se inyecta directamente aquí
  ) {
    this.today = new Date().toISOString().split('T')[0]; // Obtiene la fecha actual en formato YYYY-MM-DD
    this.initializeForm(); // Llama a la inicialización del formulario
  }

  async ngOnInit() {
    await this.authService.loadCurrentUser(); // Asegura que el usuario actual esté cargado
    // No es necesario inicializar Storage aquí, AuthService lo gestiona.
  }

  /**
   * Inicializa el formulario reactivo con sus controles y validadores.
   */
  initializeForm() {
    this.patientForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
      apellidos: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-Z\s]+$/)]],
      // Validadores para fechaNacimiento: requerido, validez básica de fecha y edad máxima (80 años)
      fechaNacimiento: ['', [Validators.required, this.dateValidator(), this.maxAgeValidator(80)]],
      sexo: ['', Validators.required],
      // Validar que sea un número de 9 dígitos (adaptar si tu país tiene otra longitud)
      numeroTelefonico: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      ocupacion: ['', [Validators.required, Validators.minLength(3)]],
      direccion: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  // --- Métodos 'getter' para acceder fácilmente a los controles del formulario en el HTML ---
  get nameControl(): AbstractControl | null {
    return this.patientForm.get('nombre');
  }

  get lastNameControl(): AbstractControl | null {
    return this.patientForm.get('apellidos');
  }

  get dobControl(): AbstractControl | null {
    return this.patientForm.get('fechaNacimiento');
  }

  get genderControl(): AbstractControl | null {
    return this.patientForm.get('sexo');
  }

  get phoneControl(): AbstractControl | null {
    return this.patientForm.get('numeroTelefonico');
  }

  get occupationControl(): AbstractControl | null {
    return this.patientForm.get('ocupacion');
  }

  get addressControl(): AbstractControl | null {
    return this.patientForm.get('direccion');
  }
  // --- Fin de los métodos 'getter' ---


  /**
   * Validador personalizado para la fecha de nacimiento.
   * Verifica que la fecha sea válida y no sea una fecha futura.
   * @returns Un objeto de error si la fecha no es válida, o null si es válida.
   */
  dateValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      if (!control.value) {
        return null; // Si el campo está vacío, Validators.required se encargará
      }

      const birthDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normaliza 'hoy' al inicio del día para una comparación precisa

      if (isNaN(birthDate.getTime())) {
        return { 'invalidDate': true }; // La fecha no es parseable
      }

      if (birthDate > today) {
        return { 'futureDate': true }; // La fecha de nacimiento no puede ser en el futuro
      }

      return null; // La fecha es válida
    };
  }

  /**
   * Validador personalizado para la edad máxima del paciente.
   * Utiliza la función calculateAge para determinar si la edad excede un límite dado.
   * @param maxAge La edad máxima permitida.
   * @returns Un objeto de error si la edad excede el límite, o null si está dentro del límite.
   */
  maxAgeValidator(maxAge: number): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      if (!control.value) {
        return null; // Si el campo está vacío, otros validadores o Validators.required se encargarán
      }

      const birthDate = new Date(control.value);
      if (isNaN(birthDate.getTime())) {
        return null; // Si la fecha es inválida, ya será manejado por dateValidator
      }

      const age = this.calculateAge(control.value);

      if (age !== undefined && age > maxAge) {
        return { 'ageExceedsLimit': true }; // Error: la edad calculada excede el límite
      }
      return null; // La edad está dentro del límite
    };
  }

  /**
   * Calcula la edad de una persona basándose en su fecha de nacimiento.
   * @param dob La fecha de nacimiento en formato de cadena (YYYY-MM-DD).
   * @returns La edad en años, o undefined si la fecha de nacimiento es inválida o nula.
   */
  calculateAge(dob: string): number | undefined {
    if (!dob) return undefined;
    const birthDate = new Date(dob);

    // Si la fecha de nacimiento no es válida, regresa undefined
    if (isNaN(birthDate.getTime())) return undefined;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    // Ajustar la edad si aún no ha cumplido años en el mes o día actual
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Guarda un nuevo paciente en el almacenamiento local, asociado al usuario actual.
   * Realiza validaciones del formulario antes de guardar.
   */
  async savePatient() {
    // Si el formulario no es válido, marca todos los campos como "tocados" para mostrar errores
    // y muestra un toast de advertencia.
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      await this.presentToast('Por favor, completa correctamente todos los campos obligatorios o corrige los errores.', 'danger');
      return;
    }

    // Obtener los datos válidos del formulario
    const patientData = this.patientForm.value;

    // Crear un nuevo objeto Patient con un ID único y la edad calculada
    const newPatient: Patient = {
      ...patientData,
      id: Date.now().toString(), // Genera un ID único basado en la marca de tiempo
      edad: this.calculateAge(patientData.fechaNacimiento) // Calcula la edad
    };

    // Usar AuthService para añadir el paciente al usuario actual
    const success = await this.authService.addPatientToCurrentUser(newPatient);

    if (success) {
      // El mensaje Toast ya es manejado por AuthService
      // Resetear el formulario a su estado inicial, incluyendo validadores
      this.patientForm.reset();
      this.initializeForm(); // Esto asegura que todos los validadores se reinicien correctamente
    } else {
      // Si el AuthService indicó un fallo (ej. no hay usuario logeado)
      await this.presentToast('Error: No se pudo registrar el paciente. Asegúrate de haber iniciado sesión.', 'danger');
    }
  }

  /**
   * Muestra un mensaje Toast en la parte inferior de la pantalla.
   * @param message El mensaje a mostrar.
   * @param color El color del Toast (ej. 'primary', 'success', 'danger', 'warning').
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
}
