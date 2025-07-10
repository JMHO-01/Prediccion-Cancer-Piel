import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// --- Interfaz para el paciente (replicada de patients-register.page.ts) ---
export interface Patient {
  id: string; // Identificador único para el paciente
  nombre: string;
  apellidos: string;
  fechaNacimiento: string; // Almacenado como 'YYYY-MM-DD'
  sexo: string;
  numeroTelefonico: string;
  ocupacion: string;
  direccion: string;
  edad?: number; // Opcional: edad calculada
}
// --- Fin Interfaz Patient ---

// Interfaz para el resultado de la predicción que viene de la API de Flask
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
  error?: string; // Esta propiedad contendrá el mensaje de error de Flask
}

// Nueva interfaz para la respuesta del endpoint de validación
export interface ValidationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LrExtractService {
  private predictApiUrl = 'http://127.0.0.1:5000/predict_lr'; // URL para la predicción
  private validateApiUrl = 'http://127.0.0.1:5000/validate_image'; // NUEVA URL para la validación

  constructor(private http: HttpClient) {}

  /**
   * Envía una imagen al backend para una validación preliminar (ej. si es de piel).
   * @param imageFile El archivo de imagen a validar.
   * @returns Una promesa que resuelve con la respuesta de validación del backend.
   * @throws Error con un mensaje si la validación falla o hay un problema de conexión.
   */
  async validateImage(imageFile: File): Promise<ValidationResponse> {
    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name);

    try {
      const response = await firstValueFrom(
        this.http.post<ValidationResponse>(this.validateApiUrl, formData)
      );
      // Si la API de Flask envía success: false, lanzamos un error para que lo capture el componente
      if (!response.success) {
        throw new Error(response.error || 'Error desconocido en la validación de la imagen desde la API.');
      }
      return response;
    } catch (error: any) {
      console.error('Error en el servicio de validación de imagen:', error);
      let errorMessage = 'Error al conectar con el servidor para validar la imagen.';

      if (error instanceof HttpErrorResponse) {
        // Esto captura el campo 'error' de tu respuesta JSON de Flask
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.message) {
          errorMessage = `Error del servidor (${error.status}): ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Ocurrió un error inesperado durante la validación.';
      }
      throw new Error(errorMessage); // Vuelve a lanzar el error con un mensaje específico
    }
  }

  /**
   * Envía una imagen y datos de paciente al backend para la predicción completa.
   * Se asume que la imagen ya fue validada previamente.
   * @param imageFile El archivo de imagen a predecir.
   * @param patientData Los datos del paciente asociados.
   * @returns Una promesa que resuelve con el resultado de la predicción.
   * @throws Error con un mensaje si la predicción falla o hay un problema de conexión.
   */
  async predictImage(imageFile: File, patientData: Patient): Promise<PredictionResult> {
    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name);
    formData.append('patientData', JSON.stringify(patientData));

    try {
      const response = await firstValueFrom(
        this.http.post<PredictionResult>(this.predictApiUrl, formData)
      );

      if (!response.success) {
        throw new Error(response.error || 'Error desconocido en la predicción desde la API.');
      }
      return response;
    } catch (error: any) {
      console.error('Error en el servicio de predicción para Regresión Logística:', error);
      let errorMessage = 'Error al conectar con el servidor de Regresión Logística.';

      if (error instanceof HttpErrorResponse) {
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.message) {
          errorMessage = `Error del servidor (${error.status}): ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Ocurrió un error inesperado.';
      }

      throw new Error(errorMessage);
    }
  }
}