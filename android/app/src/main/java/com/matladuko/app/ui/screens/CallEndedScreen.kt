package com.matladuko.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.data.model.CallSession
import com.matladuko.app.ui.theme.*

@Composable
fun CallEndedScreen(
    session: CallSession,
    onCallAgain: () -> Unit,
    onClose: () -> Unit,
    lang: String = "te"
) {
    val durationMin = session.durationSeconds / 60
    val durationSec = session.durationSeconds % 60
    val formattedDuration = String.format("%02d:%02d", durationMin, durationSec)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Slate900),
            shape = RoundedCornerShape(24.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(68.dp)
                        .clip(CircleShape)
                        .background(RoseDark),
                    contentAlignment = Alignment.Center
                ) {
                    Text(text = "📞", fontSize = 28.sp)
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = if (lang == "te") "కాల్ పూర్తయింది" else "Call Ended",
                    style = MaterialTheme.typography.headlineMedium,
                    color = PureWhite,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = session.calleeName,
                    style = MaterialTheme.typography.titleMedium,
                    color = Slate400
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Stats Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = formattedDuration,
                            style = MaterialTheme.typography.titleLarge,
                            color = EmeraldSuccess,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (lang == "te") "వ్యవధి" else "Duration",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Slate400,
                            fontSize = 11.sp
                        )
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "🪙 ${session.billedCoins}",
                            style = MaterialTheme.typography.titleLarge,
                            color = AmberWarning,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = if (lang == "te") "ఖర్చయిన కాయిన్స్" else "Coins Billed",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Slate400,
                            fontSize = 11.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))

                Button(
                    onClick = onCallAgain,
                    colors = ButtonDefaults.buttonColors(containerColor = RosePrimary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Text(
                        text = if (lang == "te") "మళ్ళీ కాల్ చేయండి 📞" else "Call Again 📞",
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedButton(
                    onClick = onClose,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Slate200)
                ) {
                    Text(
                        text = if (lang == "te") "హోమ్ కి వెళ్లండి" else "Back to Home"
                    )
                }
            }
        }
    }
}
