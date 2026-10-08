package com.matladuko.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.matladuko.app.ui.MatladukoApp
import com.matladuko.app.ui.theme.MatladukoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MatladukoTheme {
                MatladukoApp()
            }
        }
    }
}
