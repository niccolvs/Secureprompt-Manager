// LoginScreen.kt
// Pantalla de inicio de sesión con Google
// Firebase maneja toda la autenticación

package com.example.securepromptapp.ui.theme

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.securepromptapp.AccentDim
import com.example.securepromptapp.AccentLight
import com.example.securepromptapp.Accent
import com.example.securepromptapp.BgCard
import com.example.securepromptapp.BgPrimary
import com.example.securepromptapp.TextMuted
import com.example.securepromptapp.TextPrimary
import com.example.securepromptapp.TextSecondary
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val context = LocalContext.current
    val auth = FirebaseAuth.getInstance()
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }

    // ── Configurar Google Sign-In ─────────────────
    val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
        .requestIdToken("1059291715077-j8fsb70pi3f2i07qcd4oh7dn485s0qis.apps.googleusercontent.com") // Lo reemplazamos después
        .requestEmail()
        .build()

    val googleSignInClient = GoogleSignIn.getClient(context, gso)

    // ── Launcher para el flujo de Google ─────────
    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                val credential = GoogleAuthProvider.getCredential(account.idToken, null)

                isLoading = true
                auth.signInWithCredential(credential)
                    .addOnSuccessListener {
                        isLoading = false
                        onLoginSuccess()
                    }
                    .addOnFailureListener { e ->
                        errorMessage = "Error Firebase: ${e.message}"
                        isLoading = false
                    }
            } catch (e: ApiException) {
                errorMessage = "Error código: ${e.statusCode}"
                isLoading = false
            }
        } else {
            errorMessage = "Resultado: ${result.resultCode}"
        }
    }
    // ── UI de Login ───────────────────────────────
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgPrimary)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Logo
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(80.dp)
                .background(AccentDim, RoundedCornerShape(20.dp))
        ) {
            Text("🔒", fontSize = 36.sp)
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "SecurePrompt",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Protege tus prompts con inteligencia artificial",
            fontSize = 14.sp,
            color = TextMuted,
            textAlign = TextAlign.Center,
            lineHeight = 20.sp
        )

        Spacer(modifier = Modifier.height(48.dp))

        // Botón Google Sign-In
        if (isLoading) {
            CircularProgressIndicator(color = Accent)
        } else {
            Button(
                onClick = {
                    launcher.launch(googleSignInClient.signInIntent)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BgCard),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("G", fontSize = 18.sp, color = Color(0xFF4285F4), fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    "Continuar con Google",
                    fontSize = 15.sp,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        if (errorMessage.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = errorMessage,
                fontSize = 12.sp,
                color = Color(0xFFf09595),
                textAlign = TextAlign.Center
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = "Al continuar aceptas nuestros términos de uso\ny política de privacidad",
            fontSize = 11.sp,
            color = TextMuted,
            textAlign = TextAlign.Center,
            lineHeight = 16.sp
        )
    }
}