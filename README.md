# Prep Evaluator

Prep Evaluator es una plataforma estática y optimizada de autoevaluación.

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


### Regenerar Manifiesto y Validar
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
