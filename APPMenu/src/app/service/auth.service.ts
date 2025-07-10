// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs'; // Import BehaviorSubject and Observable
import { map } from 'rxjs/operators'; // Import map operator

// Define interfaces for better type safety
export interface UserProfile {
  nombre: string;
  apellidos: string;
  edad: number;
  correo: string;
  especialidad: string;
  profileImageUrl?: string;
}

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

export interface User {
  username: string;
  email: string;
  password?: string; // En una aplicación real, esto debería estar cifrado (hashed)
  profile?: UserProfile;
  patients: Patient[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _storage: Storage | null = null;
  private USERS_STORAGE_KEY = 'app_users'; // Clave para almacenar todos los usuarios
  private CURRENT_USER_EMAIL_KEY = 'current_user_email'; // Clave para el email del usuario actual

  // Use BehaviorSubject to hold and broadcast the current user
  // It starts with null, meaning no user is currently logged in.
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  // Expose currentUser$ as an Observable for components to subscribe to
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(
    private storage: Storage,
    private toastController: ToastController,
    private router: Router
  ) {
    this.init(); // Inicializa el almacenamiento al crear el servicio
  }

  async init() {
    // Inicializa Ionic Storage
    const storage = await this.storage.create();
    this._storage = storage;
    // Intenta cargar el usuario actual al inicializar el servicio
    await this.loadCurrentUser();
  }

  // --- Métodos de Autenticación ---

  /**
   * Registra un nuevo usuario en el almacenamiento local.
   * Verifica si el correo electrónico o nombre de usuario ya existen.
   * @param userData Los datos del nuevo usuario (username, email, password).
   * @returns Promesa que resuelve a `true` si el registro es exitoso, `false` en caso contrario.
   */
  async register(userData: { username: string; email: string; password: string }): Promise<boolean> {
    if (!this._storage) {
      await this.init(); // Asegura que el almacenamiento esté inicializado
    }

    let users: User[] = await this.getUsers();

    // Verifica si el email o nombre de usuario ya existen
    if (users.some(u => u.email === userData.email)) {
      await this.presentToast('El correo electrónico ya está registrado.', 'danger');
      return false;
    }
    if (users.some(u => u.username === userData.username)) {
      await this.presentToast('El nombre de usuario ya está en uso.', 'danger');
      return false;
    }

    const newUser: User = {
      username: userData.username,
      email: userData.email,
      password: userData.password, // NOTA: En una aplicación real, ¡siempre hashea las contraseñas!
      profile: { // Inicializa el perfil con valores por defecto
        nombre: '',
        apellidos: '',
        edad: 0,
        correo: userData.email,
        especialidad: '',
        profileImageUrl: undefined
      },
      patients: [] // Inicializa con un array vacío de pacientes
    };

    users.push(newUser); // Añade el nuevo usuario a la lista
    await this._storage?.set(this.USERS_STORAGE_KEY, users); // Guarda la lista actualizada
    await this.presentToast('Registro exitoso. Por favor, inicia sesión.', 'success');
    return true;
  }

  /**
   * Inicia sesión de un usuario.
   * Busca al usuario en el almacenamiento local por email y contraseña.
   * @param credentials Las credenciales del usuario (email, password).
   * @returns Promesa que resuelve a `true` si el login es exitoso, `false` en caso contrario.
   */
  async login(credentials: { email: string; password: string }): Promise<boolean> {
    if (!this._storage) {
      await this.init(); // Asegura que el almacenamiento esté inicializado
    }

    const users: User[] = await this.getUsers();
    // Encuentra al usuario que coincida con las credenciales
    const foundUser = users.find(u => u.email === credentials.email && u.password === credentials.password);

    if (foundUser) {
      this.currentUserSubject.next(foundUser); // Emit the found user
      await this._storage?.set(this.CURRENT_USER_EMAIL_KEY, foundUser.email); // Guarda el email del usuario actual
      await this.presentToast(`Bienvenido, ${foundUser.username}!`, 'success');
      return true;
    } else {
      await this.presentToast('Credenciales inválidas. Por favor, verifica tu correo y contraseña.', 'danger');
      return false;
    }
  }

  /**
   * Cierra la sesión del usuario actual.
   * Limpia el usuario actual y el email del almacenamiento.
   */
  async logout(): Promise<void> {
    this.currentUserSubject.next(null); // Emit null to signify no user
    await this._storage?.remove(this.CURRENT_USER_EMAIL_KEY); // Elimina el email del usuario actual del almacenamiento
    await this.presentToast('Has cerrado sesión.', 'success');
    this.router.navigate(['/login']); // Redirige a la página de login después de cerrar sesión
  }

  /**
   * Verifica si hay un usuario autenticado.
   * @returns Promesa que resuelve a `true` si hay un usuario logeado, `false` en caso contrario.
   */
  async isAuthenticated(): Promise<boolean> {
    // Check current value from subject first, then try loading if null
    if (this.currentUserSubject.getValue() === null) {
      await this.loadCurrentUser(); // Attempt to load if not in memory
    }
    return !!this.currentUserSubject.getValue(); // Return true if currentUser is not null
  }

  // --- Métodos de Gestión de Datos de Usuario (Perfil y Pacientes) ---

  /**
   * Obtiene la lista completa de usuarios del almacenamiento.
   * @returns Promesa que resuelve a un array de `User`.
   */
  private async getUsers(): Promise<User[]> { // Made private as it's an internal helper
    return (await this._storage?.get(this.USERS_STORAGE_KEY)) || [];
  }

  /**
   * Carga el usuario actualmente logeado desde el almacenamiento.
   * Esto se usa al iniciar la aplicación o refrescar la página.
   */
  async loadCurrentUser(): Promise<void> {
    if (!this._storage) {
      await this.init();
    }
    const currentUserEmail = await this._storage?.get(this.CURRENT_USER_EMAIL_KEY);
    if (currentUserEmail) {
      const users = await this.getUsers();
      const foundUser = users.find(u => u.email === currentUserEmail) || null;
      this.currentUserSubject.next(foundUser); // Emit the loaded user
    } else {
      this.currentUserSubject.next(null); // No current user email, so no user
    }
  }

  /**
   * Actualiza el objeto del usuario actual en la lista de usuarios en el almacenamiento.
   * Este método es crucial para persistir los cambios en el perfil o los pacientes del usuario.
   * También emite la actualización a través del BehaviorSubject.
   */
  private async updateCurrentUserInStorage(): Promise<void> {
    const currentUser = this.currentUserSubject.getValue();
    if (!this._storage || !currentUser) {
      return;
    }

    let users = await this.getUsers();
    const userIndex = users.findIndex(u => u.email === currentUser.email);

    if (userIndex > -1) {
      users[userIndex] = currentUser; // Reemplaza el usuario en la lista
      await this._storage.set(this.USERS_STORAGE_KEY, users); // Guarda la lista actualizada
      console.log('Usuario actualizado en almacenamiento:', currentUser.email);
      this.currentUserSubject.next(currentUser); // Emit the updated user
    } else {
      console.error('Error: El usuario actual no se encontró en la lista de usuarios para actualizar.');
    }
  }

  /**
   * Obtiene el valor actual del usuario logeado (síncrono).
   * Útil para guardias de ruta o cuando se necesita el valor inmediatamente.
   * Considera usar `currentUser$` para reacciones a cambios.
   */
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.getValue();
  }


  /**
   * Actualiza el perfil del usuario actualmente logeado.
   * @param profileData Los datos del perfil a actualizar.
   * @returns Promesa que resuelve a `true` si la actualización es exitosa, `false` en caso contrario.
   */
  async updateUserProfile(profileData: UserProfile): Promise<boolean> {
    const currentUser = this.currentUserSubject.getValue();
    if (!currentUser) {
      await this.presentToast('No hay usuario logeado para actualizar el perfil.', 'danger');
      return false;
    }

    currentUser.profile = profileData; // Actualiza el perfil en el objeto de usuario actual
    await this.updateCurrentUserInStorage(); // Persiste el cambio y emite la actualización
    await this.presentToast('Perfil actualizado con éxito.', 'success');
    return true;
  }

  /**
   * Añade un nuevo paciente al usuario actualmente logeado.
   * @param patient El objeto `Patient` a añadir.
   * @returns Promesa que resuelve a `true` si se añade el paciente, `false` en caso contrario.
   */
  async addPatientToCurrentUser(patient: Patient): Promise<boolean> {
    const currentUser = this.currentUserSubject.getValue();
    if (!currentUser) {
      await this.presentToast('No hay usuario logeado para registrar pacientes.', 'danger');
      return false;
    }

    // Asegura que el array de pacientes exista
    if (!currentUser.patients) {
      currentUser.patients = [];
    }

    currentUser.patients.push(patient); // Añade el paciente al array del usuario actual
    await this.updateCurrentUserInStorage(); // Persiste el cambio y emite la actualización
    await this.presentToast('Paciente registrado exitosamente!', 'success');
    return true;
  }

  /**
   * Obtiene la lista de pacientes para el usuario actual como un Observable.
   * @returns Un Observable que emite la lista de pacientes del usuario actual.
   */
  getPatientsForCurrentUser(): Observable<Patient[]> {
    return this.currentUser$.pipe(
      map(user => user ? user.patients : [])
    );
  }

  /**
   * Muestra un mensaje Toast en la parte inferior de la pantalla.
   * @param message El mensaje a mostrar.
   * @param color El color del Toast (ej. 'primary', 'success', 'danger', 'warning').
   */
  private async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}