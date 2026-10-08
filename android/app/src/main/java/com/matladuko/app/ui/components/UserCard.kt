package com.matladuko.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.data.model.CallType
import com.matladuko.app.data.model.UserProfile
import com.matladuko.app.ui.theme.*

@Composable
fun UserCard(
    user: UserProfile,
    onCallClick: (UserProfile, CallType) -> Unit,
    onFavoriteToggle: (UserProfile) -> Unit,
    canInitiateCall: Boolean = true,
    lang: String = "te"
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        colors = CardDefaults.cardColors(containerColor = Slate900),
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Avatar Circle
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(CircleShape)
                            .background(if (user.gender.name == "FEMALE") RoseDark else IndigoSecondary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = user.displayName.take(1),
                            color = PureWhite,
                            style = MaterialTheme.typography.titleLarge
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = user.displayName,
                                style = MaterialTheme.typography.titleMedium,
                                color = PureWhite
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            // Online/Busy status dot
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .background(
                                        if (user.isBusy) AmberWarning else EmeraldSuccess,
                                        CircleShape
                                    )
                            )
                        }

                        Text(
                            text = "${user.age} yrs • ${user.preferredLanguage}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Slate400,
                            fontSize = 12.sp
                        )
                    }
                }

                // Favorite icon toggle
                IconButton(onClick = { onFavoriteToggle(user) }) {
                    Text(
                        text = if (user.isFavorite) "❤️" else "🤍",
                        fontSize = 18.sp
                    )
                }
            }

            if (user.bio.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = user.bio,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Slate200,
                    fontSize = 13.sp,
                    maxLines = 2
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action row: Rate tags & Call buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                // Rate Pill
                Surface(
                    color = Slate800,
                    shape = RoundedCornerShape(20.dp),
                    contentColor = PureWhite
                ) {
                    Text(
                        text = "🪙 ${user.audioRatePerMin}/min",
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        color = AmberWarning
                    )
                }

                if (!canInitiateCall) {
                    Surface(
                        color = RoseDark.copy(alpha = 0.3f),
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RosePrimary.copy(alpha = 0.5f))
                    ) {
                        Text(
                            text = if (lang == "te") "కాల్స్ స్వీకరించండి" else "Receive Calls Only",
                            fontSize = 11.sp,
                            color = RoseLight,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                        )
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        // Audio Call Button
                        Button(
                            onClick = { onCallClick(user, CallType.AUDIO) },
                            colors = ButtonDefaults.buttonColors(containerColor = IndigoSecondary),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("📞 " + (if (lang == "te") "ఆడియో" else "Audio"), fontSize = 12.sp)
                        }

                        // Video Call Button
                        Button(
                            onClick = { onCallClick(user, CallType.VIDEO) },
                            colors = ButtonDefaults.buttonColors(containerColor = RosePrimary),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("📹 " + (if (lang == "te") "వీడియో" else "Video"), fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}
