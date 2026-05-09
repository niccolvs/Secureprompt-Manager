package com.example.securepromptapp.network

// network/RetrofitClient.kt
// Configura la conexión con el servidor FastAPI
// Es un Singleton — solo existe una instancia en toda la app

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitClient {

    // URL del servidor FastAPI
    // En local apunta a tu máquina
    // 10.0.2.2 es la IP especial del emulador Android
    // que apunta a localhost de tu computador
    private const val BASE_URL = "http://10.0.2.2:8000/"

    // Crear instancia de Retrofit
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    // Exponer el servicio para usar en toda la app
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}