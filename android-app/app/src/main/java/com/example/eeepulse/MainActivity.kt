package com.example.eeepulse

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
    private var webView: WebView? = null

    companion object {
        private const val PREFS_NAME = "eee_pulse_prefs"
        private const val KEY_SERVER_URL = "server_url"
        const val DEFAULT_FALLBACK_URL = "https://eee-batch.vercel.app"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val initialUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_FALLBACK_URL) ?: DEFAULT_FALLBACK_URL

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView?.canGoBack() == true) {
                    webView?.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        setContent {
            MainAppView(
                savedUrl = initialUrl,
                onSaveUrl = { newUrl ->
                    prefs.edit().putString(KEY_SERVER_URL, newUrl).apply()
                    webView?.loadUrl(newUrl)
                },
                onWebViewCreated = { wv -> webView = wv }
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun MainAppView(
    savedUrl: String,
    onSaveUrl: (String) -> Unit,
    onWebViewCreated: (WebView) -> Unit
) {
    val context = LocalContext.current
    var currentUrl by remember { mutableStateOf(savedUrl) }
    var inputUrl by remember { mutableStateOf(savedUrl) }
    var progress by remember { mutableFloatStateOf(0f) }
    var isLoading by remember { mutableStateOf(true) }
    var hasError by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }
    var showUrlDialog by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFFFF6FA))
            .statusBarsPadding()
    ) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                WebView(ctx).apply {
                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        loadWithOverviewMode = true
                        useWideViewPort = true
                        builtInZoomControls = false
                        displayZoomControls = false
                        cacheMode = WebSettings.LOAD_DEFAULT
                        mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                        userAgentString = "$userAgentString EEEPulseAndroid/1.0"
                    }

                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            return false
                        }

                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            super.onPageStarted(view, url, favicon)
                            isLoading = true
                            hasError = false
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            isLoading = false
                            // Check if page title or body contains 404
                            if (title?.contains("404") == true || title?.contains("Not Found") == true) {
                                hasError = true
                                errorMessage = "404: Deployment Not Found on Vercel. Please update to your live project URL."
                            }
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?
                        ) {
                            if (request?.isForMainFrame == true) {
                                hasError = true
                                errorMessage = "Unable to connect: ${error?.description ?: "Network error"}"
                            }
                        }

                        override fun onReceivedHttpError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            errorResponse: WebResourceResponse?
                        ) {
                            if (request?.isForMainFrame == true && (errorResponse?.statusCode ?: 200) >= 400) {
                                hasError = true
                                errorMessage = "HTTP ${errorResponse?.statusCode}: Deployment Not Found on server."
                            }
                        }
                    }

                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            progress = newProgress / 100f
                            if (newProgress == 100) {
                                isLoading = false
                            }
                        }
                    }

                    loadUrl(currentUrl)
                    onWebViewCreated(this)
                }
            }
        )

        // Progress bar
        if (isLoading && progress < 1f) {
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp),
                color = Color(0xFFFF4F9A),
                trackColor = Color(0xFFFFD9E8),
            )
        }

        // Error / URL Setup Overlay
        if (hasError || showUrlDialog) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color(0xE6FFF6FA))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "⚡ Connect EEE Pulse",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF3D2C36)
                        )

                        Text(
                            text = if (errorMessage.isNotEmpty()) errorMessage else "Enter your live Vercel URL or Local IP address to connect the app.",
                            fontSize = 12.sp,
                            color = if (hasError) Color(0xFFC2185B) else Color(0xFF5A4350),
                            textAlign = TextAlign.Center
                        )

                        OutlinedTextField(
                            value = inputUrl,
                            onValueChange = { inputUrl = it },
                            label = { Text("Server URL") },
                            placeholder = { Text("https://your-app.vercel.app") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Color(0xFFFF4F9A),
                                unfocusedBorderColor = Color(0xFFFFD9E8)
                            )
                        )

                        Button(
                            onClick = {
                                var formatted = inputUrl.trim()
                                if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
                                    formatted = "https://$formatted"
                                }
                                currentUrl = formatted
                                hasError = false
                                showUrlDialog = false
                                onSaveUrl(formatted)
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFFF4F9A))
                        ) {
                            Text("Connect & Save", color = Color.White, fontWeight = FontWeight.Bold)
                        }

                        if (showUrlDialog) {
                            TextButton(onClick = { showUrlDialog = false }) {
                                Text("Cancel", color = Color(0xFF846D7B))
                            }
                        }
                    }
                }
            }
        }
    }
}
