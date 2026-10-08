package com.matladuko.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = RosePrimary,
    onPrimary = PureWhite,
    primaryContainer = RoseDark,
    onPrimaryContainer = RoseLight,
    secondary = IndigoSecondary,
    onSecondary = PureWhite,
    background = Slate950,
    onBackground = PureWhite,
    surface = Slate900,
    onSurface = PureWhite,
    surfaceVariant = Slate800,
    onSurfaceVariant = Slate200,
    error = CrimsonError,
    onError = PureWhite
)

@Composable
fun MatladukoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
