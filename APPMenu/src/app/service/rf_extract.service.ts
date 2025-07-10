import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// --- Interfaz para el paciente (sin cambios) ---
export interface Patient {
  id: string; // Unique identifier for the patient
  nombre: string;
  apellidos: string;
  fechaNacimiento: string; // Stored as 'YYYY-MM-DD' string
  sexo: string;
  numeroTelefonico: string;
  ocupacion: string;
  direccion: string;
  edad?: number; // Optional: calculated age
}
// --- Fin Interfaz Patient ---

// Interfaz para el resultado de la predicción que viene de la API de Flask (sin cambios)
export interface PredictionResult {
  success: boolean;
  prediction: string; // "Benigno" o "Maligno"
  confidence: number; // Confianza como float (0-1)
  confidence_percent: number; // Confianza en porcentaje
  probabilities: {
    Benigno: number;
    Maligno: number;
  };
  recommendation: string;
  imagePath: string;
  error?: string;
}

// --- NUEVA INTERFAZ para el resultado de la validación de imagen ---
export interface ImageValidationResult {
  success: boolean;
  is_skin: boolean; // True si es probable piel, False si no
  message: string; // Mensaje de validación (ej. "La imagen ha sido validada como probable piel." o "La imagen no parece ser de piel.")
  error?: string; // Si success es false por un error de validación básica (ej. formato, tamaño)
}
// --- FIN NUEVA INTERFAZ ---

@Injectable({
  providedIn: 'root',
})
export class RfExtractService {
  private apiUrl = 'http://127.0.0.1:5000/predict_rf'; // Endpoint para predicción
  private validateImageUrl = 'http://127.0.0.1:5000/validate_image'; // ¡NUEVO: Endpoint para validación!

  constructor(private http: HttpClient) {}

  /**
   * Envía la imagen al nuevo endpoint de la API de Flask para validar si es una imagen de piel.
   * @param imageFile El objeto File de la imagen seleccionada.
   * @returns Una promesa que resuelve con el resultado de la validación.
   */
  async validateImage(imageFile: File): Promise<ImageValidationResult> {
    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name);

    try {
      const response = await firstValueFrom(
        this.http.post<ImageValidationResult>(this.validateImageUrl, formData)
      );
      // La API debe devolver { success: true, is_skin: true/false, message: "..." }
      // O { success: false, error: "..." } si hay un problema básico con el archivo.
      return response;
    } catch (error: any) {
      console.error('Error en el servicio de validación de imagen:', error);
      let errorMessage = 'Error al conectar con el servidor para validar la imagen.';
      if (error.error && error.error.error) {
        errorMessage = error.error.error; // Errores específicos enviados por tu API Flask
      } else if (error.message) {
        errorMessage = error.message; // Mensajes de error de red o de Angular HttpClient
      }
      // Aseguramos que siempre devolvemos una estructura conocida
      return { success: false, is_skin: false, message: errorMessage, error: errorMessage };
    }
  }

  /**
   * Envía la imagen y los datos del paciente a la API de Flask para la predicción.
   * La imagen se envía como un archivo y los datos del paciente como una cadena JSON.
   * @param imageFile El objeto File de la imagen seleccionada.
   * @param patientData El objeto Patient con los datos del paciente.
   * @returns Una promesa que resuelve con el resultado de la predicción.
   */
  async predictImage(imageFile: File, patientData: Patient): Promise<PredictionResult> {
    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name);
    formData.append('patientData', JSON.stringify(patientData));

    try {
      const response = await firstValueFrom(
        this.http.post<PredictionResult>(this.apiUrl, formData)
      );

      if (response.success) {
        return response;
      } else {
        throw new Error(response.error || 'Error desconocido en la predicción.');
      }
    } catch (error: any) {
      console.error('Error en el servicio de predicción:', error);
      let errorMessage = 'Error al conectar con el servidor.';
      if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  }
}