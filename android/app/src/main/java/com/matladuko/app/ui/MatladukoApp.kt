package com.matladuko.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.data.model.CallType
import com.matladuko.app.data.repository.MatladukoRepository
import com.matladuko.app.ui.screens.*
import com.matladuko.app.ui.theme.*

enum class BottomTab {
    ONLINE,
    FAVORITES,
    WALLET,
    HISTORY
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MatladukoApp(
    repository: MatladukoRepository = remember { MatladukoRepository() }
) {
    val isLoggedIn by repository.isLoggedIn.collectAsState()
    val currentUser by repository.currentUser.collectAsState()
    val onlineUsers by repository.onlineUsers.collectAsState()
    val activeCall by repository.activeCall.collectAsState()
    val incomingCall by repository.incomingCall.collectAsState()
    val lastEndedCall by repository.lastEndedCall.collectAsState()
    val favorites by repository.favorites.collectAsState()
    val callHistory by repository.callHistory.collectAsState()
    val ambientNoiseDb by repository.ambientNoiseDb.collectAsState()
    val isHeadphonesOn by repository.isHeadphonesOn.collectAsState()
    val lang by repository.language.collectAsState()

    var currentTab by remember { mutableStateOf(BottomTab.ONLINE) }
    var showAdminScreen by remember { mutableStateOf(false) }

    // Android Hardware Back button handling
    BackHandler(enabled = showAdminScreen || currentTab != BottomTab.ONLINE) {
        if (showAdminScreen) {
            showAdminScreen = false
        } else {
            currentTab = BottomTab.ONLINE
        }
    }

    if (!isLoggedIn) {
        LoginScreen(
            onLoginSuccess = { phone -> repository.login(phone) },
            lang = lang
        )
        return
    }

    // High Priority: Full-screen Incoming Call Overlay
    incomingCall?.let { inc ->
        IncomingCallScreen(
            session = inc,
            onAccept = { repository.acceptIncomingCall() },
            onReject = { repository.rejectIncomingCall() },
            lang = lang
        )
        return
    }

    // High Priority: Full-screen Active Call
    activeCall?.let { call ->
        CallScreen(
            session = call,
            ambientNoiseDb = ambientNoiseDb,
            isHeadphonesOn = isHeadphonesOn,
            onToggleHeadphones = { repository.toggleHeadphones() },
            onEndCall = { repository.endCall() },
            onSwitchToVideo = { repository.switchToVideo() },
            lang = lang
        )
        return
    }

    // High Priority: Call Ended Summary
    lastEndedCall?.let { ended ->
        CallEndedScreen(
            session = ended,
            onCallAgain = {
                val callee = onlineUsers.find { it.id == ended.calleeId }
                repository.dismissLastEnded()
                if (callee != null) {
                    repository.startCall(callee, ended.type)
                }
            },
            onClose = { repository.dismissLastEnded() },
            lang = lang
        )
        return
    }

    // Admin Portal Screen
    if (showAdminScreen) {
        AdminPortalScreen(
            activeCalls = emptyList(),
            onTerminateCall = { /* terminate */ },
            onBackToUserApp = { showAdminScreen = false }
        )
        return
    }

    Scaffold(
        containerColor = Slate950,
        topBar = {
            Surface(
                color = Slate900,
                modifier = Modifier.fillMaxWidth(),
                border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // App Brand
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = RosePrimary,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.size(32.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("🎙️", fontSize = 16.sp)
                            }
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = if (lang == "te") "మాట్లాడుకో" else "Matladuko",
                                style = MaterialTheme.typography.titleLarge,
                                color = PureWhite,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Right Actions: Coins Chip + Language Toggle + Admin Button
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Coin Balance Chip
                        Surface(
                            color = Slate800,
                            shape = RoundedCornerShape(20.dp),
                            modifier = Modifier.clickable { currentTab = BottomTab.WALLET }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("🪙", fontSize = 13.sp)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${currentUser.coinsBalance}",
                                    color = AmberWarning,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        // Language Toggle Chip
                        Surface(
                            color = Slate800,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.clickable { repository.toggleLanguage() }
                        ) {
                            Text(
                                text = if (lang == "te") "తెలుగు" else "EN",
                                color = PureWhite,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp)
                            )
                        }

                        // Admin Icon
                        Surface(
                            color = IndigoSecondary.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.clickable { showAdminScreen = true }
                        ) {
                            Text(
                                text = "🛡️",
                                fontSize = 14.sp,
                                modifier = Modifier.padding(6.dp)
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = Slate900,
                contentColor = PureWhite
            ) {
                NavigationBarItem(
                    selected = currentTab == BottomTab.ONLINE,
                    onClick = { currentTab = BottomTab.ONLINE },
                    icon = { Text("👥", fontSize = 18.sp) },
                    label = { Text(if (lang == "te") "స్నేహితులు" else "Users", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = RosePrimary,
                        selectedTextColor = RosePrimary,
                        indicatorColor = RosePrimary.copy(alpha = 0.2f),
                        unselectedIconColor = Slate400,
                        unselectedTextColor = Slate400
                    )
                )

                NavigationBarItem(
                    selected = currentTab == BottomTab.FAVORITES,
                    onClick = { currentTab = BottomTab.FAVORITES },
                    icon = { Text("❤️", fontSize = 18.sp) },
                    label = { Text(if (lang == "te") "ఇష్టమైనవి" else "Favorites", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = RosePrimary,
                        selectedTextColor = RosePrimary,
                        indicatorColor = RosePrimary.copy(alpha = 0.2f),
                        unselectedIconColor = Slate400,
                        unselectedTextColor = Slate400
                    )
                )

                NavigationBarItem(
                    selected = currentTab == BottomTab.WALLET,
                    onClick = { currentTab = BottomTab.WALLET },
                    icon = { Text("🪙", fontSize = 18.sp) },
                    label = { Text(if (lang == "te") "వాలెట్" else "Wallet", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = RosePrimary,
                        selectedTextColor = RosePrimary,
                        indicatorColor = RosePrimary.copy(alpha = 0.2f),
                        unselectedIconColor = Slate400,
                        unselectedTextColor = Slate400
                    )
                )

                NavigationBarItem(
                    selected = currentTab == BottomTab.HISTORY,
                    onClick = { currentTab = BottomTab.HISTORY },
                    icon = { Text("📞", fontSize = 18.sp) },
                    label = { Text(if (lang == "te") "కాల్స్" else "History", fontSize = 11.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = RosePrimary,
                        selectedTextColor = RosePrimary,
                        indicatorColor = RosePrimary.copy(alpha = 0.2f),
                        unselectedIconColor = Slate400,
                        unselectedTextColor = Slate400
                    )
                )
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (currentTab) {
                BottomTab.ONLINE -> OnlineUsersScreen(
                    users = onlineUsers,
                    onCallClick = { targetUser, callType ->
                        repository.startCall(targetUser, callType)
                    },
                    onFavoriteToggle = { targetUser ->
                        repository.toggleFavorite(targetUser)
                    },
                    onRandomMatch = {
                        val available = onlineUsers.filter { !it.isBusy }
                        val randomUser = available.randomOrNull() ?: onlineUsers.firstOrNull()
                        if (randomUser != null) {
                            repository.startCall(randomUser, CallType.AUDIO)
                        }
                    },
                    onSimulateIncomingCall = {
                        repository.simulateIncomingCall()
                    },
                    canInitiateCall = currentUser.gender != com.matladuko.app.data.model.Gender.FEMALE,
                    lang = lang
                )

                BottomTab.FAVORITES -> FavoritesScreen(
                    favorites = favorites,
                    onCallClick = { targetUser, callType ->
                        repository.startCall(targetUser, callType)
                    },
                    onFavoriteToggle = { targetUser ->
                        repository.toggleFavorite(targetUser)
                    },
                    lang = lang
                )

                BottomTab.WALLET -> WalletScreen(
                    user = currentUser,
                    packages = repository.coinPackages,
                    onBuyPackage = { pkg ->
                        repository.buyCoins(pkg)
                    },
                    lang = lang
                )

                BottomTab.HISTORY -> CallHistoryScreen(
                    callHistory = callHistory,
                    lang = lang
                )
            }
        }
    }
}
