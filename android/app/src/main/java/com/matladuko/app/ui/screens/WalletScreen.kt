package com.matladuko.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.data.model.CoinPackage
import com.matladuko.app.data.model.UserProfile
import com.matladuko.app.ui.theme.*

@Composable
fun WalletScreen(
    user: UserProfile,
    packages: List<CoinPackage>,
    onBuyPackage: (CoinPackage) -> Unit,
    lang: String = "te"
) {
    var showPurchasedPopup by remember { mutableStateOf<CoinPackage?>(null) }
    var selectedTab by remember { mutableStateOf(0) } // 0: Buy Coins, 1: Earnings & Withdraw

    Scaffold(
        containerColor = Slate950
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(12.dp))
                // Balance Header Card
                Card(
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = if (lang == "te") "ప్రస్తుత కాయిన్స్ బ్యాలెన్స్" else "Your Coin Balance",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Slate400
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("🪙", fontSize = 32.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${user.coinsBalance}",
                                style = MaterialTheme.typography.headlineLarge,
                                color = AmberWarning,
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 36.sp
                            )
                        }
                        Text(
                            text = "≈ ₹${user.coinsBalance * 0.5} INR",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Slate400,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                // Tabs
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Slate900,
                    contentColor = RosePrimary
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text(if (lang == "te") "కాయిన్స్ కొనండి" else "Buy Coins", fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text(if (lang == "te") "సంపాదన & విత్‌డ్రా" else "Earnings & Payout", fontWeight = FontWeight.Bold) }
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            if (selectedTab == 0) {
                // Buy Coins Packages
                item {
                    Text(
                        text = if (lang == "te") "ప్యాకేజీలు ఎంచుకోండి" else "Select a Coin Package",
                        style = MaterialTheme.typography.titleMedium,
                        color = PureWhite,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                item {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        packages.forEach { pkg ->
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Slate900),
                                shape = RoundedCornerShape(16.dp),
                                border = androidx.compose.foundation.BorderStroke(
                                    1.dp,
                                    if (pkg.isPopular) RosePrimary else Slate800
                                ),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = "🪙 ${pkg.coins} Coins",
                                                style = MaterialTheme.typography.titleLarge,
                                                color = AmberWarning,
                                                fontWeight = FontWeight.Bold
                                            )
                                            if (pkg.tag != null) {
                                                Spacer(modifier = Modifier.width(8.dp))
                                                Surface(
                                                    color = RosePrimary,
                                                    shape = RoundedCornerShape(8.dp)
                                                ) {
                                                    Text(
                                                        text = pkg.tag,
                                                        color = PureWhite,
                                                        fontSize = 10.sp,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                    )
                                                }
                                            }
                                        }
                                        Text(
                                            text = "Instant recharge via UPI, Card",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = Slate400,
                                            fontSize = 11.sp
                                        )
                                    }

                                    Button(
                                        onClick = {
                                            onBuyPackage(pkg)
                                            showPurchasedPopup = pkg
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = RosePrimary),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Text("₹${pkg.priceINR}", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Earnings & Withdraw Tab
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Slate900),
                        shape = RoundedCornerShape(16.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Slate800),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = if (lang == "te") "మీ మొత్తం సంపాదన" else "Creator Earnings",
                                style = MaterialTheme.typography.titleMedium,
                                color = PureWhite,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("🪙 ${user.earnedCoins}", color = AmberWarning, style = MaterialTheme.typography.titleLarge)
                                    Text(if (lang == "te") "కాయిన్స్" else "Earned Coins", color = Slate400, fontSize = 11.sp)
                                }
                                Column {
                                    Text("₹${user.earnedCoins * 0.5}", color = EmeraldSuccess, style = MaterialTheme.typography.titleLarge)
                                    Text(if (lang == "te") "విలువ (INR)" else "Value (INR)", color = Slate400, fontSize = 11.sp)
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Button(
                                onClick = { /* Request withdrawal */ },
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = if (lang == "te") "UPI / బ్యాంక్ ఖాతాకు విత్‌డ్రా చేయండి (కనీసం ₹500)" else "Withdraw to UPI (Min ₹500)",
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }

        // Purchase Confirmation Dialog
        showPurchasedPopup?.let { pkg ->
            AlertDialog(
                onDismissRequest = { showPurchasedPopup = null },
                confirmButton = {
                    Button(
                        onClick = { showPurchasedPopup = null },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldSuccess)
                    ) {
                        Text("సరే (Done)")
                    }
                },
                title = { Text("🎉 " + (if (lang == "te") "కాయిన్స్ జోడించబడ్డాయి!" else "Coins Added!")) },
                text = {
                    Text(
                        if (lang == "te") "${pkg.coins} కాయిన్స్ మీ వాలెట్‌కి విజయవంతంగా జమ అయ్యాయి."
                        else "Successfully added ${pkg.coins} coins to your balance."
                    )
                },
                containerColor = Slate900,
                titleContentColor = PureWhite,
                textContentColor = Slate200
            )
        }
    }
}
