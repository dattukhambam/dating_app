package com.matladuko.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.matladuko.app.ui.theme.RosePrimary

@Composable
fun WaveformVisualizer(
    modifier: Modifier = Modifier,
    barCount: Int = 24,
    color: Color = RosePrimary
) {
    val infiniteTransition = rememberInfiniteTransition(label = "waveform")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 6.28f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase"
    )

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
    ) {
        val width = size.width
        val height = size.height
        val barWidth = width / (barCount * 1.6f)
        val gap = (width - (barCount * barWidth)) / (barCount - 1).coerceAtLeast(1)

        for (i in 0 until barCount) {
            val sinValue = kotlin.math.sin(phase + (i * 0.4f))
            val normalized = ((sinValue + 1f) / 2f).coerceIn(0.15f, 0.95f)
            val barHeight = height * normalized
            val x = i * (barWidth + gap)
            val y = (height - barHeight) / 2f

            drawRoundRect(
                color = color.copy(alpha = 0.5f + (normalized * 0.5f)),
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(barWidth / 2, barWidth / 2)
            )
        }
    }
}
