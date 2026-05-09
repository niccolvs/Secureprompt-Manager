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
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.securepromptapp.models.Prompt
import com.example.securepromptapp.models.PromptCreate
import com.example.securepromptapp.network.RetrofitClient
import com.example.securepromptapp.ui.theme.LoginScreen
import kotlinx.coroutines.launch
import com.google.firebase.auth.FirebaseAuth
// ── Colores ───────────────────────────────────────
val BgPrimary = Color(0xFF0f1923)
val BgSecondary = Color(0xFF111e2b)
val BgCard = Color(0xFF1a2535)
val Accent = Color(0xFF1a9e75)
val AccentLight = Color(0xFF24c491)
val AccentDim = Color(0x331a9e75)
val TextPrimary = Color(0xFFf0f4f8)
val TextSecondary = Color(0xFF7e9ab8)
val TextMuted = Color(0xFF4a6278)

// ── Rutas de navegación ───────────────────────────
sealed class Screen(val route: String, val label: String, val icon: String) {
    object Inicio    : Screen("inicio", "Inicio", "🏠")
    object Prompts   : Screen("prompts", "Prompts", "📄")
    object Historial : Screen("historial", "Historial", "🕐")
    object Perfil    : Screen("perfil", "Perfil", "👤")
}

val screens = listOf(
    Screen.Inicio,
    Screen.Prompts,
    Screen.Historial,
    Screen.Perfil
)

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
    val auth = FirebaseAuth.getInstance()
    // mutableStateOf con remember para forzar recomposición
    var isLoggedIn by remember { mutableStateOf(auth.currentUser != null) }

    LaunchedEffect(auth.currentUser) {
        isLoggedIn = auth.currentUser != null
    }

    if (isLoggedIn) {
        MainScreen()
    } else {
        LoginScreen(
            onLoginSuccess = {
                // Verificar directamente en Firebase
                isLoggedIn = auth.currentUser != null
            }
        )
    }
}

@Composable
fun MainScreen() {
    val navController = rememberNavController()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
    ) {
        NavHost(
            navController = navController,
            startDestination = Screen.Inicio.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 64.dp)
        ) {
            composable(Screen.Inicio.route) { InicioScreen(navController) }
            composable(Screen.Prompts.route) { PromptsScreen() }
            composable(Screen.Historial.route) { HistorialScreen() }
            composable(Screen.Perfil.route) { PerfilScreen() }
        }

        BottomNavBar(
            navController = navController,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

// ── Barra inferior ────────────────────────────────
@Composable
fun BottomNavBar(navController: NavController, modifier: Modifier = Modifier) {
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(BgSecondary)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically
    ) {
        screens.forEach { screen ->
            val isActive = currentRoute == screen.route

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .padding(horizontal = 4.dp)
            ) {
                // Fondo verde solo en el ícono activo
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .width(44.dp)
                        .height(30.dp)
                        .background(
                            color = if (isActive) AccentDim else Color.Transparent,
                            shape = RoundedCornerShape(8.dp)
                        )
                ) {
                    TextButton(
                        onClick = {
                            if (currentRoute != screen.route) {
                                navController.navigate(screen.route) {
                                    popUpTo(Screen.Inicio.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        },
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Text(
                            text = screen.icon,
                            fontSize = 16.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = screen.label,
                    fontSize = 9.sp,
                    color = if (isActive) AccentLight else TextMuted
                )
            }
        }
    }
}

// ── Pantalla Inicio ───────────────────────────────
@Composable
fun InicioScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var prompts by remember { mutableStateOf<List<Prompt>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("SecurePrompt", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .background(AccentDim, RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text("DR", fontSize = 12.sp, color = AccentLight, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Estadística total
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("TOTAL PROMPTS", fontSize = 10.sp, color = TextMuted, letterSpacing = 1.sp)
                Text("${prompts.size}", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = AccentLight)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Stats semana y favoritos
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = BgCard),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("ESTA SEMANA", fontSize = 9.sp, color = TextMuted, letterSpacing = 0.8.sp)
                    Text("${prompts.size}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = BgCard),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("FAVORITOS", fontSize = 9.sp, color = TextMuted, letterSpacing = 0.8.sp)
                    Text("0", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text("RECIENTES", fontSize = 10.sp, color = TextMuted, letterSpacing = 1.sp)
        Spacer(modifier = Modifier.height(8.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(prompts.take(3)) { prompt ->
                    PromptCard(prompt = prompt, onEliminar = {})
                }
            }
        }
    }
}

// ── Pantalla Prompts ──────────────────────────────
@Composable
fun PromptsScreen() {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var prompts by remember { mutableStateOf<List<Prompt>>(emptyList()) }
    var showModal by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            val response = RetrofitClient.apiService.getPrompts()
            prompts = response.prompts
        } catch (e: Exception) {
            Toast.makeText(context, "Error cargando prompts", Toast.LENGTH_SHORT).show()
        }
    }

    fun eliminarPrompt(id: Int) {
        scope.launch {
            try {
                RetrofitClient.apiService.deletePrompt(id)
                prompts = prompts.filter { it.id != id }
            } catch (e: Exception) {
                Toast.makeText(context, "Error eliminando", Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun crearPrompt(titulo: String, contenido: String, categoria: String) {
        scope.launch {
            try {
                val response = RetrofitClient.apiService.createPrompt(
                    PromptCreate(titulo, contenido, categoria)
                )
                val updated = RetrofitClient.apiService.getPrompts()
                prompts = updated.prompts
                showModal = false
                val msg = if ((response.total_entidades ?: 0) > 0)
                    "✅ ${response.total_entidades} datos protegidos"
                else "✅ Prompt guardado"
                Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                Toast.makeText(context, "Error guardando", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text("Mis prompts", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(modifier = Modifier.height(12.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(prompts) { prompt ->
                    PromptCard(prompt = prompt, onEliminar = { eliminarPrompt(prompt.id) })
                }
            }
        }

        FloatingActionButton(
            onClick = { showModal = true },
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
            containerColor = Accent
        ) {
            Text("+", fontSize = 24.sp, color = Color.White)
        }

        if (showModal) {
            NuevoPromptModal(
                onDismiss = { showModal = false },
                onGuardar = { t, c, cat -> crearPrompt(t, c, cat) }
            )
        }
    }
}

// ── Pantalla Historial ────────────────────────────
@Composable
fun HistorialScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🕐", fontSize = 40.sp)
            Spacer(modifier = Modifier.height(12.dp))
            Text("Historial", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Próximamente", fontSize = 13.sp, color = TextMuted)
        }
    }
}

// ── Pantalla Perfil ───────────────────────────────
@Composable
fun PerfilScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(32.dp))
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(80.dp)
                .background(AccentDim, RoundedCornerShape(50))
        ) {
            Text("DR", fontSize = 28.sp, color = AccentLight, fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text("David Retuerto", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text("Líder del proyecto", fontSize = 13.sp, color = TextMuted)
        Spacer(modifier = Modifier.height(24.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = BgCard),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("INFORMACIÓN", fontSize = 10.sp, color = TextMuted, letterSpacing = 1.sp)
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Versión", fontSize = 13.sp, color = TextSecondary)
                    Text("1.0.0", fontSize = 13.sp, color = TextPrimary)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Plataforma", fontSize = 13.sp, color = TextSecondary)
                    Text("Android", fontSize = 13.sp, color = TextPrimary)
                }
            }
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
            Text(prompt.titulo, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                prompt.contenido_limpio ?: prompt.contenido,
                fontSize = 12.sp, color = TextSecondary, maxLines = 2
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    prompt.categoria,
                    fontSize = 10.sp, color = AccentLight,
                    modifier = Modifier
                        .background(AccentDim, RoundedCornerShape(99.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                )
                if (onEliminar != {}) {
                    TextButton(onClick = onEliminar) {
                        Text("Eliminar", fontSize = 11.sp, color = Color(0xFFf09595))
                    }
                }
            }
        }
    }
}

// ── Modal nuevo prompt ────────────────────────────
@Composable
fun NuevoPromptModal(onDismiss: () -> Unit, onGuardar: (String, String, String) -> Unit) {
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
                Text("Nuevo prompt", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = titulo, onValueChange = { titulo = it },
                    label = { Text("Título", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent, unfocusedBorderColor = TextMuted,
                        focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = contenido, onValueChange = { contenido = it },
                    label = { Text("Contenido", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    maxLines = 5,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent, unfocusedBorderColor = TextMuted,
                        focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = categoria, onValueChange = { categoria = it },
                    label = { Text("Categoría", color = TextMuted) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent, unfocusedBorderColor = TextMuted,
                        focusedTextColor = TextPrimary, unfocusedTextColor = TextPrimary
                    )
                )
                Spacer(modifier = Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                        Text("Cancelar", color = TextSecondary)
                    }
                    Button(
                        onClick = {
                            if (titulo.isNotBlank() && contenido.isNotBlank() && categoria.isNotBlank())
                                onGuardar(titulo, contenido, categoria)
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