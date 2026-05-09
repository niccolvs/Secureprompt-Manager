package com.example.securepromptapp.network

// network/ApiService.kt
// Define todos los endpoints de FastAPI que usaremos
// Retrofit convierte estas funciones en llamadas HTTP automáticamente

import com.example.securepromptapp.models.PromptCreate
import com.example.securepromptapp.models.PromptCreateResponse
import com.example.securepromptapp.models.PromptsResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {

    // GET /prompts → trae todos los prompts
    @GET("prompts")
    suspend fun getPrompts(): PromptsResponse

    // POST /prompts → crea un prompt nuevo
    @POST("prompts")
    suspend fun createPrompt(@Body prompt: PromptCreate): PromptCreateResponse

    // DELETE /prompts/{id} → elimina un prompt
    @DELETE("prompts/{id}")
    suspend fun deletePrompt(id: Int): Any
}