package com.matladuko.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.ui.theme.AmberWarning
import com.matladuko.app.ui.theme.EmeraldSuccess
import com.matladuko.app.ui.theme.Slate800

@Composable
fun NoiseWarningBanner(
    noiseDb: Int,
    isHeadphonesOn: Boolean,
    onToggleHeadphones: () -> Unit,
    lang: String = "te"
) {
    val isHighNoise = noiseDb > 65
    val title = if (lang == "te") "శబ్దం ఎక్కువ ఉంది!" else "High Background Noise!"
    val desc = if (lang == "te") {
        "స్పష్టమైన ఆడియో కోసం ఇయర్‌ఫోన్లు ధరించండి."
    } else {
        "Please connect earphones for crystal-clear audio."
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
    ) {
        if (isHighNoise && !isHeadphonesOn) {
            Surface(
                color = AmberWarning.copy(alpha = 0.15f),
                shape = RoundedCornerShape(12.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, AmberWarning.copy(alpha = 0.4f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "⚠️ $title ($noiseDb dB)",
                            style = MaterialTheme.typography.titleMedium,
                            color = AmberWarning,
                            fontSize = 13.sp
                        )
                        Text(
                            text = desc,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = onToggleHeadphones,
                        colors = ButtonDefaults.buttonColors(containerColor = AmberWarning),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("🎧 " + (if (lang == "te") "ధరించాను" else "Connected"), fontSize = 11.sp, color = Color.Black)
                    }
                }
            }
        } else {
            // Quiet/normal status pill
            Row(
                modifier = Modifier
                    .background(Slate800, RoundedCornerShape(20.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(
                            if (isHeadphonesOn) EmeraldSuccess else EmeraldSuccess.copy(alpha = 0.7f),
                            shape = androidx.compose.foundation.shape.CircleShape
                        )
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = if (isHeadphonesOn) {
                        "🎧 " + (if (lang == "te") "ఇయర్‌ఫోన్లు యాక్టివ్" else "Headphones Active")
                    } else {
                        "🎙️ $noiseDb dB " + (if (lang == "te") "సాధారణ శబ్దం" else "Normal Noise")
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.75f),
                    fontSize = 11.sp
                )
            }
        }
    }
}
