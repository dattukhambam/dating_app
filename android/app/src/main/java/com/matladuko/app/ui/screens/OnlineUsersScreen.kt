package com.matladuko.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import com.matladuko.app.data.model.Gender
import com.matladuko.app.data.model.UserProfile
import com.matladuko.app.ui.components.UserCard
import com.matladuko.app.ui.theme.*

@Composable
fun OnlineUsersScreen(
    users: List<UserProfile>,
    onCallClick: (UserProfile, CallType) -> Unit,
    onFavoriteToggle: (UserProfile) -> Unit,
    onRandomMatch: () -> Unit,
    onSimulateIncomingCall: () -> Unit,
    canInitiateCall: Boolean = true,
    lang: String = "te"
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedLanguage by remember { mutableStateOf("All") }
    var selectedGender by remember { mutableStateOf("All") }

    val languages = listOf("All", "Telugu", "English", "Hindi")
    val genders = listOf("All", "Female", "Male")

    val filteredUsers = users.filter { user ->
        val matchesSearch = user.displayName.contains(searchQuery, ignoreCase = true) ||
                user.preferredLanguage.contains(searchQuery, ignoreCase = true) ||
                user.bio.contains(searchQuery, ignoreCase = true)
        val matchesLang = selectedLanguage == "All" || user.preferredLanguage.equals(selectedLanguage, ignoreCase = true)
        val matchesGender = selectedGender == "All" || user.gender.name.equals(selectedGender, ignoreCase = true)
        matchesSearch && matchesLang && matchesGender
    }

    Scaffold(
        containerColor = Slate950,
        floatingActionButton = {
            if (canInitiateCall) {
                FloatingActionButton(
                    onClick = onRandomMatch,
                    containerColor = RosePrimary,
                    contentColor = PureWhite,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(modifier = Modifier.padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text("⚡ ", fontSize = 18.sp)
                        Text(
                            text = if (lang == "te") "రాండమ్ కాల్" else "Random Match",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Top Hero Banner
            item {
                Surface(
                    color = Slate900,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate800)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (lang == "te") "ఆన్‌లైన్ స్నేహితులు" else "Online Telugu Friends",
                                style = MaterialTheme.typography.titleMedium,
                                color = PureWhite,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = if (lang == "te") "ఇప్పుడే మాట్లాడండి • లైవ్ కాలింగ్" else "Connect instantly with Telugu speakers",
                                style = MaterialTheme.typography.bodyMedium,
                                color = RoseLight,
                                fontSize = 12.sp
                            )
                        }

                        // Test Incoming Call simulation trigger
                        OutlinedButton(
                            onClick = onSimulateIncomingCall,
                            shape = RoundedCornerShape(10.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = EmeraldSuccess)
                        ) {
                            Text("🔔 Test Call", fontSize = 11.sp)
                        }
                    }
                }
            }

            // Search Bar
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = {
                        Text(
                            text = if (lang == "te") "పేరు లేదా భాషతో వెతకండి..." else "Search by name, language...",
                            fontSize = 13.sp,
                            color = Slate400
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = RosePrimary,
                        unfocusedBorderColor = Slate800,
                        focusedTextColor = PureWhite,
                        unfocusedTextColor = PureWhite
                    )
                )
            }

            // Language Filter Chips
            item {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(languages) { langTag ->
                        val isSelected = selectedLanguage == langTag
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedLanguage = langTag },
                            label = { Text(langTag, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = RosePrimary,
                                selectedLabelColor = PureWhite,
                                containerColor = Slate900,
                                labelColor = Slate200
                            )
                        )
                    }
                }
            }

            // Gender Filter Chips
            item {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(genders) { genderTag ->
                        val isSelected = selectedGender == genderTag
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedGender = genderTag },
                            label = { Text(genderTag, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = IndigoSecondary,
                                selectedLabelColor = PureWhite,
                                containerColor = Slate900,
                                labelColor = Slate200
                            )
                        )
                    }
                }
            }

            // Users List Count Header
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${filteredUsers.size} " + (if (lang == "te") "మంది అందుబాటులో ఉన్నారు" else "Users Available"),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate400,
                        fontSize = 12.sp
                    )
                }
            }

            // User Cards
            if (filteredUsers.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(40.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (lang == "te") "ఎవరూ కనబడలేదు" else "No users found matching filters",
                            color = Slate400,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            } else {
                items(filteredUsers, key = { it.id }) { user ->
                    UserCard(
                        user = user,
                        onCallClick = onCallClick,
                        onFavoriteToggle = onFavoriteToggle,
                        canInitiateCall = canInitiateCall,
                        lang = lang
                    )
                }
            }

            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
    }
}
