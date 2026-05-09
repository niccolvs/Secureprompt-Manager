// MainActivity.kt
// Pantalla principal de SecurePrompt Manager
// Muestra la lista de prompts y permite crear nuevos

package com.example.securepromptapp

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.securepromptapp.models.Prompt
import com.example.securepromptapp.models.PromptCreate
import com.example.securepromptapp.network.RetrofitClient
import kotlinx.coroutines.launch

// ── Colores de la app ─────────────────────────────
// Los mismos que usamos en el dashboard web
val BgPrimary = Color(0xFF0f1923)
val BgCard = Color(0xFF1a2535)
val Accent = Color(0xFF1a9e75)
val AccentLight = Color(0xFF24c491)
val TextPrimary = Color(0xFFf0f4f8)
val TextSecondary = Color(0xFF7e9ab8)
val TextMuted = Color(0xFF4a6278)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SecurePromptApp()
        }
    }
}

@Composable
fun SecurePromptApp() {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    // ── Estado de la app ──────────────────────────
    var prompts by remember { mutableStateOf<List<Prompt>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showModal by remember { mutableStateOf(false) }

    // ── Cargar prompts al iniciar ─────────────────
    LaunchedEffect(Unit) {
        try {
            val response = RetrofitClient.apiService.getPrompts()
            prompts = response.prompts
        } catch (e: Exception) {
            Toast.makeText(context, "Error conectando con el servidor", Toast.LENGTH_LONG).show()
        } finally {
            isLoading = false
        }
    }

    // ── Función para crear prompt ─────────────────
    fun crearPrompt(titulo: String, contenido: String, categoria: String) {
        scope.launch {
            try {
                val response = RetrofitClient.apiService.createPrompt(
                    PromptCreate(titulo, contenido, categoria)
                )
                // Recargar lista después de crear
                val updated = RetrofitClient.apiService.getPrompts()
                prompts = updated.prompts
                showModal = false

                val msg = if ((response.total_entidades ?: 0) > 0)
                    "✅ ${response.total_entidades} datos sensibles protegidos"
                else "✅ Prompt guardado"
                Toast.makeText(context, msg, Toast.LENGTH_LONG).show()

            } catch (e: Exception) {
                Toast.makeText(context, "Error guardando prompt", Toast.LENGTH_LONG).show()
            }
        }
    }

    // ── Función para eliminar prompt ──────────────
    fun eliminarPrompt(id: Int) {
        scope.launch {
            try {
                RetrofitClient.apiService.deletePrompt(id)
                prompts = prompts.filter { it.id != id }
                Toast.makeText(context, "Prompt eliminado", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Error eliminando prompt", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ── UI Principal ──────────────────────────────
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "SecurePrompt",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Text(
                    text = "DR",
                    fontSize = 12.sp,
                    color = AccentLight,
                    modifier = Modifier
                        .background(
                            color = Color(0x331a9e75),
                            shape = RoundedCornerShape(50)
                        )
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }

            // Estadística total
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(containerColor = BgCard),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "TOTAL PROMPTS",
                        fontSize = 10.sp,
                        color = TextMuted,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "${prompts.size}",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = AccentLight
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Título sección
            Text(
                text = "MIS PROMPTS",
                fontSize = 10.sp,
                color = TextMuted,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Lista de prompts
            if (isLoading) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(prompts) { prompt ->
                        PromptCard(
                            prompt = prompt,
                            onEliminar = { eliminarPrompt(prompt.id) }
                        )
                    }
                }
            }
        }

        // Botón flotante para nuevo prompt
        FloatingActionButton(
            onClick = { showModal = true },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            containerColor = Accent
        ) {
            Text("+", fontSize = 24.sp, color = Color.White)
        }

        // Modal para crear prompt
        if (showModal) {
            NuevoPromptModal(
                onDismiss = { showModal = false },
                onGuardar = { titulo, contenido, categoria ->
                    crearPrompt(titulo, contenido, categoria)
                }
            )
        }
    }
}

// ── Tarjeta de prompt ─────────────────────────────
@Composable
fun PromptCard(prompt: Prompt, onEliminar: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = BgCard),
        shape = RoundedCornerShape(10.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = prompt.titulo,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = prompt.contenido_limpio ?: prompt.contenido,
                fontSize = 12.sp,
                color = TextSecondary,
                maxLines = 2
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tag de categoría
                Text(
                    text = prompt.categoria,
                    fontSize = 10.sp,
                    color = AccentLight,
                    modifier = Modifier
                        .background(
                            color = Color(0x331a9e75),
                            shape = RoundedCornerShape(99.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                )
                // Botón eliminar
                TextButton(onClick = onEliminar) {
                    Text(
                        text = "Eliminar",
                        fontSize = 11.sp,
                        color = Color(0xFFf09595)
                    )
                }
            }
        }
    }
}

// ── Modal para crear nuevo prompt ─────────────────
@Composable
fun NuevoPromptModal(
    onDismiss: () -> Unit,
    onGuardar: (String, String, String) -> Unit
) {
    var titulo by remember { mutableStateOf("") }
    var contenido by remember { mutableStateOf("") }
    var categoria by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xAA000000)),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Nuevo prompt",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = titulo,
                    onValueChange = { titulo = it },
                    label = { Text("Título", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = TextMuted,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = contenido,
                    onValueChange = { contenido = it },
                    label = { Text("Contenido", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    maxLines = 5,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = TextMuted,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = categoria,
                    onValueChange = { categoria = it },
                    label = { Text("Categoría", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = TextMuted,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(16.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancelar", color = TextSecondary)
                    }
                    Button(
                        onClick = {
                            if (titulo.isNotBlank() && contenido.isNotBlank() && categoria.isNotBlank()) {
                                onGuardar(titulo, contenido, categoria)
                            }
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Accent)
                    ) {
                        Text("Guardar", color = Color.White)
                    }
                }
            }
        }
    }
}