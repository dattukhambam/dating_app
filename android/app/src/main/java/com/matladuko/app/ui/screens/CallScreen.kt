package com.matladuko.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.data.model.CallSession
import com.matladuko.app.data.model.CallStatus
import com.matladuko.app.data.model.CallType
import com.matladuko.app.ui.components.NoiseWarningBanner
import com.matladuko.app.ui.components.WaveformVisualizer
import com.matladuko.app.ui.theme.*

@Composable
fun CallScreen(
    session: CallSession,
    ambientNoiseDb: Int,
    isHeadphonesOn: Boolean,
    onToggleHeadphones: () -> Unit,
    onEndCall: () -> Unit,
    onSwitchToVideo: (() -> Unit)? = null,
    lang: String = "te"
) {
    var isMuted by remember { mutableStateOf(false) }
    var isSpeakerOn by remember { mutableStateOf(true) }
    var isCameraOff by remember { mutableStateOf(false) }

    val durationMin = session.durationSeconds / 60
    val durationSec = session.durationSeconds % 60
    val formattedDuration = String.format("%02d:%02d", durationMin, durationSec)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Bar: Call Type & Noise Status
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    color = Slate900,
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (session.type == CallType.VIDEO) "📹 Video Call" else "📞 Audio Call",
                            color = PureWhite,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "• 🪙 ${if (session.type == CallType.VIDEO) session.videoRate else session.audioRate}/min",
                            color = AmberWarning,
                            fontSize = 12.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                NoiseWarningBanner(
                    noiseDb = ambientNoiseDb,
                    isHeadphonesOn = isHeadphonesOn,
                    onToggleHeadphones = onToggleHeadphones,
                    lang = lang
                )
            }

            // Center: Avatar, Name, Status, Waveform
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Callee Avatar
                Box(
                    modifier = Modifier
                        .size(110.dp)
                        .clip(CircleShape)
                        .background(if (session.type == CallType.VIDEO) RoseDark else IndigoSecondary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = session.calleeName.take(1),
                        color = PureWhite,
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = session.calleeName,
                    style = MaterialTheme.typography.headlineMedium,
                    color = PureWhite,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(6.dp))

                if (session.status == CallStatus.CONNECTED) {
                    Text(
                        text = formattedDuration,
                        style = MaterialTheme.typography.headlineLarge,
                        color = EmeraldSuccess,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "🪙 ${session.billedCoins} coins billed",
                        style = MaterialTheme.typography.bodyMedium,
                        color = AmberWarning,
                        fontSize = 13.sp
                    )
                } else {
                    Text(
                        text = if (lang == "te") "రింగ్ అవుతోంది..." else "Ringing...",
                        style = MaterialTheme.typography.titleMedium,
                        color = RoseLight
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Real-time audio waveform animation
                WaveformVisualizer(
                    color = if (session.status == CallStatus.CONNECTED) EmeraldSuccess else RosePrimary,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
            }

            // Bottom Controls Bar
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Mute Button
                    FilledIconButton(
                        onClick = { isMuted = !isMuted },
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = if (isMuted) CrimsonError else Slate800,
                            contentColor = PureWhite
                        ),
                        modifier = Modifier.size(56.dp)
                    ) {
                        Text(if (isMuted) "🔇" else "🎙️", fontSize = 22.sp)
                    }

                    // Speaker Button
                    FilledIconButton(
                        onClick = { isSpeakerOn = !isSpeakerOn },
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = if (isSpeakerOn) IndigoSecondary else Slate800,
                            contentColor = PureWhite
                        ),
                        modifier = Modifier.size(56.dp)
                    ) {
                        Text(if (isSpeakerOn) "🔊" else "🔈", fontSize = 22.sp)
                    }

                    // Video toggle (if video call)
                    if (session.type == CallType.VIDEO) {
                        FilledIconButton(
                            onClick = { isCameraOff = !isCameraOff },
                            colors = IconButtonDefaults.filledIconButtonColors(
                                containerColor = if (isCameraOff) CrimsonError else Slate800,
                                contentColor = PureWhite
                            ),
                            modifier = Modifier.size(56.dp)
                        ) {
                            Text(if (isCameraOff) "🚫" else "📹", fontSize = 22.sp)
                        }
                    } else if (onSwitchToVideo != null) {
                        // Switch from Audio to Video Call
                        FilledIconButton(
                            onClick = onSwitchToVideo,
                            colors = IconButtonDefaults.filledIconButtonColors(
                                containerColor = RosePrimary,
                                contentColor = PureWhite
                            ),
                            modifier = Modifier.size(56.dp)
                        ) {
                            Text("📹", fontSize = 22.sp)
                        }
                    }

                    // End Call Button (Big Red)
                    FilledIconButton(
                        onClick = onEndCall,
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = CrimsonError,
                            contentColor = PureWhite
                        ),
                        modifier = Modifier.size(64.dp)
                    ) {
                        Text("🛑", fontSize = 26.sp)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = if (lang == "te") "సురక్షితమైన ఎండ్-టు-ఎండ్ కాలింగ్" else "Secure End-to-End Encrypted Call",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Slate400,
                    fontSize = 11.sp
                )
            }
        }
    }
}
