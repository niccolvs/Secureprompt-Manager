# SecurePrompt Manager
Extensión de navegador con backend FastAPI + SpaCy + SQLite.

## Estructura
- `extension/` → Frontend (HTML, CSS, JS, ManifestV3)
- `backend/` → Servidor FastAPI + SpaCy + SQLite

## Equipo
| Rol | GitHub |
|-----|--------|
| Frontend | @DavidRetuerto |
| Frontend | @andreavalfonzo |
| Backend API | @Lorenx003 @niccolvs|
| Backend DB | @Lorenx003 @niccolvs|

# Flujo del proyecto
Para poder hacer uso de las funcionalidades del proyecto en general, seguir estos pasos:
## Inicialización
1. *Clonar el repositorio desde GitHub*: Para poder realizar uso de esto.
2. Al iniciar el repositorio, notar que se encuentra en la rama "/main", ya que aquí se encuentra la base funcional.
3. Ahora, como usted se encuentra en el repositorio local del proyecto, debe realizar un *Merge* de la rama remota de *main*.
4. Con el Merge ya realizado, y ya con la última versión, acceder a la carpeta de */backend*, donde se encuentra el ejecutable para iniciar la página.
5. En vista de su versión de paso, asegurese de estar dentro de una Virtual Environment (venv).
6. Ahora, para poder realizar el uso de todos los archivos, asegurarse de tener instaladas las librerías de: *pip install fastapi, uvicorn, pydantic, python-multipart, spacy* de python, y por último *python -m spacy download es_core_news_lg*.
7. Con esto ya instalado, podemos iniciar la extensión con *python -m uvicorn app.main:app --reload*.

PD: no meterse al link que indica la consola.

## Instalación en navegador
1. Primeramente ingresar a algun navegador que sea derivado de chronium (Chrome, Edge, etc.).
2. Acceder al área de extensiones del navegador.
3. Activar el modo desarrollador (en caso de ser necesario).
4. Realizar la carga de la extensión (en caso de ser desempaquetada, seleccionar la carpeta *extension* del proyecto. En caso de solicitar un archivo en vez de una carpeta, seleecionar el archivo *manifest.json* dentro de la misma carpeta de *extension*.
5. Con esto, ya se debe tener la extensión disponible para su uso, mirandola en el extremo superior derecho, y en las páginas de IA provistas.

PD: Para poder usar la extensión la cuenta Google de la IA tiene que ser la misma que la que se use en el complemento
