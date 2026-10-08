package com.matladuko.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.matladuko.app.data.model.CallType
import com.matladuko.app.data.model.UserProfile
import com.matladuko.app.ui.components.UserCard
import com.matladuko.app.ui.theme.PureWhite
import com.matladuko.app.ui.theme.Slate400
import com.matladuko.app.ui.theme.Slate950

@Composable
fun FavoritesScreen(
    favorites: List<UserProfile>,
    onCallClick: (UserProfile, CallType) -> Unit,
    onFavoriteToggle: (UserProfile) -> Unit,
    lang: String = "te"
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate950)
    ) {
        if (favorites.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("❤️", fontSize = 48.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = if (lang == "te") "ఇంకా ఇష్టమైన స్నేహితులు లేరు" else "No favorite contacts yet",
                        style = MaterialTheme.typography.titleMedium,
                        color = PureWhite
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (lang == "te") "ఆన్‌లైన్ జాబితాలో గుండె చిహ్నాన్ని నొక్కండి" else "Tap heart icon on any user card to add them here",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate400,
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                item {
                    Text(
                        text = if (lang == "te") "మీ ఇష్టమైన స్నేహితులు (${favorites.size})" else "Your Favorites (${favorites.size})",
                        style = MaterialTheme.typography.titleMedium,
                        color = PureWhite,
                        modifier = Modifier.padding(16.dp)
                    )
                }
                items(favorites, key = { it.id }) { user ->
                    UserCard(
                        user = user,
                        onCallClick = onCallClick,
                        onFavoriteToggle = onFavoriteToggle,
                        lang = lang
                    )
                }
                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}
