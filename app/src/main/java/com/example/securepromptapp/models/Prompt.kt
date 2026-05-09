package com.example.securepromptapp.models

// models/Prompt.kt
// Define la estructura de los datos que vienen de FastAPI
// Debe coincidir exactamente con lo que devuelve el servidor

data class Prompt(
    val id: Int,
    val titulo: String,
    val contenido: String,
    val contenido_limpio: String?,  // Puede ser nulo si no hay datos sensibles
    val categoria: String,
    val fecha_creacion: String
)

// Modelo para crear un prompt nuevo
// Es lo que enviamos al servidor
data class PromptCreate(
    val titulo: String,
    val contenido: String,
    val categoria: String
)

// Respuesta del servidor al listar prompts
data class PromptsResponse(
    val prompts: List<Prompt>
)

// Respuesta del servidor al crear un prompt
data class PromptCreateResponse(
    val mensaje: String,
    val prompt_id: Int?,
    val texto_limpio: String?,
    val total_entidades: Int?
)