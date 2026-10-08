package com.matladuko.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.data.model.CallSession
import com.matladuko.app.data.model.CallType
import com.matladuko.app.ui.components.WaveformVisualizer
import com.matladuko.app.ui.theme.*

@Composable
fun IncomingCallScreen(
    session: CallSession,
    onAccept: () -> Unit,
    onReject: () -> Unit,
    lang: String = "te"
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 40.dp)
            ) {
                Text(
                    text = if (lang == "te") "ఇన్‌కమింగ్ కాల్ వస్తోంది..." else "Incoming Call...",
                    style = MaterialTheme.typography.titleMedium,
                    color = RoseLight
                )

                Spacer(modifier = Modifier.height(24.dp))

                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .clip(CircleShape)
                        .background(RoseDark),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = session.callerName.take(1),
                        color = PureWhite,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                Text(
                    text = session.callerName,
                    style = MaterialTheme.typography.headlineMedium,
                    color = PureWhite,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = if (session.type == CallType.VIDEO) "📹 Video Call" else "📞 Audio Call",
                    style = MaterialTheme.typography.bodyLarge,
                    color = IndigoSecondary
                )

                Spacer(modifier = Modifier.height(30.dp))

                WaveformVisualizer(
                    color = RosePrimary,
                    modifier = Modifier.padding(horizontal = 20.dp)
                )
            }

            // Accept & Reject Action Buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 40.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Reject Button
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    FilledIconButton(
                        onClick = onReject,
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = CrimsonError),
                        modifier = Modifier.size(68.dp)
                    ) {
                        Text("❌", fontSize = 26.sp)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (lang == "te") "తిరస్కరించు" else "Decline",
                        color = PureWhite,
                        fontSize = 12.sp
                    )
                }

                // Accept Button
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    FilledIconButton(
                        onClick = onAccept,
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = EmeraldSuccess),
                        modifier = Modifier.size(68.dp)
                    ) {
                        Text("📞", fontSize = 28.sp)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (lang == "te") "స్వీకరించు" else "Accept",
                        color = PureWhite,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
