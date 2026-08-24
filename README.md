# Prep Evaluator

Prep Evaluator es una plataforma estática y optimizada de autoevaluación y simulación de exámenes de admisión para estudiantes que aspiran a ingresar a **PrepaTec (PIENSE-II / PPAA)** o **BUAP (EGA-I)**.

La aplicación está diseñada bajo una arquitectura 100% estática (Serverless / No Backend) que la hace plenamente compatible con el hosting de GitHub Pages.

---

## 🛠️ Tecnologías Empleadas (Stack)

- **Frontend**: React 18, TypeScript, Vite
- **Ruteo**: React Router (HashRouter para portabilidad en subrutas de GitHub Pages)
- **Estilos**: CSS Vainilla con variables de diseño personalizadas y soporte responsivo
- **Pruebas**: Vitest, React Testing Library (Unitarias/Integración) y Playwright (Pruebas E2E de navegador)
- **Integridad de Datos**: CLI Node.js para validación de esquemas y generación automática de manifiesto

---

## 🚀 Instalación Local y Comandos

### Requisitos Previos
- **Node.js** v20 o superior
- **npm** v10 o superior

### Clonación y Configuración Inicial
1. Instala las dependencias del proyecto:
   ```bash
   npm install
   ```
2. Descarga los binarios de navegadores necesarios para las pruebas de Playwright:
   ```bash
   npx playwright install chromium
   ```

### Comandos de Desarrollo
- **Servidor de desarrollo local**:
  ```bash
  npm run dev
  ```
- **Generar manifiesto de datos**:
  ```bash
  npm run generate:manifest
  ```
- **Validar integridad de preguntas y estímulos**:
  ```bash
  npm run validate:data
  ```
- **Ejecutar ambas validaciones (manifiesto + integridad)**:
  ```bash
  npm run data:check
  ```
- **Ejecutar pruebas unitarias y de componentes (Vitest)**:
  ```bash
  npm run test
  ```
- **Ejecutar pruebas de extremo a extremo (Playwright)**:
  ```bash
  npm run test:e2e
  ```
- **Compilar para producción**:
  ```bash
  npm run build
  ```
- **Previsualizar la compilación de producción localmente**:
  ```bash
  npm run preview
  ```

---

## 📂 Estructura de Directorios de Datos

La base de datos de reactivos, pasajes de lectura, figuras y fichas de estudio reside completamente dentro de la carpeta `public/data/` en formato JSON:

```
public/data/
├── banks/               # Bancos de preguntas organizados por Área/Categoría
│   ├── cognitive/       # Área: Habilidades Cognitivas
│   │   ├── analogies/   # Categoría: Analogías (ej. set-001.json)
│   │   └── ...
│   ├── spanish/         # Área: Español (lectura, lengua, redacción)
│   ├── math/            # Área: Matemáticas (álgebra, geometría, etc.)
│   └── english/         # Área: Inglés (comprensión, uso de la lengua)
├── stimuli/             # Pasajes de lectura dobles y estímulos textuales complejos
├── study-cards/         # Fichas de estudio teóricas organizadas por Área/Categoría
└── config/              # Manifiesto autogenerado y configuraciones de objetivos de examen
```

---

## 📝 Cómo Añadir Contenido

### 1. Añadir un Conjunto de Preguntas (`set-XXX.json`)
Crea un archivo JSON en la carpeta correspondiente a la categoría en `public/data/banks/<area>/<category>/set-XXX.json`. El archivo debe constar de un arreglo de objetos que cumplan con la interfaz `Question`:

```json
[
  {
    "id": "PREG-MAT-ALG-101",
    "area": "math",
    "category": "algebra",
    "subcategory": "ecuaciones",
    "difficulty": "medium",
    "type": "mc",
    "prompt": "¿Cuál es el valor de x en 2x + 4 = 10?",
    "options": [
      { "id": "A", "text": "3" },
      { "id": "B", "text": "4" },
      { "id": "C", "text": "5" }
    ],
    "correct_answer": "A",
    "explanation": "Restando 4 a ambos lados: 2x = 6. Dividiendo entre 2: x = 3."
  }
]
```

### 2. Añadir Estímulos (Lecturas o Diagramas)
Si una pregunta requiere un estímulo (como un pasaje de lectura o una figura), añade el estímulo en `public/data/stimuli/<area>/<tipo>/set-XXX.json` y referéncialo en la pregunta mediante la propiedad `"stimulus_id"`.

### 3. Añadir Fichas de Estudio (Study Cards)
Añade un archivo JSON dentro de `public/data/study-cards/<area>/<category>/set-XXX.json`. Debe ser un arreglo de objetos que sigan este formato:

```json
[
  {
    "id": "CARD-MAT-ALG-001",
    "examTargets": ["prepatec", "buap"],
    "area": "math",
    "category": "algebra",
    "subcategory": "ecuaciones",
    "title": "Resolución de Ecuaciones",
    "front": "¿Cuál es el primer paso para despejar una variable en una ecuación lineal?",
    "back": "Aislar los términos con la variable en un miembro de la ecuación y los términos constantes en el otro."
  }
]
```

---

## ⚙️ Flujos de Automatización y Despliegue

### Regenerar Manifiesto y Validar
Cada vez que agregues, elimines o modifiques archivos JSON en `banks`, `stimuli` o `study-cards`, debes ejecutar:
```bash
npm run data:check
```
Este comando reconstruye `bank-manifest.json` y valida que no existan:
- Identificadores duplicados (ID de preguntas, estímulos o tarjetas).
- Enlaces rotos (reactivos que apuntan a estímulos inexistentes).
- Respuestas correctas inválidas.
- Estructuras incompletas o campos vacíos obligatorios.

### Despliegue Automático (GitHub Actions)
El repositorio cuenta con dos flujos de trabajo en `.github/workflows/`:
1. **CI Pipeline (`ci.yml`)**: Se ejecuta automáticamente en cada Push o Pull Request a las ramas `main` y `dev`, instalando el entorno, ejecutando la verificación de datos, corriendo las pruebas unitarias e integrales y comprobando que compile para producción sin advertencias.
2. **Deploy to GitHub Pages (`deploy-pages.yml`)**: Al fusionar o empujar cambios a la rama `main`, ejecuta las pruebas de validación y compila el bundle estático de Vite, cargando de forma automática los recursos a GitHub Pages bajo la subruta del repositorio sin requerir configuraciones adicionales de base de datos o servidor.
