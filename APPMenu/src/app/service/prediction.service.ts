import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs'; // <-- Added 'of' for error handling
import { map, catchError } from 'rxjs/operators'; // <-- Added 'catchError' for error handling

// Interfaz para la respuesta de la API (PredictionResponse)
export interface PredictionResponse {
  success: boolean;
  prediction?: string;
  confidence?: number;
  probabilities?: {
    Benigno: number;
    Maligno: number;
  };
  class_index?: number;
  error?: string;
  recommendation?: string;
  imagePath?: string; // <-- Added: Path where the image is saved on the backend (optional)
}

// Interfaz para el health check (HealthResponse)
export interface HealthResponse {
  status: string;
  message: string;
  model_loaded: boolean;
}

// Interfaz para la validación de imagen (ValidationResponse)
export interface ValidationResponse {
  is_valid: boolean;
  confidence: number;
  message: string;
  details?: {
    skin_percentage: number;
    brightness: number;
    contrast: number;
  };
}

// Interfaz para los datos del paciente
// IMPORTANT: Make sure this matches the Patient interface in your patients-register.page.ts
export interface Patient {
  id: string;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: string;
  numeroTelefonico: string;
  ocupacion: string;
  direccion: string;
  edad?: number; // Optional property
}


@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000'; // URL de tu API Flask

  // --- MODIFIED METHOD: Now accepts patientData! ---
  predictSkinCancer(imageFile: File, patientData: Patient): Observable<PredictionResponse> {
    const formData = new FormData();
    formData.append('image', imageFile, imageFile.name); // Include filename in FormData

    // --- KEY CHANGE: Convert the patientData object to a JSON string and append it ---
    // Your Flask API will expect this as a JSON string in the 'patientData' field
    formData.append('patientData', JSON.stringify(patientData));

    return this.http.post<PredictionResponse>(`${this.apiUrl}/predict`, formData).pipe(
      catchError(error => {
        console.error('Error in prediction service:', error);
        // Return an error response so the component can handle it gracefully
        return of({
          success: false,
          prediction: 'Error',
          confidence: 0,
          probabilities: { Benigno: 0, Maligno: 0 },
          class_index: -1,
          recommendation: `An error occurred during prediction. Details: ${error.message || 'Unknown error'}`,
          error: error.message || 'Unknown error'
        });
      })
    );
  }

  // Method to check if the API is running and the model is loaded
  checkApiHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiUrl}/health`).pipe(
      catchError(error => {
        console.error('Error checking API health:', error);
        // Return a default error object if the API is unreachable
        return of({
          status: 'Error',
          message: 'Could not connect to the API server.',
          model_loaded: false
        } as HealthResponse);
      })
    );
  }

  // Method to validate if the image contains skin
  validateSkinImage(file: File): Observable<boolean> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ValidationResponse>(`${this.apiUrl}/validate-skin`, formData)
      .pipe(
        map((response: ValidationResponse) => response.is_valid),
        catchError(error => {
          console.error('Error in image validation service:', error);
          throw error; // Re-throw the error so the component can catch it
        })
      );
  }
}